import api, { route } from "@forge/api";
import { IssueContext, SimilarIssue } from "./types";
import { extractPlainTextFromAdf, uniq } from "./utils/text";
import { toAdf } from "./utils/adf";

// Fields we request from the Jira issue API. Custom fields are intentionally
// not requested by ID here (IDs are instance-specific); use config.ts if needed.
const ISSUE_FIELDS = [
  "summary",
  "description",
  "issuetype",
  "priority",
  "components",
  "labels",
  "status",
  "assignee",
  "reporter",
  "created",
  "updated",
  "project",
  "parent",
  "subtasks",
  "duedate",
].join(",");

/** Throw a descriptive error for a non-OK Jira response. */
async function ensureOk(res: { ok: boolean; status: number; text: () => Promise<string> }): Promise<void> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API failed: ${res.status} ${body}`);
  }
}

/** Fetch the raw issue JSON for an issue key. */
export async function getIssue(issueKey: string): Promise<any> {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueKey}?fields=${ISSUE_FIELDS}`, {
      headers: { Accept: "application/json" },
    });
  await ensureOk(res);
  return res.json();
}

/** Fetch comments for an issue (most recent page). */
export async function getIssueComments(issueKey: string): Promise<string[]> {
  const res = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${issueKey}/comment?orderBy=-created&maxResults=50`, {
      headers: { Accept: "application/json" },
    });
  await ensureOk(res);
  const data = await res.json();
  const comments: any[] = Array.isArray(data?.comments) ? data.comments : [];
  return comments
    .map((c) => extractPlainTextFromAdf(c?.body))
    .filter((s) => s && s.trim().length > 0);
}

/** Run a JQL search and return the raw issues array. */
export async function searchIssues(jql: string, maxResults = 50): Promise<any[]> {
  const res = await api.asApp().requestJira(route`/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql,
      maxResults,
      fields: ["summary", "status", "labels", "components", "issuetype", "updated"],
    }),
  });
  await ensureOk(res);
  const data = await res.json();
  return Array.isArray(data?.issues) ? data.issues : [];
}

/** Add a comment to an issue. The markdown is converted to ADF. */
export async function addComment(issueKey: string, markdown: string): Promise<{ id: string }> {
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: toAdf(markdown) }),
  });
  await ensureOk(res);
  const data = await res.json();
  return { id: String(data?.id ?? "") };
}

/**
 * Map a raw Jira issue JSON + extracted comment texts into a normalized
 * IssueContext. Shared by the Forge handler path and the MCP server path so the
 * two integrations produce identical context shapes.
 */
export function mapIssueToContext(
  issueKey: string,
  issue: any,
  comments: string[]
): IssueContext {
  const fields = issue?.fields ?? {};
  const summary: string = fields.summary ?? "";
  const description: string = extractPlainTextFromAdf(fields.description);
  const labels: string[] = Array.isArray(fields.labels) ? fields.labels : [];
  const components: string[] = Array.isArray(fields.components)
    ? fields.components.map((c: any) => c?.name).filter(Boolean)
    : [];
  const subtaskKeys: string[] = Array.isArray(fields.subtasks)
    ? fields.subtasks.map((s: any) => s?.key).filter(Boolean)
    : [];

  const combinedText = [summary, description, ...comments].filter(Boolean).join("\n");

  return {
    issueKey,
    summary,
    description,
    issueType: fields.issuetype?.name ?? "Unknown",
    priority: fields.priority?.name ?? "Unknown",
    status: fields.status?.name ?? "Unknown",
    labels,
    components,
    assignee: fields.assignee?.displayName ?? null,
    reporter: fields.reporter?.displayName ?? null,
    created: fields.created ?? null,
    updated: fields.updated ?? null,
    dueDate: fields.duedate ?? null,
    projectKey: fields.project?.key ?? null,
    parentKey: fields.parent?.key ?? null,
    subtaskKeys,
    comments,
    combinedText,
  };
}

/**
 * Fetch an issue plus its comments and normalize into an IssueContext.
 * This is the single entry point most handlers use to read issue data.
 */
export async function getIssueContext(issueKey: string): Promise<IssueContext> {
  const [issue, comments] = await Promise.all([
    getIssue(issueKey),
    getIssueComments(issueKey).catch(() => [] as string[]),
  ]);

  return mapIssueToContext(issueKey, issue, comments);
}

/** Map a raw search issue into a SimilarIssue stub (score filled in later). */
export function toSimilarStub(raw: any): Omit<SimilarIssue, "similarityScore" | "reason"> {
  return {
    key: raw?.key ?? "",
    summary: raw?.fields?.summary ?? "",
    status: raw?.fields?.status?.name ?? "Unknown",
  };
}

export { uniq };
