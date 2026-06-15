# AIGO Workflows

Workflow spec for the AI Growth Ops control plane: statuses, per-issue-type
transition paths, required fields per transition, and human approval gates.

References: issue types in `specs/issue-types.md`; fields in
`specs/custom-fields.md`; safety rules in `policies/safe-mutations.md`,
`policies/claims-risk-policy.md`, and `policies/experiment-policy.md`.

## Current Live State

The live AIGO development project is team-managed. Its workflow/status setup is
a pragmatic MVP control plane, not a full company-managed workflow scheme.

Live status evidence:

- Default statuses: `To Do`, `In Progress`, `Done`.
- AIGO project-scoped statuses: `Intake`, `Triage`, `Spec Ready`, `In Review`,
  `Claims Review`, `Experiment Running`, `Decision Needed`, `Launch Prep`.
- Evidence files:
  - `evidence/jira-config/statuses.json`
  - `evidence/jira-config/T-M2-05-result.md`
  - `docs/MVP_READINESS.md`

Team-managed Jira constraints:

- Statuses can be created through REST, but board/status mapping is partly UI
  controlled.
- Workflow validators, transition conditions, and post-functions are not yet
  enforced as Forge workflow modules.
- `blocked` and `readout-needed` are queue/filter labels, not dedicated MVP
  statuses.

## 1. MVP Status Set

| # | Status | Category | Meaning |
|---|---|---|---|
| 1 | To Do | To Do | Created, not yet routed into the AIGO workflow. |
| 2 | Intake | To Do | Ready for AI/human intake triage. |
| 3 | Triage | In Progress | AI classifier or reviewer is analyzing. |
| 4 | Spec Ready | In Progress | AI/human spec is complete enough for execution review. |
| 5 | In Review | In Progress | Human review is needed for missing info, claims, approvals, or decisions. |
| 6 | In Progress | In Progress | Work is actively being executed by a human owner. |
| 7 | Claims Review | In Progress | Health/clinical claims await Compliance review. |
| 8 | Experiment Running | In Progress | Human-approved experiment is running; AI cannot launch it. |
| 9 | Decision Needed | In Progress | A human decision owner must decide. |
| 10 | Launch Prep | In Progress | Employer/campaign launch is being readied and checked. |
| 11 | Done | Done | Completed and accepted. |

Logical states represented outside the status list:

- **Blocked:** `blocked` label or stale in-progress queue.
- **Readout Needed:** `readout-needed` label.
- **Needs Info / Needs Human Review:** `In Review` status plus AI/human comment
  describing the missing info or approval needed.
- **Ready:** `Spec Ready`.

Canonical happy path:

```text
To Do -> Intake -> Triage -> Spec Ready -> In Progress -> Done
```

Branch paths:

```text
Triage / Spec Ready -> In Review -> Spec Ready
In Progress -> Claims Review -> In Review / Spec Ready
In Progress -> Experiment Running -> readout-needed label -> Done
In Progress -> Decision Needed -> Spec Ready / Done
Employer Launch / Campaign -> Launch Prep -> In Progress / Done
Any active issue -> blocked label -> queue follow-up -> prior status
```

## 2. Per-Issue-Type Branch Matrix

All types can use the intake spine (`To Do -> Intake -> Triage -> Spec Ready ->
In Progress -> Done`). Branch columns below mark additional statuses or labels
that type is expected to use.

| Issue type | Claims Review | Experiment Running | Decision Needed | Launch Prep | readout-needed label | blocked label |
|---|---|---|---|---|---|---|
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

## 3. Required Fields Per Transition

A transition should be blocked by human review or readiness checks unless the
listed fields/evidence are present. These are not autonomous field writes.

| Transition / gate | Required fields or evidence |
|---|---|
| To Do -> Intake | Summary and description are present. |
| Intake -> Triage | Jira issue context is readable by Forge/Rovo. |
| Triage -> In Review | Comment lists missing info, approval need, or risk reason. |
| Triage -> Spec Ready | Primary Metric where applicable; AI comment includes issue type, owner group, priority/risk, and acceptance criteria. |
| Any -> Claims Review | Claims Risk, Proof Point or copy/evidence being reviewed. |
| Any -> Experiment Running | Hypothesis, Primary Metric, Guardrail Metrics, Variant ID, Decision Date, Sample Feasibility, and tracking plan per `policies/experiment-policy.md`. |
| Any -> Decision Needed | Decision Needed plus a linked or drafted Decision Memo. |
| Employer Launch / Campaign -> Launch Prep | Launch Date, Assets Required, Readiness Score or blocker list, QA Required. |
| Experiment Running -> readout-needed label | Experiment ID and Primary Metric are known so results can be summarized. |
| In Progress -> readout-needed label | Primary Metric, Conversion Impact, or evidence source is available. |
| Any -> Done | Type-specific acceptance fields are satisfied and no human gate is open. |

Type-specific notes:

- **Experiment -> Experiment Running** requires human launch approval and the
  full experiment-policy field set.
- **Employer Launch -> Done** requires readiness blockers cleared and launch QA
  evidence.
- **Signup Funnel Issue -> Done** requires Evidence and Expected Lift or a clear
  "tracking issue only" resolution.

## 4. Human Approval Gates

AI may analyze and recommend at any status but must never cross these gates
itself.

| Gate | Who must approve | Rule |
|---|---|---|
| Claims Review | Compliance / Medical Review human | AI may flag, score Claims Risk, and recommend safer copy, but must not approve clinical/health claims or close the item. |
| Experiment Running | Human launch approver | AI may draft the experiment spec; only a human can approve launch. |
| Decision Needed | Human decision owner | AI may draft the memo and recommendation; the decision owner records the decision. |
| Launch Prep -> execution | Human launch owner | AI may produce readiness and blockers; it cannot launch campaigns or alter audiences. |
| High-risk -> Done | Human reviewer | High-risk tickets cannot be closed or approved without human review. |
| Enabling Automation rules | Lead + safety reviewer + operator | Rules are imported disabled; Rovo "Use agent" in Automation is blocked until the site has Atlassian Intelligence/Premium support. |

All AI contributions remain comment-only through the safe mutation path. Field
writes, transitions, approvals, audience changes, and campaign sends require a
future allowlisted write design.

safety-reviewer: approved 2026-06-14; live status setup updated 2026-06-15
