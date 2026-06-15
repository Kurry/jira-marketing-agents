# Outcome 6 — AI Research and Objection Mining Workflow

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-8 | Research brief — cost and trust objections in employer onboarding interviews | Research Brief |
| AIGO-9 | Insight — AI skepticism theme from Q1 member feedback | Insight / Research Brief |

*Note: `Research Brief` issue type is in the canonical catalog. Dedicated `objection-mining-agent` and `src/objections.ts` module have not yet been implemented — this outcome is marked `[~]` in the roadmap.*

---

## Agent Run Output Summary

**Agent:** `ai-growth-triage-agent` → `triageIssue` (compatibility mapping; dedicated `objection-mining-agent` deferred)
**Input:** AIGO-8 (Research Brief, text describes cost objections, trust objections, employer onboarding context)

Expected `TriageResult` for AIGO-8:

```json
{
  "issueKey": "AIGO-8",
  "cleanSummary": "Research brief — cost and trust objections in employer onboarding interviews",
  "recommendedIssueType": "Insight / Research Brief",
  "workflowArea": "Research",
  "priority": "P2",
  "riskLevel": "Low",
  "claimsRisk": "Low Risk",
  "suggestedOwnerGroup": "Growth – Research",
  "missingInformation": ["Goal", "Due date", "Acceptance criteria"],
  "recommendedNextStatus": "Needs Info",
  "acceptanceCriteria": [
    "Goal is met and verified.",
    "Acceptance criteria are documented and reviewed."
  ],
  "suggestedSubtasks": ["Clarify requirements", "Execute", "Review"],
  "humanApprovalsRequired": []
}
```

**Weekly Readout** (`buildWeeklyReadout` from `src/readout.ts`) would surface AIGO-8 in `completedWork` once resolved, or in `blockedWork` if stalled. AIGO-9 with `issueType: "Insight / Research Brief"` does not map to any special bucket in the current readout logic — it would appear in general completed/blocked lists. The dedicated objection-themes bucket in readout is a roadmap gap.

**Gap analysis vs. full Outcome 6 spec:**
- `src/objections.ts` does not exist yet — theme clustering, frequency, segment mapping, de-identified quotes, competitor hypotheses, and claims-risk routing are not implemented.
- `objection-mining-agent`, `competitor-research-agent`, and `messaging-opportunity-agent` are not in `manifest.yml`.
- JQL/issue-key-list multi-issue synthesis is not implemented.
- Weekly readout does not yet expose a top-objection-themes bucket.

---

## Comment Posted to Jira

`addAnalysisComment` posts to AIGO-8 (triage classification only, not a full objection mining report):

> **[AI Growth Triage — Analysis]**
>
> **Workflow Area:** Research  
> **Recommended Issue Type:** Insight / Research Brief  
> **Priority:** P2  
> **Risk Level:** Low  
> **Claims Risk:** Low Risk  
> **Suggested Owner Group:** Growth – Research  
>
> **Missing Information:** Goal · Due date · Acceptance criteria
>
> **Recommended Next Status:** Needs Info
>
> **Note:** A dedicated objection-mining analysis (theme clustering, frequency, segment map, competitor hypotheses) is not yet available. Add `src/objections.ts` and `objection-mining-agent` per outcome-roadmap.md Outcome 6 to unlock the full research workflow.
>
> *This comment is AI-generated analysis for human review. No action has been taken.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — No Research / Objection Mining Automation rule exists. The outcome is in an early `[~]` state; no rule should be imported or enabled until `src/objections.ts` and the dedicated agents are implemented and tested.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md:

- PHI must never appear in agent output. The existing triage output does not reference member-level data; any future `src/objections.ts` must de-identify quotes before including them in comments.
- Claims-risk routing from research outputs must still go through `reviewCreativeClaims` before any copy is produced — the roadmap item explicitly requires this.
- No audience or suppression changes result from research output; all output is comment-only.
- Competitor insights are positioned as "testable hypotheses" (roadmap requirement), not as approved messaging — a human must create follow-up tickets.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Weekly research outputs produce creative, experiment, or product tickets | PARTIAL — triage can classify and suggest subtasks; automated ticket creation deferred behind allowlist |
| Themes are mapped to segments | NOT YET — `src/objections.ts` not implemented |
| AI distinguishes messaging problems from product/funnel problems | PARTIAL — `detectWorkflowArea` separates Research, Creative, Signup Funnel, Experiment; full objection theme taxonomy deferred |
| Competitor insights become testable hypotheses | NOT YET — `competitor-research-agent` not implemented |

---

## Verdict

**PENDING-ENABLE — Core triage coverage confirmed. Dedicated objection mining module and agents are roadmap items. No Automation rule to enable. PHI guardrail applies to any future `src/objections.ts` implementation.**
