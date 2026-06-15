# Outcome 3 — AI Personalization Journey Workflow

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-4 | Personalization journey for lapsed email segment — re-engagement sequence | Personalization Journey |

*Note: `Personalization Journey` issue type is in the canonical catalog (specs/issue-types.md) but may not yet be created in Jira — see T-M2-03b.*

---

## Agent Run Output Summary

**Agent:** `audience-builder-agent` → action `proposePersonalization` (current compatibility mapping; dedicated `journey-design-agent` is deferred per outcome-roadmap.md)
**Input:** AIGO-4 (describes lapsed email segment, re-engagement channel, multi-touch sequence)

Expected `PersonalizationProposal` shape returned by `src/audience.ts`:

```json
{
  "issueKey": "AIGO-4",
  "variables": [
    "First name",
    "Employer / partner name",
    "Preferred channel",
    "Last engagement recency"
  ],
  "rules": [
    { "when": "Member is on an employer eligibility file", "show": "Co-branded employer benefit message" },
    { "when": "Member previously engaged but did not register", "show": "Re-engagement angle with a simple first step" },
    { "when": "No strong signal", "show": "Default support & care-team angle" }
  ],
  "fallbacks": [
    "If a variable is missing, drop to a generic, compliant default (never expose raw tokens)."
  ],
  "privacyNotes": [
    "Never use protected health information (PHI) in personalization tokens.",
    "Personalization rules require data/privacy review before launch."
  ]
}
```

**Partial implementation note:** This outcome is marked `[~]` in outcome-roadmap.md. The `proposePersonalization` function returns variables, rules, fallbacks, and privacy notes but does not yet produce a full journey artifact (journey stage, behavior triggers, sequence timing, dynamic blocks, CTA sequence, claims risk per step, tracking plan). Full journey spec requires `src/audience.ts` expansion or a new `src/personalization.ts` module per the roadmap.

---

## Comment Posted to Jira

`addAnalysisComment` posts to AIGO-4:

> **[AI Personalization Proposal — Draft]**
>
> **Personalization Variables Detected:** First name, Employer / partner name, Preferred channel, Last engagement recency
>
> **Personalization Rules:**
> - When member is on an employer eligibility file → show co-branded employer benefit message
> - When member previously engaged but did not register → show re-engagement angle with a simple first step
> - When no strong signal → show default support & care-team angle
>
> **Fallback:** If a variable is missing, drop to a generic, compliant default (never expose raw tokens).
>
> **Privacy Notes:**
> - Never use PHI in personalization tokens.
> - Personalization rules require data/privacy review before launch.
>
> **Gaps not yet covered by this draft:**
> - Journey stage, sequence timing, and dynamic-block spec are not yet generated.
> - Claims-risk check per step is deferred (see outcome-roadmap.md Outcome 3).
> - A dedicated `journey-design-agent` has not yet been added to manifest.yml.
>
> *This comment is AI-generated analysis for human review. No action has been taken.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — No Personalization Journey Automation rule exists. Outcome-roadmap.md notes this may remain manual-only for MVP. Any rule requires operator approval and disabled-by-default import before enabling.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md:

- PHI must never appear in agent output; `privacyNotes` explicitly prohibits it and the module does not read PHI fields.
- Personalization rules are draft-only; data/privacy review is required before launch as stated in `privacyNotes`.
- No audience is mutated, no message is sent — output is an ADF comment for human review.
- Claims risk per step is not yet implemented, which is a known gap (roadmap item); human review covers this gap for MVP.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Each segment can get a complete journey spec from one Jira ticket | PARTIAL — variables, rules, and fallbacks returned; full journey artifact (timing, CTA sequence, tracking) deferred |
| Journey logic includes behavior-based branches | PASS — three conditional rules with `when/show` structure |
| Copy references claims rules before approval | PARTIAL — privacy notes present; per-step claims scan not yet implemented |
| Output is structured enough for lifecycle/marketing ops implementation | PARTIAL — variables and rules are structured; sequence and channel plan require expanded module |

---

## Verdict

**PENDING-ENABLE — Partial implementation confirmed per outcome-roadmap.md `[~]` status. Read-only domain is safe. Full journey artifact and `journey-design-agent` are remaining roadmap items. No Automation rule to enable yet.**
