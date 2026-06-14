# Skill: Requirements Gap Analysis

**Status:** ✅ Implemented
**Used by:** Requirements Gap Agent
**Implementation:** `src/requirements.ts` (`analyzeRequirements`) · action `proposeRequirementsGaps`

## Purpose

Decide whether an issue is ready for work by detecting missing requirements,
generating clarifying questions, and surfacing blockers.

## Required checks

Goal, User/customer, Segment, Channel, Metric, Owner, Due date, Acceptance
criteria, Data source, Approval requirements. Owner uses the assignee field;
Due date uses the duedate field; the rest are term-matched in the text.

## Readiness rule

`readyForWork = true` only when the **critical** fields (Goal, Metric,
Acceptance criteria, Owner) are present **and** there are no blockers. Blockers
include explicit "blocked/waiting on" language, an Experiment with no primary
metric, or an Employer Launch with no launch date.

## Inputs

- `issueKey: string`

## Output

```jsonc
{
  "issueKey": "AIGO-123",
  "missingFields": ["Metric", "Acceptance criteria"],
  "clarifyingQuestions": ["What is the primary metric we will move or measure?"],
  "blockers": ["Experiment has no measurable primary metric."],
  "readyForWork": false
}
```

## Safety

Read-only. Reports what is missing instead of inventing data.
