# Skill: Issue Classification

**Status:** ✅ Implemented
**Used by:** Triage Agent (and reused by Sprint Risk, QA, Acceptance Criteria for area-aware behavior)
**Implementation:** `src/triage.ts` (`detectWorkflowArea`, `triageIssue`) · action `classifyGrowthIssue`

## Purpose

Classify raw intake into a workflow area and recommended issue type, plus the
full triage envelope (priority, risk, owner, missing info, next status).

## Behavior

`detectWorkflowArea` scores the combined text + labels against signal banks for:
Signup Funnel, Claims, Creative, Experiment, Dashboard, Employer Launch,
Targeting, Automation, Research. **Most matches wins** (ties broken by order),
so "dashboard … signups by channel" classifies as Dashboard, not Signup Funnel.
Each area maps to a recommended issue type (e.g. Experiment, Creative Request,
Claims Review, Employer Launch, Dashboard Request, Signup Funnel Issue).

## Inputs

- `issueKey: string`

## Output (`TriageResult`)

```jsonc
{
  "issueKey": "AIGO-123",
  "cleanSummary": "...",
  "recommendedIssueType": "Dashboard Request",
  "workflowArea": "Dashboard",
  "priority": "P2",
  "riskLevel": "Low|Medium|High|Blocked",
  "claimsRisk": "Safe|Needs substantiation|Risky|Prohibited|Requires human review",
  "suggestedOwnerGroup": "Growth – Analytics",
  "missingInformation": ["..."],
  "recommendedNextStatus": "Ready|Needs Info|Needs Human Review",
  "acceptanceCriteria": ["..."],
  "suggestedSubtasks": ["..."],
  "humanApprovalsRequired": ["..."]
}
```

## Safety

Read-only. Health claims, launches, audience changes, and production signup
changes are tagged as `humanApprovalsRequired`; ambiguous issues route to
`Needs Human Review`.
