# Skill: Acceptance Criteria Generation

**Status:** ✅ Implemented
**Used by:** Acceptance Criteria Agent, Triage (baseline AC)
**Implementation:** `src/requirements.ts` (`proposeAcceptanceCriteria`), `src/triage.ts` (baseline AC) · action `proposeAcceptanceCriteria`

## Purpose

Write clear acceptance criteria, a definition of done, and QA checks tailored to
the issue's workflow area.

## Behavior

Detects the workflow area, emits a Given/When/Then anchor criterion, then adds
area-specific criteria and QA checks (Experiment → tracking & decision rule;
Creative → claims review & channel render; Employer Launch → assets/tracking &
go/no-go; Dashboard → business question & reconciliation; Signup Funnel → device
coverage & tracking).

## Inputs

- `issueKey: string`

## Output

```jsonc
{
  "issueKey": "AIGO-123",
  "acceptanceCriteria": ["Given …, when …, then …"],
  "definitionOfDone": ["Acceptance criteria reviewed and signed off by the owner."],
  "qaChecks": ["Validate variant assignment and event tracking end to end."]
}
```

## Safety

Read-only. For claims/launch work, includes criteria requiring documented human
approval before done.
