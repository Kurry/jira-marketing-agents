# Skill: Sprint Risk Assessment (+ Dependency Detection, Status Recommendation)

**Status:** ✅ Implemented
**Used by:** Sprint Risk Agent
**Implementation:** `src/backlog.ts` (`assessSprintRisk`) · action `assessSprintRisk`

## Purpose

Score a ticket's delivery risk, surface blockers, propose mitigations, and
recommend a status.

## Risk triggers

Missing acceptance criteria · missing owner · due ≤ 3 days and not in progress ·
claims review required but not started · experiment tracking missing · employer
launch date close (≤ 7 days) with missing assets · explicit blocker language.

## Roll-up

Blocker language → `Blocked`; ≥3 risks or claims-review-needed → `High`; ≥1 risk
→ `Medium`; else `Low`. Recommended status follows: Blocked → `Blocked`, High →
`Needs Human Review`, any risk → `Needs Info`, else `On Track`.

## Inputs

- `issueKey: string`

## Output

```jsonc
{
  "issueKey": "AIGO-123",
  "riskLevel": "High",
  "risks": ["No acceptance criteria — scope is ambiguous.", "Claims review required but not started."],
  "blockers": ["Issue indicates it is blocked or waiting on a dependency."],
  "mitigationPlan": ["Add clear acceptance criteria before starting.", "Route claims-bearing copy to compliance now."],
  "recommendedStatus": "Needs Human Review"
}
```

## Safety

Read-only. Recommends a status; never transitions the issue.
