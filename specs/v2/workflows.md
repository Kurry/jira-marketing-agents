# AIGO Workflows (v2 — Canonical)

Date: 2026-06-15
Status: Proposal. Aligns statuses/transitions/gates to the Atlassian-native / NIH-reduction direction; does not supersede current specs until accepted by architect + safety reviewer.
Supersedes: `specs/workflows.md`

Single source of truth for canonical **status** counts, names, and the native
owner of each status and gate (per [`_CONVENTIONS.md`](_CONVENTIONS.md) §4).
Issue types in [`issue-types.md`](issue-types.md); fields in
[`custom-fields.md`](custom-fields.md). Safety rules in
`policies/safe-mutations.md`, `claims-risk-policy.md`, `experiment-policy.md`.
Other v2 docs reference this file and must not restate status counts.

## Canonical count and drift reconciliation

**Canonical: 11 statuses** = 3 platform-default statuses (To Do, In Progress,
Done) + 8 AIGO-scoped statuses (Intake, Triage, Spec Ready, In Review, Claims
Review, Experiment Running, Decision Needed, Launch Prep).

Drift reconciled (NIH theme #2, T-NIH-14):

| Source | Count claimed | Why it disagreed |
| --- | --- | --- |
| `evidence/jira-config/statuses.json` (AIGO-scoped) | 8 | Counted only the AIGO-added statuses, excluding the 3 platform defaults. |
| narrower views | 6 | Counted an active subset and folded To Do/Done into "categories". |
| `specs/workflows.md` full table | 11 | 3 defaults + 8 AIGO-scoped. **Adopted.** |

Resolution: **11 statuses** (3 default + 8 AIGO). `blocked` and `readout-needed`
are intentionally **labels, not statuses** (owned by the native filter/queue
model), so they are excluded from the status count. Stated **once, here.**

## Native owners

- **Statuses + workflow scheme + board mapping:** a **golden company-managed
  template project** owns the status set, transition paths, and status/board
  mapping (matrix row "Jira admin configuration"); a clone carries them.
  Team-managed REST can create statuses but board mapping is UI-controlled —
  exactly why the company-managed template is the scale path, not per-site REST
  status creation.
- **Transition + approval gate *enforcement*:** **Forge workflow modules** —
  `jira:workflowValidator`, `jira:workflowCondition`, `jira:workflowPostFunction`
  on company-managed transitions (matrix row "Workflow gates"). Required-field
  and approval rules below are expressed as these modules; only human-gate
  semantics Atlassian modules cannot express stay custom.
- **`blocked` / `readout-needed` labels:** native filter/queue model
  (provision-filters), not custom workflow states.

## 1. Canonical status set (11)

| # | Status | Category | Owner | Meaning |
| --- | --- | --- | --- | --- |
| 1 | To Do | To Do | platform default | Created, not yet routed into AIGO. |
| 2 | Intake | To Do | golden template | Ready for AI/human intake triage. |
| 3 | Triage | In Progress | golden template | AI classifier / reviewer analyzing. |
| 4 | Spec Ready | In Progress | golden template | Spec complete enough for execution review. |
| 5 | In Review | In Progress | golden template | Human review needed (missing info, claims, approvals, decisions). |
| 6 | In Progress | In Progress | platform default | Actively executed by a human owner. |
| 7 | Claims Review | In Progress | golden template | Health/clinical claims await Compliance. |
| 8 | Experiment Running | In Progress | golden template | Human-approved experiment running; AI cannot launch. |
| 9 | Decision Needed | In Progress | golden template | Human decision owner must decide. |
| 10 | Launch Prep | In Progress | golden template | Employer/campaign launch readied and checked. |
| 11 | Done | Done | platform default | Completed and accepted. |

Logical states outside the status list (label-owned): **Blocked** (`blocked`
label), **Readout Needed** (`readout-needed` label), **Needs Info / Human
Review** (`In Review` + AI/human comment), **Ready** (`Spec Ready`).

Happy path: `To Do → Intake → Triage → Spec Ready → In Progress → Done`.

Branches:
```text
Triage / Spec Ready → In Review → Spec Ready
In Progress → Claims Review → In Review / Spec Ready
In Progress → Experiment Running → readout-needed label → Done
In Progress → Decision Needed → Spec Ready / Done
Employer Launch / Campaign → Launch Prep → In Progress / Done
Any active issue → blocked label → queue follow-up → prior status
```

## 2. Per-issue-type branch matrix

Intake spine applies to all types. Discovery types owned by JPD
([`issue-types.md`](issue-types.md) #1, #10, #12, #13) use JPD idea stages
instead of this Jira workflow when JPD is the owner; the rows below apply when
they run as Jira-Software execution types (documented JPD-gap fallback).

| Issue type | Claims Review | Experiment Running | Decision Needed | Launch Prep | readout-needed | blocked |
| --- | --- | --- | --- | --- | --- | --- |
| AI Growth Request | - | - | yes | - | - | yes |
| Creative Request | yes | - | - | - | - | yes |
| Experiment | - | yes | yes | - | yes | yes |
| Segmentation Request | - | - | yes | - | - | yes |
| Personalization Journey | yes | - | - | - | - | yes |
| Employer Launch | - | - | yes | yes | yes | yes |
| Campaign | yes | - | yes | yes | yes | yes |
| Dashboard Request | - | - | - | - | - | yes |
| Signup Funnel Issue | - | - | - | - | yes | yes |
| Research Brief | - | - | - | - | yes | yes |
| Claims Review | yes | - | yes | - | - | yes |
| Decision Memo | - | - | yes | - | - | yes |
| Positioning Update | yes | - | yes | - | - | yes |
| Bug | - | - | - | - | - | yes |

## 3. Required fields per transition — enforced by Forge workflow modules

Each gate below is a Forge `workflowValidator`/`workflowCondition` on the
company-managed transition. Field names per [`custom-fields.md`](custom-fields.md)
(note: Segment/Channels are Assets references; Confidence-family are JPD fields).

| Transition / gate | Required fields or evidence | Enforcement |
| --- | --- | --- |
| To Do → Intake | Summary + description present | Forge validator |
| Intake → Triage | Issue context readable by Forge/Rovo | Forge condition |
| Triage → In Review | Comment lists missing info / approval need / risk | Forge validator |
| Triage → Spec Ready | Primary Metric (where applicable); AI comment with type, owner group, priority/risk, acceptance criteria | Forge validator |
| Any → Claims Review | Claims Risk + Proof Point / copy-evidence | Forge validator |
| Any → Experiment Running | Hypothesis, Primary Metric, Guardrail Metrics, Variant ID, Decision Date, Sample Feasibility, tracking plan (`experiment-policy.md`) | Forge validator + **human approval** (§4) |
| Any → Decision Needed | Decision Needed + linked/drafted Decision Memo | Forge validator |
| Employer Launch / Campaign → Launch Prep | Launch Date, Assets Required, Readiness Score / blocker list, QA Required | Forge validator |
| Experiment Running → readout-needed label | Experiment ID + Primary Metric known | Forge condition / post-function |
| In Progress → readout-needed label | Primary Metric, Conversion Impact, or evidence source | Forge condition |
| Any → Done | Type-specific acceptance fields satisfied; no human gate open | Forge validator + **human gate** (§4) |

Type-specific: Experiment → Experiment Running also requires human launch
approval; Employer Launch → Done requires readiness blockers cleared + QA
evidence; Signup Funnel Issue → Done requires Evidence + Expected Lift or a
"tracking issue only" resolution.

## 4. Human approval gates — human review (Forge cannot decide these)

AI may analyze and recommend at any status but must never cross these gates.
Forge modules **enforce that the gate exists** (block the transition until a
human action/field is recorded); the **decision itself is human**.

| Gate | Who approves | Rule | Mechanism |
| --- | --- | --- | --- |
| Claims Review | Compliance / Medical human | AI may flag, score Claims Risk, recommend safer copy; never approves claims or closes the item | Forge validator blocks close; human approval recorded |
| Experiment Running | Human launch approver | AI drafts spec; only a human approves launch | Forge validator + human field/comment |
| Decision Needed | Human decision owner | AI drafts memo + recommendation; owner records the decision | Forge validator + human field |
| Launch Prep → execution | Human launch owner | AI produces readiness/blockers; cannot launch or alter audiences | Human review (no Forge auto-advance) |
| High-risk → Done | Human reviewer | High-risk tickets cannot be closed/approved without human review | Forge validator blocks close |
| Enabling Automation rules | Lead + safety reviewer + operator | Rules imported disabled; Rovo "Use agent" blocked until Rovo/AI active and eligible | Human + native audit-log proof |

All AI contributions remain comment-only through the safe mutation path
(`addAnalysisComment`). Field writes, transitions, approvals, audience changes,
and campaign sends require a future allowlisted write design.

## 5. Not-yet-enforced gaps (NIH theme #2 / #4)

- **Forge workflow modules are not yet built/attached.** Today (team-managed
  AIGO) the §3/§4 gates are *spec-level and human-enforced by convention*, not
  enforced by validators/conditions/post-functions. Enforcement requires the
  company-managed golden template (T-NIH-04) before these modules can attach.
- **Board/status mapping is UI-controlled** on team-managed projects; the golden
  template carries the mapping. Per-site REST status creation is a fallback only.
- **`blocked` / `readout-needed`** remain labels, not statuses, until/unless the
  filter/queue model proves insufficient.

safety contract unchanged: see [`_CONVENTIONS.md`](_CONVENTIONS.md) §5.
