// Build an IssueContext for an MCP tool call from either:
//  (a) an `issueKey` (the server fetches via the REST JiraClient), or
//  (b) issue fields passed directly (e.g. data Claude Cowork already pulled
//      through its native Jira connector), enabling offline / connector-driven
//      use with no Jira credentials in the server.

import { IssueContext } from "../src/types";
import { JiraClient } from "./jiraClient";

export type IssueInput = {
  issueKey?: string;
  summary?: string;
  description?: string;
  comments?: string[];
  labels?: string[];
  components?: string[];
  issueType?: string;
  status?: string;
  assignee?: string | null;
  dueDate?: string | null;
  projectKey?: string | null;
};

/** Construct an IssueContext from explicit fields (no network). */
export function contextFromFields(input: IssueInput): IssueContext {
  const summary = input.summary ?? "";
  const description = input.description ?? "";
  const comments = input.comments ?? [];
  const combinedText = [summary, description, ...comments].filter(Boolean).join("\n");
  return {
    issueKey: input.issueKey ?? "(provided)",
    summary,
    description,
    issueType: input.issueType ?? "Unknown",
    priority: "Unknown",
    status: input.status ?? "Unknown",
    labels: input.labels ?? [],
    components: input.components ?? [],
    assignee: input.assignee ?? null,
    reporter: null,
    created: null,
    updated: null,
    dueDate: input.dueDate ?? null,
    projectKey: input.projectKey ?? null,
    parentKey: null,
    subtaskKeys: [],
    comments,
    combinedText,
  };
}

/**
 * Resolve an IssueContext for a tool call. Prefers fetching by issueKey when a
 * Jira client is configured; otherwise (or when fields are supplied) builds the
 * context from the provided fields. If both are present, fetched values are the
 * base and any explicitly provided fields override them.
 */
export async function resolveContext(
  input: IssueInput,
  jira: JiraClient | null
): Promise<IssueContext> {
  const hasFields = Boolean(input.summary || input.description || (input.comments?.length));

  if (input.issueKey && jira && !hasFields) {
    return jira.getIssueContext(input.issueKey);
  }

  if (input.issueKey && jira && hasFields) {
    const base = await jira.getIssueContext(input.issueKey).catch(() => null);
    if (base) {
      const overlay = contextFromFields(input);
      const merged: IssueContext = { ...base, ...stripUnknown(overlay) };
      merged.combinedText = [merged.summary, merged.description, ...merged.comments]
        .filter(Boolean)
        .join("\n");
      return merged;
    }
  }

  if (!hasFields && !input.issueKey) {
    throw new Error("Provide either an issueKey (with Jira configured) or issue fields (summary/description).");
  }

  return contextFromFields(input);
}

// Drop placeholder/default values so they don't clobber fetched data.
function stripUnknown(ctx: IssueContext): Partial<IssueContext> {
  const out: Partial<IssueContext> = {};
  if (ctx.summary) out.summary = ctx.summary;
  if (ctx.description) out.description = ctx.description;
  if (ctx.comments.length) out.comments = ctx.comments;
  if (ctx.labels.length) out.labels = ctx.labels;
  if (ctx.components.length) out.components = ctx.components;
  if (ctx.issueType !== "Unknown") out.issueType = ctx.issueType;
  if (ctx.status !== "Unknown") out.status = ctx.status;
  if (ctx.assignee) out.assignee = ctx.assignee;
  if (ctx.dueDate) out.dueDate = ctx.dueDate;
  return out;
}
