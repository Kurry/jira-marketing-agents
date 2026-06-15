# Safety Evidence — T-M8-02 prereq: Prompt Safety Pre-Audit (tick 2)

Task: T-M8-02 prerequisite — preliminary review of all `prompts/*.md` for
safety-contract compliance. (Final audit is T-M8-02.)
Reviewer: safety-reviewer
Date: 2026-06-14
Scope: all 19 files in `prompts/` (every file read in full).

## Method

For each prompt, checked three questions:
1. Does it contain any phrase that could be read as **approving claims**?
   (FAIL if yes)
2. Does it reference `policies/claims-risk-policy.md` or equivalent guardrails?
   (note)
3. Does it contain language that could **authorize autonomous campaign sending,
   audience mutation, or experiment launch**? (FAIL if yes)

## Per-prompt results

| Prompt | Q1 approves claims? | Q2 guardrail ref | Q3 authorizes send/mutate/launch? | Verdict |
| --- | --- | --- | --- | --- |
| acceptance-criteria-agent | No (negative constraint) | Implicit (claims/launch human-approval clause) | No ("never change the issue") | PASS |
| activation-agent | No | Implicit (claims policy + consent/freq caps) | No ("never send nudges") | PASS |
| audience-builder-agent | No | Strong (CRITICAL section; PHI ban) | No ("never mutate audience/suppression") | PASS |
| campaign-orchestration-agent | No | Strong (CRITICAL; TCPA/CAN-SPAM) | No ("app NEVER sends") | PASS |
| creative-claims-agent | No (explicit "NEVER approve claims") | Strong (risk taxonomy = claims-risk-policy levels) | No | PASS |
| creative-generation-agent | No ("never approve claims") | Strong (claims scan; route to Compliance) | No ("never send") | PASS |
| dashboard-spec-agent | No | Implicit | No ("never build/change data systems") | PASS |
| duplicate-detector-agent | No | n/a | No ("never close/merge/transition") | PASS |
| employer-launch-agent | No | Implicit (claims approval = human; hard blocker) | No ("never launch") | PASS |
| epic-breakdown-agent | No | Implicit (mandatory Claims-review story) | No ("never create/change issues") | PASS |
| experiment-design-agent | No | Strong (guardrails; no sig w/o data) | No ("never launch experiments") | PASS |
| funnel-friction-agent | No | Implicit | No ("never change production signup flow") | PASS |
| growth-triage-agent | No (explicit do-not-approve list) | Implicit (claims risk field; human-approval set) | No | PASS |
| landing-page-agent | No | Strong (claims scan; PHI ban) | No ("never deploy") | PASS |
| qa-testcase-agent | No | Implicit | No ("never execute changes") | PASS |
| referral-loop-agent | No | Strong (anti-kickback; no cash-for-signups) | No ("never launch/create incentives") | PASS |
| requirements-gap-agent | No | Implicit (approval = dependency before ready) | No ("never change the issue") | PASS |
| sprint-risk-agent | No | Implicit | No ("never change status/launch") | PASS |
| weekly-readout-agent | No | Strong (no final winner calls; no sig w/o data) | No ("never change issues") | PASS |

## Findings

- **Q1 (approve claims): 0 FAILs.** Every occurrence of "approve" is a negative
  constraint or a "human-approval-required" gate. No prompt empowers the agent to
  approve a claim.
- **Q3 (autonomous send/mutate/launch): 0 FAILs.** Every prompt with a relevant
  action explicitly forbids sending, mutating audiences/suppression, or launching
  experiments. The campaign, audience, creative-generation, referral, and
  experiment prompts carry CRITICAL-labeled guardrail sections.
- **Q2 (explicit policy-file reference): NOTE — none of the 19 prompts cites the
  `policies/claims-risk-policy.md` / `policies/experiment-policy.md` path by
  name.** The guardrails are inlined and substantively intact (the
  creative-claims prompt reproduces the claims-risk-policy risk taxonomy;
  experiment-design reproduces the experiment-policy guardrails). The MISSION
  safety contract requires that prompts "keep the Twin healthcare claims
  guardrails intact" — that requirement is met. This is **not a FAIL**, but is
  flagged as a tightening recommendation for the final T-M8-02 audit: consider
  adding an explicit `policies/claims-risk-policy.md` reference so policy edits
  propagate by reference rather than by duplication. Recommendation only; does
  not block.
- **MISSION out-of-scope check:** no prompt invents clinical outcomes, proof
  points, or statistical significance; multiple prompts explicitly forbid it.

## Preliminary verdict — PASS

All 19 prompts comply with the safety contract. One non-blocking tightening
recommendation (explicit policy-file references) carried forward to T-M8-02.

safety-reviewer: approved 2026-06-14 (preliminary)
