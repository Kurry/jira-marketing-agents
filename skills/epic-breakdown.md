# Skill: Epic Breakdown (+ Subtask Generation, Dependency Detection)

**Status:** ✅ Implemented
**Used by:** Epic Breakdown Agent, Employer Launch, Dashboard
**Implementation:** `src/backlog.ts` (`breakDownEpic`) · action `breakDownEpic`

## Purpose

Decompose a growth epic into the standard child stories with acceptance
criteria, dependencies, and owner groups — without creating issues.

## Behavior

Emits stories for Data setup, Creative, Claims review, Analytics/tracking, QA,
and Launch/readout. Dependencies are wired (Creative depends on Data setup;
Claims review on Creative; QA on Creative + Analytics; Launch on Claims review +
QA). Each story routes to an owner group via `OWNER_GROUPS`.

## Inputs

- `issueKey: string`

## Output (`EpicBreakdown`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-100",
  "epicSummary": "Q3 acquisition push",
  "proposedStories": [
    {
      "title": "Claims review for: Q3 acquisition push",
      "description": "...",
      "acceptanceCriteria": ["No unresolved high-risk claims.", "Approval documented."],
      "dependencies": ["Creative"],
      "suggestedOwnerGroup": "Compliance / Medical Review"
    }
  ]
}
```

## Safety

Read-only proposal. Always includes a Claims review story and a Launch/readout
story gated by human go/no-go. Subtasks are not created in Jira by this skill.
