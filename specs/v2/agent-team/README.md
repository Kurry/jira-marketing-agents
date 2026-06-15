# AIGO Agent-Team Specs — v2 (Native-First Re-alignment)

Date: 2026-06-15
Status: Proposal. This `specs/v2/agent-team/` bundle re-aligns the agent-team
docs to the Atlassian-native / NIH-reduction direction. It does **not**
supersede the current `specs/agent-team/` until accepted by the architect +
safety reviewer.
Supersedes: `specs/agent-team/README.md`

> Read first: [`_CONVENTIONS.md`](../_CONVENTIONS.md) (§1 decision rule, §2 the
> Native Tool Fit Matrix is LAW, §3 the five NIH themes, §5 the unchanged safety
> contract) and [`atlassian-native-tools.md`](../atlassian-native-tools.md).

## What this bundle is

This is the **index of the agent-team v2 docs**. The team's mandate is unchanged
in spirit — drive the Forge/Rovo `jira-marketing-agents` repo to a verified,
reproducible, green state on staging — but re-aligned around one decision rule:

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

The v1 bundle pushed a bespoke `infra/` reconciler and a Terraform-equivalent
`infra:plan/apply/verify` control plane as the authoritative architecture. The
NIH second-pass review (`specs/nih-review-2026-06-15.md`) reframed that: the
native owners of the control plane are Forge CLI + `manifest.yml`, ACLI,
documented Jira REST, a golden company-managed template project, and (for
JSM/Compass only) the official Atlassian Operations Terraform provider. The
`infra/` layer becomes a **read-only audit harness over native output**, not a
from-scratch converge engine — and no per-resource converge work happens before
the ACLI capability inventory (T-NIH-03) and golden-template validation
(T-NIH-04) complete. This is a **re-alignment, not a scope cut**: every real
v1 role, task, gate, and approval lives on, re-pointed at the native owner.

## Read in this order

1. [`IAC_PRINCIPLES.md`](IAC_PRINCIPLES.md) — the one page everyone internalises:
   what "scriptable" means, what is banned, and how native-first reshapes IaC.
2. [`MISSION.md`](MISSION.md) — the goal, the native-first + NIH decision rules,
   scope, definition of done, and the unchanged safety contract.
3. [`REVIEW_MISSION.md`](REVIEW_MISSION.md) — audit what v1 produced, reduce the
   NIH surface, and drive the repo to a reproducible, native-first green state.
4. [`AUDIT_PLAN.md`](AUDIT_PLAN.md) — the read-only, **native-sources-only**
   startup audit (documented Forge/ACLI/REST `--json` + native Automation audit
   log) and its JSON outputs.
5. [`DECLARATIVE_STATE.md`](DECLARATIVE_STATE.md) — the `infra/` schema, framed
   as the **audit mirror** of native output, not a desired-state-with-apply.
6. [`SCRIPTS_CONTRACT.md`](SCRIPTS_CONTRACT.md) — the contract every `scripts/`
   entrypoint follows, including its single T-NIH-07 label.
7. [`SCRIPTABLE_VERIFICATION.md`](SCRIPTABLE_VERIFICATION.md) — every invariant
   as a command + JSON artefact + predicate, proven from documented native
   output; webtrigger and native Automation/Rovo proof in separate rows.
8. [`VERIFICATION_MATRIX.md`](VERIFICATION_MATRIX.md) — task done-ness rows,
   including the product-gated Rovo UI-visibility row kept distinct from the
   manifest/install check.
9. [`TEAM_CHARTER.md`](TEAM_CHARTER.md) — roles (`native-architect`,
   `jira-native-eng`, `forge-rovo-eng`, `script-eng`, `safety-tester`,
   `docs-scribe`, `lead`), file ownership, and plan-approval gates.
10. [`TASK_BOARD.md`](TASK_BOARD.md) — audit → reduce → verify → harden → prove,
    with the native-first sequencing gate. References the consolidated NIH
    roadmap rather than restating it.
11. [`OPERATING_LOOP.md`](OPERATING_LOOP.md) — the forever-loop rules, updated
    for read-only audit convergence.
12. [`QUALITY_GATES.md`](QUALITY_GATES.md) — the `TaskCreated` / `TaskCompleted`
    / `TeammateIdle` hooks, strengthened to reject private/internal endpoints on
    supported paths, webtrigger-as-native-proof, and unlabeled scripts.
13. [`AGENTS.md`](AGENTS.md) — the agent catalog the team operates against.
14. [`RUNBOOK.md`](RUNBOOK.md) — the operator view.
15. [`LAUNCH_PROMPT.md`](LAUNCH_PROMPT.md) — the paste-in launch prompt.

## Cross-bundle references (do not duplicate)

These docs **reference**, never restate:

- The **consolidated NIH refactor roadmap** (full `T-NIH-01..14` definitions,
  acceptance, dependencies): [`../nih-roadmap.md`](../nih-roadmap.md) (owned by
  A4). The task board wires owners and verification to these ids only.
- The **canonical data model** (issue-type / field / status counts and native
  owners): [`../issue-types.md`](../issue-types.md),
  [`../custom-fields.md`](../custom-fields.md), [`../workflows.md`](../workflows.md).
  No agent-team doc restates a count — it links instead (per `_CONVENTIONS.md` §4).
- The **Native Tool Fit Matrix** and the NIH themes:
  [`../atlassian-native-tools.md`](../atlassian-native-tools.md) and
  `specs/nih-review-2026-06-15.md`.

## On the v1/ archive

Everything under `specs/agent-team/v1/` is retained for **reference only** and is
**not rewritten** — it is historical. The new team should read the `v1/` files
**once** during the audit (Phase 1, step A4, marked experimental) to understand
what prior agents attempted, then rely exclusively on this v2 bundle going
forward. The v1 board, gates, and reconciler framing are abandoned; their real
requirements survive, re-pointed at native owners, in the v2 docs above.
