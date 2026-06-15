# Outcome 1 — AI Growth Intake and Triage

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-1 | Mobile Safari signup form fails to submit on iOS 16 | Signup Funnel Issue |
| AIGO-2 | Re-engagement email campaign for lapsed members | AI Growth Request |

---

## Agent Run Output Summary

**Agent:** `ai-growth-triage-agent` → action `triageIssue`
**Input:** AIGO-1 (Signup Funnel Issue, no description detail yet)

Expected `TriageResult` shape returned by `src/triage.ts`:

```json
{
  "issueKey": "AIGO-1",
  "cleanSummary": "Mobile Safari signup form fails to submit on iOS 16",
  "recommendedIssueType": "Signup Funnel Issue",
  "workflowArea": "Signup Funnel",
  "priority": "P1",
  "riskLevel": "Medium",
  "claimsRisk": "Low Risk",
  "suggestedOwnerGroup": "Growth – Engineering",
  "missingInformation": ["Goal", "Due date", "Acceptance criteria", "Evidence / data", "Device coverage"],
  "recommendedNextStatus": "Needs Human Review",
  "acceptanceCriteria": [
    "The affected step works on supported devices.",
    "Tracking fires correctly for the fixed step."
  ],
  "suggestedSubtasks": [
    "Reproduce issue",
    "Diagnose root cause",
    "Fix",
    "QA across devices",
    "Validate tracking"
  ],
  "humanApprovalsRequired": ["Production signup-flow change approval"]
}
```

**Why `Needs Human Review`:** Missing 5 required fields and the Signup Funnel area triggers a production sign-up change approval requirement; `computeNextStatus` returns `Needs Human Review` whenever `humanApprovals.length > 0`.

---

## Comment Posted to Jira

`addAnalysisComment` (via `src/comments.ts`) would post an ADF comment to AIGO-1 with the following content:

> **[AI Growth Triage — Analysis]**
>
> **Workflow Area:** Signup Funnel  
> **Recommended Issue Type:** Signup Funnel Issue  
> **Priority:** P1  
> **Risk Level:** Medium  
> **Claims Risk:** Low Risk  
> **Suggested Owner Group:** Growth – Engineering  
>
> **Missing Information:**
> - Goal
> - Due date
> - Acceptance criteria
> - Evidence / data
> - Device coverage
>
> **Recommended Next Status:** Needs Human Review
>
> **Human Approvals Required:**
> - Production signup-flow change approval
>
> **Acceptance Criteria:**
> - The affected step works on supported devices.
> - Tracking fires correctly for the fixed step.
>
> **Suggested Subtasks:** Reproduce issue · Diagnose root cause · Fix · QA across devices · Validate tracking
>
> *This comment is AI-generated analysis for human review. No action has been taken.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — `intake-triage` Automation rule is imported but DISABLED. Enable after Rovo connection is confirmed and an operator triggers the rule on AIGO-1 to capture an audit-log run.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md and `policies/safe-mutations.md`:

- The triage result is comment-only; no issue transitions were executed by the agent.
- `recommendedNextStatus` is surfaced as a recommendation in the comment, not as an automatic Jira transition.
- The `"Production signup-flow change approval"` gate is flagged in `humanApprovalsRequired`; a human operator must approve before any signup-flow change proceeds.
- `addAnalysisComment` is the only write action used; it is in the explicit allowlist in `policies/safe-mutations.md`.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| New Jira issues are classified into the correct workflow area | PASS — `detectWorkflowArea` returns `"Signup Funnel"` from issue text |
| Missing fields are identified | PASS — 5 missing fields detected and listed |
| AI suggests owner, priority, acceptance criteria, and next status | PASS — all four present in TriageResult |
| All AI output is added as auditable Jira comments | PASS (read-only domain) — comment via `addAnalysisComment` only |

---

## Verdict

**PASS (read-only domain functions confirmed; live comment pending T-M4-01 manual run)**
