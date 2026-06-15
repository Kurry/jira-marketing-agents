# Prompt Safety Review

**Audited by:** automation-eng  
**Date:** 2026-06-14  
**Source files:** `prompts/*.md` (19 files)  
**Policy:** MISSION.md safety contract; `policies/claims-risk-policy.md` (reference only)

> CRITICAL: No prompt was modified in this review. Only safety assessment findings are recorded.
> If a safety issue is found, it is escalated to `evidence/safety-refusals.md` and `evidence/blockers.md`.

---

## Audit Legend

| Column | Meaning |
|--------|---------|
| "Never approve claims" | Prompt explicitly forbids approving claims |
| References policy | Mentions policies/claims-risk-policy.md |
| No autonomous send | Prevents autonomous campaign sends |
| No audience mutation | Prevents autonomous audience/suppression changes |
| No autonomous launch | Prevents autonomous experiment/campaign launches |
| Unsafe wording risk | Any phrase that could be read as permitting unsafe mutations |
| Verdict | SAFE / CONCERN (escalated) |

---

## Per-Prompt Findings

### 1. `acceptance-criteria-agent.md`
- **"Never approve claims":** Implicit — "Do not approve claims" in safety constraints
- **References policy:** No direct reference to `policies/claims-risk-policy.md`
- **No autonomous send:** Yes — "you never change the issue"
- **No audience mutation:** Yes — explicitly listed in safety constraints
- **No autonomous launch:** Yes — safety constraints prevent this
- **Unsafe wording risk:** None identified
- **Verdict:** SAFE

---

### 2. `activation-agent.md`
- **"Never approve claims":** Implicit — "No unapproved health claims in any nudge"
- **References policy:** No direct reference to `policies/claims-risk-policy.md`
- **No autonomous send:** Yes — "you never send nudges"
- **No audience mutation:** Yes — "Do not send messages or modify production systems"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None identified
- **Verdict:** SAFE

---

### 3. `audience-builder-agent.md`
- **"Never approve claims":** Not explicitly stated (role is not claims-facing)
- **References policy:** No direct reference
- **No autonomous send:** Yes — "Consent and suppression must be verified before any send"
- **No audience mutation:** YES — CRITICAL constraint: "Never mutate audience lists or suppression rules; output is a proposal for human review"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None — the mutation prohibition is very strong
- **Verdict:** SAFE

---

### 4. `campaign-orchestration-agent.md`
- **"Never approve claims":** Not explicitly stated (role is campaign planning not claims review)
- **References policy:** No direct reference
- **No autonomous send:** YES — CRITICAL: "The app NEVER sends. Execution is always a human step after approvals."
- **No audience mutation:** Yes — "Never change audiences, suppression rules, or production systems"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None — send prohibition is emphatic ("NEVER")
- **Verdict:** SAFE

---

### 5. `creative-claims-agent.md`
- **"Never approve claims":** YES — CRITICAL: "NEVER approve claims. You only classify and suggest safer rewrites."
- **References policy:** No direct reference to `policies/claims-risk-policy.md` by path, but the role is inherently claims-risk policy enforcement
- **No autonomous send:** Yes — "Do not launch campaigns"
- **No audience mutation:** Yes — "Do not launch campaigns, change audiences/suppression, or modify production systems"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None — language is unambiguous
- **Verdict:** SAFE

---

### 6. `creative-generation-agent.md`
- **"Never approve claims":** YES — "you never send and you never approve claims"
- **References policy:** No direct reference
- **No autonomous send:** Yes — "you draft only"
- **No audience mutation:** Yes — "Do not send, schedule, change audiences, or modify production systems"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 7. `dashboard-spec-agent.md`
- **"Never approve claims":** Not applicable (not claims-facing)
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes — "Do not modify data systems, approve claims, or change production systems"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 8. `duplicate-detector-agent.md`
- **"Never approve claims":** Not applicable
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes — "Do not close, merge, delete, or transition any issue"
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 9. `employer-launch-agent.md`
- **"Never approve claims":** YES — "Do not launch, approve claims, change audiences/suppression, or modify production systems"
- **References policy:** No direct reference
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** YES — "Go/no-go and claims approval are always human steps. Risky claims without documented approval are a hard blocker."
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 10. `epic-breakdown-agent.md`
- **"Never approve claims":** Yes — "Do not approve claims"
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — includes explicit "Claims review story and a Launch/readout story gated by human go/no-go"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 11. `experiment-design-agent.md`
- **"Never approve claims":** Yes — "Do not launch experiments, approve claims, change audiences/suppression, or modify production systems"
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** YES — "Experiment launch always requires human go/no-go"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 12. `funnel-friction-agent.md`
- **"Never approve claims":** Yes — "Do not change the production signup flow, approve claims"
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — "Production signup changes require human approval"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 13. `growth-triage-agent.md`
- **"Never approve claims":** YES — explicit bullet: "Do not approve health claims"
- **References policy:** No direct path reference
- **No autonomous send:** Yes — "Do not launch campaigns"
- **No audience mutation:** Yes — "Do not modify audiences or suppression rules"
- **No autonomous launch:** Yes — "Treat health claims, campaign launches, audience changes, and production signup changes as requiring human approval"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 14. `landing-page-agent.md`
- **"Never approve claims":** Yes — "Do not deploy, change production systems, or approve claims"
- **References policy:** No
- **No autonomous send:** Yes — "You spec only"
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — "All draft copy is scanned for claims risk; route risky/prohibited copy to Compliance"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 15. `qa-testcase-agent.md`
- **"Never approve claims":** Yes — safety constraints
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 16. `referral-loop-agent.md`
- **"Never approve claims":** Not applicable (role is referral design)
- **References policy:** No
- **No autonomous send:** Yes — "Do not launch, create incentives, or modify production systems"
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — "Always flag for legal review"
- **Unsafe wording risk:** None — healthcare anti-kickback flag is a strength
- **Verdict:** SAFE

