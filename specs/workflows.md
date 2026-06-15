# AIGO Workflows

Workflow spec for the AI Growth Ops control plane: statuses, per-issue-type
transition paths, required fields per transition, and human approval gates.
This file is reviewed by `safety-reviewer` before T-M2-05 proceeds.

References: statuses align with `specs/agent-team/MISSION.md` (definition of
done #4) and `specs/agent-team/VERIFICATION_MATRIX.md` (VM-JIRA-WORKFLOW).
Issue types: `specs/issue-types.md`. Fields: `specs/custom-fields.md`. Safety:
`policies/safe-mutations.md`, `policies/claims-risk-policy.md`,
`policies/experiment-policy.md`.

**Current vs target.** The live AIGO project uses only `To Do → In Progress →
Done`. The 12 statuses below are the **target** state and require a `jira-admin`
workflow-scheme change, which is plan-approval gated per
`specs/agent-team/TEAM_CHARTER.md`.

---

## 1. The 12 MVP statuses

| # | Status | Category | Meaning |
|---|---|---|---|
| 1 | To Do | To Do | Created, not yet triaged. |
| 2 | AI Triage | In Progress | AI classifier is analyzing (comment-only). |
| 3 | Needs Info | To Do | Missing required fields/context; awaiting requester. |
| 4 | Needs Human Review | In Progress | AI analysis done; awaiting human decision. |
| 5 | Ready | To Do | Triaged and complete; ready to be worked. |
| 6 | In Progress | In Progress | Being actively worked. |
| 7 | Blocked | In Progress | Work stopped on an external dependency. |
| 8 | Decision Needed | In Progress | A human decision (Decision Memo) is required. |
| 9 | Claims Review | In Progress | Health/clinical claims await Compliance review. |
| 10 | Experiment Running | In Progress | Approved experiment is live; awaiting readout. |
| 11 | Readout Needed | In Progress | Work/experiment ended; results must be summarized. |
| 12 | Done | Done | Completed and accepted. |

**Canonical happy path:**
`To Do → AI Triage → (Needs Info | Needs Human Review) → Ready → In Progress →
(Blocked | Decision Needed | Claims Review | Experiment Running) → Readout Needed
→ Done`.

`Needs Info` loops back to `AI Triage`/`Ready` once the requester fills gaps.
`Blocked` returns to `In Progress` when unblocked.

---

## 2. Per-issue-type transition matrices

All types share the intake spine (`To Do → AI Triage → Needs Info /
Needs Human Review → Ready → In Progress → … → Done`). The columns below mark
which **branch statuses** each type uses.

| Issue type | Claims Review | Experiment Running | Decision Needed | Readout Needed | Blocked |
|---|---|---|---|---|---|
| AI Growth Request | — | — | ● | — | ● |
| Creative Request | ● | — | — | — | ● |
| Experiment | — | ● | ● | ● | ● |
| Segmentation Request | — | — | ● | — | ● |
| Personalization Journey | ● | — | — | — | ● |
| Employer Launch | — | — | ● | ● | ● |
| Campaign | ● | — | ● | ● | ● |
| Dashboard Request | — | — | — | — | ● |
| Signup Funnel Issue | — | — | — | ● | ● |
| Research Brief | — | — | — | ● | ● |
| Claims Review | ● | — | ● | — | ● |
| Decision Memo | — | — | ● | — | ● |
| Positioning Update | ● | — | ● | — | ● |
| Bug / Tracking Issue | — | — | — | — | ● |

● = type uses that branch status. All types use the intake spine and `Done`.

---

## 3. Required fields per transition

A transition is **blocked** unless the listed fields are populated. (For the MVP
these are enforced by review/readiness checks, not by autonomous field writes.)

| Transition | Required fields |
|---|---|
| To Do → AI Triage | (none — AI runs on summary/description) |
| AI Triage → Needs Info | Blockers (lists what is missing) |
| AI Triage → Ready | Primary Metric (where the type has one) |
| Any → Claims Review | **Claims Risk** (must be set; Medium/High/Prohibited routes here), Proof Point |
| Any → Experiment Running | Hypothesis, Primary Metric, Guardrail Metrics, Variant ID, Decision Date, Sample Feasibility, tracking note (per `policies/experiment-policy.md`) |
| Any → Decision Needed | Decision Needed, plus a linked **Decision Memo** |
| Experiment Running → Readout Needed | Experiment ID, Primary Metric (so results are measurable) |
| In Progress → Readout Needed | Primary Metric or Conversion Impact |
| Any → Done | Type-specific acceptance fields satisfied; no open required gate |

Type-specific notes:
- **Experiment → Experiment Running** must satisfy the full experiment-policy
  field set; missing measurement/guardrails/decision-rule blocks the move.
- **Employer Launch → Done** requires Readiness Score and QA Required cleared.
- **Signup Funnel Issue → Done** requires Evidence and Expected Lift recorded.

---

## 4. Human approval gates

AI may analyze and recommend at any status but **never** crosses these gates
itself (see `policies/safe-mutations.md` and the MISSION safety contract):

| Gate (status / transition) | Who must approve | Rule |
|---|---|---|
| **Claims Review** | Compliance / Medical Review **human** | AI may flag, score Claims Risk, and recommend safer copy, but **must not approve** clinical/health claims or move the item to `Done`/approved. (`policies/claims-risk-policy.md`) |
| **Experiment Running** (launch) | **Human** Launch approver | An experiment moves to `Experiment Running` only after a human approves launch; AI cannot launch. Requires the full experiment-policy field set first. |
| **Decision Needed** | **Human** decision owner | Requires a linked **Decision Memo**; the human records the decision. AI drafts the memo and recommendation only. |
| **High-risk → Done / approved** | **Human** reviewer | High-risk tickets cannot be closed or approved without human review. AI cannot auto-close. |
| Enabling any Automation rule that drives a transition | `lead` + `safety-reviewer` (plan-approval) | Automation rules are imported disabled; transitions via Automation are out of scope for MVP unless explicitly allowlisted. |

All AI contributions across every status are comment-only via
`addAnalysisComment`, the single mutating Forge action. No transition,
field write, or approval is performed by AI.

safety-reviewer: approved 2026-06-14
