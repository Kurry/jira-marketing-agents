import { IssueContext } from "../src/types";

/** Build an IssueContext for tests with sensible defaults. */
export function makeIssue(overrides: Partial<IssueContext> = {}): IssueContext {
  const summary = overrides.summary ?? "";
  const description = overrides.description ?? "";
  const comments = overrides.comments ?? [];
  const combinedText =
    overrides.combinedText ?? [summary, description, ...comments].filter(Boolean).join("\n");

  return {
    issueKey: "AIGO-1",
    summary,
    description,
    issueType: "Growth Task",
    priority: "Medium",
    status: "To Do",
    labels: [],
    components: [],
    assignee: null,
    reporter: null,
    created: null,
    updated: null,
    dueDate: null,
    projectKey: "AIGO",
    parentKey: null,
    subtaskKeys: [],
    comments,
    combinedText,
    ...overrides,
  };
}
