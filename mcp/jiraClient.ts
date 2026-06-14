// REST-based Jira client for the MCP server path.
//
// Unlike src/jira.ts (which uses @forge/api inside the Forge runtime), this
// client talks to the Jira Cloud REST API directly with Basic auth, so the MCP
// server can run anywhere Claude Cowork can launch it. It reuses the shared
// `mapIssueToContext` mapper so context shapes match the Forge path exactly.
//
// Configuration (environment variables):
//   JIRA_BASE_URL    e.g. https://your-site.atlassian.net
//   JIRA_EMAIL       Atlassian account email
//   JIRA_API_TOKEN   Atlassian API token (id.atlassian.com → API tokens)
//   AIGO_ALLOW_WRITES=true  to permit the single mutating tool (add comment)

import { mapIssueToContext } from "../src/jira";
import { extractPlainTextFromAdf } from "../src/utils/text";
import { toAdf } from "../src/utils/adf";
import { IssueContext } from "../src/types";

export type JiraClient = {
  getIssueContext(issueKey: string): Promise<IssueContext>;
  searchIssues(jql: string, maxResults?: number): Promise<any[]>;
  addComment(issueKey: string, markdown: string): Promise<{ id: string }>;
  writesAllowed: boolean;
};

const ISSUE_FIELDS = [
  "summary", "description", "issuetype", "priority", "components", "labels",
  "status", "assignee", "reporter", "created", "updated", "project",
  "parent", "subtasks", "duedate",
].join(",");

/**
 * Build a Jira client from environment variables. Returns null when the Jira
 * credentials are not configured (the analysis tools still work on text the
 * caller — e.g. Cowork's Jira connector — provides directly).
 */
export function createJiraClient(env: NodeJS.ProcessEnv = process.env): JiraClient | null {
  const baseUrl = env.JIRA_BASE_URL?.replace(/\/+$/, "");
  const email = env.JIRA_EMAIL;
  const token = env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) return null;

  const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
  const writesAllowed = String(env.AIGO_ALLOW_WRITES).toLowerCase() === "true";

  async function request(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira API failed: ${res.status} ${body}`);
    }
    return res;
  }

  return {
    writesAllowed,

    async getIssueContext(issueKey: string): Promise<IssueContext> {
      const [issueRes, commentsRes] = await Promise.all([
        request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${ISSUE_FIELDS}`),
        request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment?orderBy=-created&maxResults=50`)
          .catch(() => null),
      ]);
      const issue: any = await issueRes.json();
      let comments: string[] = [];
      if (commentsRes) {
        const data: any = await commentsRes.json();
        comments = (Array.isArray(data?.comments) ? data.comments : [])
          .map((c: any) => extractPlainTextFromAdf(c?.body))
          .filter((s: string) => s && s.trim().length > 0);
      }
      return mapIssueToContext(issueKey, issue, comments);
    },

    async searchIssues(jql: string, maxResults = 50): Promise<any[]> {
      const res = await request(`/rest/api/3/search/jql`, {
        method: "POST",
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ["summary", "status", "labels", "components", "issuetype", "updated"],
        }),
      });
      const data: any = await res.json();
      return Array.isArray(data?.issues) ? data.issues : [];
    },

    async addComment(issueKey: string, markdown: string): Promise<{ id: string }> {
      if (!writesAllowed) {
        throw new Error(
          "Writes are disabled. Set AIGO_ALLOW_WRITES=true to permit add_analysis_comment."
        );
      }
      const res = await request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: toAdf(markdown) }),
      });
      const data: any = await res.json();
      return { id: String(data?.id ?? "") };
    },
  };
}