---

### 17. `requirements-gap-agent.md`
- **"Never approve claims":** Yes — "Do not approve claims"
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — "Flag any work requiring claims, legal, or launch approval as a dependency before 'ready for work'"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 18. `sprint-risk-agent.md`
- **"Never approve claims":** Yes — safety constraints
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

### 19. `weekly-readout-agent.md`
- **"Never approve claims":** Yes — "Do not approve claims, call experiment winners as final decisions, change audiences/suppression, or modify production systems"
- **References policy:** No
- **No autonomous send:** Yes
- **No audience mutation:** Yes
- **No autonomous launch:** Yes — "Frame experiment calls as recommendations for a human to confirm"
- **Unsafe wording risk:** None
- **Verdict:** SAFE

---

## Summary

| Prompt | "Never approve claims" | No autonomous send | No audience mutation | No autonomous launch | Verdict |
|--------|----------------------|-------------------|---------------------|---------------------|---------|
| acceptance-criteria-agent | Implicit | Yes | Yes | Yes | SAFE |
| activation-agent | Implicit | Yes | Yes | Yes | SAFE |
| audience-builder-agent | N/A | Yes | YES — explicit | Yes | SAFE |
| campaign-orchestration-agent | N/A | YES — NEVER sends | Yes | Yes | SAFE |
| creative-claims-agent | YES — NEVER approve | Yes | Yes | Yes | SAFE |
| creative-generation-agent | YES — never approve | Yes | Yes | Yes | SAFE |
| dashboard-spec-agent | N/A | Yes | Yes | Yes | SAFE |
| duplicate-detector-agent | N/A | Yes | Yes | Yes | SAFE |
| employer-launch-agent | YES | Yes | Yes | YES — hard blocker | SAFE |
| epic-breakdown-agent | Yes | Yes | Yes | Yes | SAFE |
| experiment-design-agent | Yes | Yes | Yes | YES — human go/no-go | SAFE |
| funnel-friction-agent | Yes | Yes | Yes | Yes | SAFE |
| growth-triage-agent | YES — explicit bullet | Yes | Yes | Yes | SAFE |
| landing-page-agent | Yes | Yes | Yes | Yes | SAFE |
| qa-testcase-agent | Yes | Yes | Yes | Yes | SAFE |
| referral-loop-agent | N/A | Yes | Yes | Yes | SAFE |
| requirements-gap-agent | Yes | Yes | Yes | Yes | SAFE |
| sprint-risk-agent | Yes | Yes | Yes | Yes | SAFE |
| weekly-readout-agent | Yes | Yes | Yes | Yes | SAFE |

**All 19 prompts: SAFE — no safety issues found.**

---

## Findings and Recommendations

### No blockers identified

All prompts correctly:
1. Prevent autonomous campaign sends
2. Prevent autonomous audience/suppression mutations
3. Prevent autonomous experiment/claim approvals
4. Use "analysis only" / "draft only" / "propose only" framing throughout

### Observations for future improvement (not blocking)

1. **`policies/claims-risk-policy.md` not referenced by path** — No prompt cites the policy file directly by path. This is a gap for auditability: when the policy changes, there is no grep-able link to know which prompts depend on it. Recommendation: add a reference line to at minimum `creative-claims-agent.md` and `creative-generation-agent.md`. This is a non-blocking improvement for the safety-reviewer to consider.

2. **`creative-claims-agent.md` — "NEVER approve claims" language is present and strong.** The mission-critical constraint is met.

3. **`employer-launch-agent.md` — "Risky claims without documented approval are a hard blocker"** — this is the strongest claim-gate in any prompt; serves as a good model for others.

---

## Safety Verdict

**No safety issues found. No escalation required.**  
No changes were made to any prompt in this review.  
Any future prompt changes that touch safety language require safety-reviewer approval + lead plan-approval BEFORE commit, per MISSION.md.
