# Skill: Safe Mutations & Commenting (+ Approval Boundary Enforcement)

**Status:** ✅ Implemented
**Used by:** All agents (boundary), Comment Agent / Automation (commenting)
**Implementation:** `src/comments.ts` (`addAnalysisComment`,
`renderMarkdownFromResult`), `src/utils/adf.ts` (`toAdf`) · action
`addAnalysisComment` · policy [`../policies/safe-mutations.md`](../policies/safe-mutations.md)

## Purpose

Provide the **only** sanctioned write path (adding a clearly AI-labeled comment)
and enforce the approval boundary that prevents agents from taking high-stakes
actions.

## Commenting behavior

- `addAnalysisComment({ issueKey, commentBody })` validates inputs, prepends an
  `🤖 AI Growth Ops (analysis only …)` marker, converts Markdown → ADF via
  `toAdf`, and `POST`s to `/rest/api/3/issue/{key}/comment`.
- `renderMarkdownFromResult(title, result)` turns any structured agent output
  into a readable Markdown comment (arrays → bullet lists, scalars → bold
  labels) for audit-friendly review.

## Approval boundary (enforced by every agent)

The AI **may**: analyze, summarize, draft, classify, route, recommend, generate
copy/specs/plans.

The AI **may not** autonomously: approve health claims, send campaigns, change
audience lists, modify suppression rules, launch experiments, modify the
production signup flow, edit source-of-truth claims rules, close high-risk
issues, delete issues, or change permissions.

Mutating actions beyond `addAnalysisComment` (field writes, transitions,
subtask creation) are future work behind an explicit allowlist and admin config
(`src/config.ts`).

## Output

```json
{ "id": "10456" }
```

## Safety

`addAnalysisComment` is the single `write:jira-work` action. Automation invokes
Rovo agents as read-style; posting `{{agentResponse}}` is done by an explicit,
human-configured Automation "Add comment" action.
