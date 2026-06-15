# AIGO Issue Types (v2 — Canonical)

Date: 2026-06-15
Status: Proposal. Aligns the issue-type model to the Atlassian-native / NIH-reduction direction; does not supersede current specs until accepted by architect + safety reviewer.
Supersedes: `specs/issue-types.md`

This file, together with [`custom-fields.md`](custom-fields.md) and
[`workflows.md`](workflows.md), is the **single source of truth** for canonical
issue-type / field / status counts, names, and the native owner of each entity
(per [`_CONVENTIONS.md`](_CONVENTIONS.md) §4). Other v2 docs must reference this
file and must not restate counts.

## Canonical count and drift reconciliation

**Canonical: 14 issue types.** All 14 named types from `specs/issue-types.md`
are preserved as real entities. This is a re-homing of *who owns each type's
runtime* (JPD vs Jira Software), **not** a scope cut — every type below stays in
the model with an explicit native owner.

Drift reconciled (see NIH theme #2 and T-NIH-14):

| Source | Count claimed | Why it disagreed |
| --- | --- | --- |
| `specs/issue-types.md` (catalog) | 14 | The authoritative named catalog. **Adopted.** |
| `docs/MVP_READINESS.md` | 14 | Matches the catalog. |
| generated tables | 13 | Dropped one type (a generator off-by-one, not a model decision). |
| `STATUS.md` | 18 | Counted legacy defaults (Workstream / Task / Sub-task) and aliased intake variants (Growth Task, Automation Request, Bug / Tracking Issue) as distinct types. |

Resolution: **14 canonical types.** Legacy defaults and aliases are *not*
separate types — they map into the 14 per the alias table below. The number is
stated **once, here.**

## Native-owner model (NIH theme #2, matrix rows "Ideas and product discovery"
and "Jira admin configuration")

Each type is owned by exactly one runtime:

- **JPD** — Jira Product Discovery owns idea capture, insights, prioritization,
  and delivery links. Used for types whose work is *discovery/synthesis* rather
  than an execution workflow.
- **Jira Software (golden template)** — a golden company-managed template
  project owns the type, its screens, and field associations; a clone carries
  them. Used only for genuine **growth-execution** types that need a transition
  workflow and human/Forge gates.

The golden template is the Jira-config source of truth for *all* Jira-Software
types below; per-site provisioning scripts are demoted to clone-diff fallbacks
(T-NIH-04/09). Project Settings UI is the documented fallback for team-managed
projects (no reliable REST path for project-scoped type attachment — a platform
gap, not a reason to keep a custom provisioner as primary owner).

## Canonical issue types

| # | Type | Native owner | Rationale |
| --- | --- | --- | --- |
| 1 | AI Growth Request | **JPD idea** (intake) → links to Jira execution type | Vague/unrouted intake is discovery; AI triage classifies and links it to the right execution type. Keep a thin Jira intake type only if JPD intake is unavailable in tenant (documented gap). |
| 2 | Creative Request | Jira Software (golden template) | Execution: draft variants, claims-scan, route to review. |
| 3 | Experiment | Jira Software (golden template) | Execution: hypothesis → run → decision; needs the experiment-policy gate (see [`workflows.md`](workflows.md) §3–4). |
| 4 | Segmentation Request | Jira Software (golden template) | Execution: produce a targeting spec; references **Segment** as a JSM Assets object (see [`custom-fields.md`](custom-fields.md)). |
| 5 | Personalization Journey | Jira Software (golden template) | Execution: multi-stage journey artifact with approvals. |
| 6 | Employer Launch | Jira Software (golden template) | Execution: workback plan, readiness, subtasks; references **Employer/Partner** Assets objects. |
| 7 | Campaign | Jira Software (golden template) | Execution: multi-touch plan (draft only, no send), launch-prep gate. |
| 8 | Dashboard Request | Jira Software (golden template) | Execution: reporting-view spec; downstream readouts prefer Atlassian Analytics/Data Lake. |
| 9 | Signup Funnel Issue | Jira Software (golden template) | Execution: friction/defect remediation. |
| 10 | Research Brief | **JPD idea + insights** | Discovery/synthesis: themes, frequency, de-identified quotes. JPD insights own the source evidence; only links to delivery if a test is spun up. |
| 11 | Claims Review | Jira Software (golden template) | Execution with a hard human Compliance gate; must stay a Jira workflow type so the gate is enforceable. AI never approves. |
| 12 | Decision Memo | **JPD idea** (decision view) or Jira execution type | Discovery/decision-support artifact; JPD decision views can own it. Keep a Jira type if the memo must drive a transition gate. |
| 13 | Positioning Update | **JPD idea** | Discovery: value props, proof requirements, objection matrix. Synthesis work, not an execution workflow. |
| 14 | Bug | Jira Software (golden template) | Execution: engineering/tracking defect; uses the platform's native Bug type. |

**Discovery-vs-execution split (T-NIH-05):** types 1, 10, 12, 13 are evaluated
as JPD ideas/insights before being kept as Jira execution types. Where the
tenant lacks JPD, each falls back to a Jira-Software type (documented gap, not a
default). Types 2–9, 11, 14 stay Jira-Software execution types because they need
transition workflows and Forge/human gates.

## Legacy alias map (entities preserved, not deleted)

| Legacy / current type | Canonical target | Owner of target |
| --- | --- | --- |
| Insight / Research Brief | Research Brief (#10) | JPD |
| Growth Task | AI Growth Request (#1) | JPD intake |
| Automation Request | AI Growth Request (#1, when AI-driven) | JPD intake |
| Bug / Tracking Issue | Bug (#14) | Jira Software |
| Workstream / Task / Sub-task | Transitional defaults only | n/a — do not use for new AIGO work |

## Notes / merges / moves

- **Moved to JPD:** AI Growth Request (intake), Research Brief, Decision Memo,
  Positioning Update — preserved as entities, new owner JPD (spike T-NIH-05).
- **No merges within the 14.** STATUS.md's "18" double-counted legacy defaults +
  aliases; those collapse into the alias map, they are not distinct types.
- Instance-specific type IDs (e.g. live AIGO 10048–10061) stay env-injected,
  never hard-coded (`src/config.ts`).
