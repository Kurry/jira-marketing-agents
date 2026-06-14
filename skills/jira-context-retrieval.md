# Skill: Issue Context Retrieval (+ Plain-Text Extraction)

**Status:** ✅ Implemented
**Used by:** All agents
**Implementation:** `src/jira.ts` (`getIssueContext`, `getIssue`,
`getIssueComments`, `searchIssues`) and `src/utils/text.ts`
(`extractPlainTextFromAdf`) · action `getIssueContext`

## Purpose

Read a Jira issue into a normalized, analysis-ready object and convert all
Atlassian Document Format (ADF) descriptions/comments into clean plain text, so
every other skill works against one consistent shape.

## Inputs

- `issueKey: string` (e.g. `AIGO-123`)

## Behavior

1. `GET /rest/api/3/issue/{key}` for fields: summary, description, issuetype,
   priority, components, labels, status, assignee, reporter, created, updated,
   project, parent, subtasks, duedate.
2. `GET /rest/api/3/issue/{key}/comment` (latest page) and extract text.
3. Recursively flatten ADF nodes (`extractPlainTextFromAdf`) to plain text.
4. Compose `combinedText` = summary + description + comments for scanning.

All calls use `api.asApp().requestJira(...)`. Non-OK responses throw
`Jira API failed: {status} {body}`.

## Output (`IssueContext`)

```jsonc
{
  "issueKey": "AIGO-123",
  "summary": "...", "description": "...",
  "issueType": "Experiment", "priority": "Medium", "status": "To Do",
  "labels": ["..."], "components": ["..."],
  "assignee": null, "reporter": null,
  "created": null, "updated": null, "dueDate": null,
  "projectKey": "AIGO", "parentKey": null, "subtaskKeys": ["..."],
  "comments": ["..."],
  "combinedText": "summary\ndescription\ncomments"
}
```

## Safety

Read-only. Never mutates the issue. Fetches only the fields listed above and
does not request unknown custom-field IDs.
