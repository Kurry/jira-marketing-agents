# Outcome 2 — AI Segmentation and Targeting Workflow

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-3 | Lapsed employer-sourced members — re-engagement segment | Segmentation Request |

---

## Agent Run Output Summary

**Agent:** `audience-builder-agent` → action `buildAudienceSegment`
**Input:** AIGO-3 (Segmentation Request, describes lapsed employer members, no warehouse source confirmed)

Expected `AudienceSegmentProposal` shape returned by `src/audience.ts`:

```json
{
  "issueKey": "AIGO-3",
  "segmentName": "Segment: Lapsed employer-sourced members — re-engagement segment",
  "hypothesis": "These members are most likely to benefit from Twin and to register, based on the detected signals.",
  "includeCriteria": [
    "On an active employer eligibility file",
    "Previously eligible but not activated"
  ],
  "excludeCriteria": [
    "Already enrolled / active members",
    "Opted-out of the channel (email/SMS consent revoked)",
    "Recently contacted within the frequency-cap window",
    "Known ineligible (clinical or plan exclusions)"
  ],
  "signals": [
    "eligible employer population",
    "lapsed / re-engagement"
  ],
  "requiredDataSources": [
    "Employer eligibility file"
  ],
  "estimatedReachNote": "Estimated reach must be computed against the warehouse before launch; do not assume a count here.",
  "measurement": [
    "Registration rate within the segment",
    "Activation rate post-registration",
    "CAC for the segment"
  ],
  "approvalsRequired": [
    "Data/privacy review of targeting signals",
    "Suppression & consent verification before any send"
  ],
  "mutatesProductionAudience": false
}
```

**Key safety invariant:** `mutatesProductionAudience: false` is a literal `false` type in the return shape — the module cannot return `true` without a type error.

---

## Comment Posted to Jira

`addAnalysisComment` posts to AIGO-3:

> **[AI Segmentation Analysis — Draft Proposal]**
>
> **Segment Name:** Lapsed employer-sourced members — re-engagement segment  
> **Hypothesis:** These members are most likely to benefit from Twin and to register, based on the detected signals.
>
> **Include Criteria:**
> - On an active employer eligibility file
> - Previously eligible but not activated
>
> **Exclude / Suppression Defaults:**
> - Already enrolled / active members
> - Opted-out of the channel (email/SMS consent revoked)
> - Recently contacted within the frequency-cap window
> - Known ineligible (clinical or plan exclusions)
>
> **Detected Signals:** eligible employer population, lapsed / re-engagement
>
> **Required Data Sources:** Employer eligibility file  
> **Reach Note:** Estimated reach must be computed against the warehouse before launch; do not assume a count here.
>
> **Approvals Required Before Any Send:**
> - Data/privacy review of targeting signals
> - Suppression & consent verification before any send
>
> **mutatesProductionAudience: false** — this proposal does not touch any live audience or suppression list.
>
> *This comment is AI-generated analysis for human review. No action has been taken.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — No dedicated segmentation Automation rule exists yet (deferred for MVP). The audience agent is invoked manually via Rovo. Enable a rule only after Rovo connection is validated and an operator-approved Automation rule is added and tested.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md:

- AI may not alter audiences or suppression rules. The `mutatesProductionAudience: false` field enforces this at the type level.
- `approvalsRequired` always includes suppression and privacy review before a send is permitted.
- Estimated reach is explicitly deferred to the data team; the module never invents a count.
- A human data/privacy owner must approve before the segment is handed to any downstream warehouse or campaign tool.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Every audience request becomes a structured targeting spec | PASS — `AudienceSegmentProposal` provides include/exclude criteria, signals, sources, and measurement |
| Suppression logic is required before activation | PASS — four suppression defaults are always present in `excludeCriteria` |
| Human approval is required before audience lists are used | PASS — `approvalsRequired` gates both data/privacy and suppression/consent |
| Targeting outcomes can feed future refinement tickets | PASS — measurement fields provide follow-up KPIs; human creates refinement ticket |

---

## Verdict

**PASS (read-only domain confirmed; `mutatesProductionAudience: false` type-enforced; live Rovo run pending T-M4 manual runs)**
