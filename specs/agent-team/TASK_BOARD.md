# Task Board (v2 — audit → remediate → prove)

The lead seeds the shared task list from this file at startup. Task ids
are stable; the v1 board is abandoned. Tasks with unsatisfied `deps`
cannot be claimed.

Legend: `owner:<name>` matches `TEAM_CHARTER.md`; `vm:<row>` points to
`SCRIPTABLE_VERIFICATION.md`; `deps=*` means no dependency.

## Phase 0 — Bootstrap

- **T-B-01** [owner:iac-architect] [deps:*]
  Copy the v2 spec bundle from `/tmp/outputs/` (minus the `v1/` dir)
  into `specs/agent-team/` if not already there. Commit.
  Evidence: `evidence/audit/spec-copy.json` produced by
  `scripts/audit/spec-copy.mjs`.

- **T-B-02** [owner:script-eng] [deps:*]
  Create the skeleton of the scripts tree and npm scripts per
  `SCRIPTS_CONTRACT.md`. Every new script exits 0 with a stub JSON
  report until real logic lands. Commit.
  Evidence: `evidence/infra/bootstrap.json`.

- **T-B-03** [owner:safety-tester] [deps:*]
  Install hooks from `QUALITY_GATES.md` under `.claude/hooks/`,
  `chmod +x`, and verify they trigger with the local `claude` CLI if
  possible. Commit. Evidence: `evidence/infra/hooks.json`.

- **T-B-04** [owner:docs-scribe] [deps:T-B-01]
  Create `STATUS.md` (template in `RUNBOOK.md`) and `CLAUDE.md` at
  the repo root. `CLAUDE.md` summarises `IAC_PRINCIPLES.md` and the
  ownership map. Commit.

## Phase 1 — Audit (all of A-x from `AUDIT_PLAN.md`)

- **T-A-01** [owner:script-eng] [deps:T-B-02]
  Implement `scripts/audit/repo-snapshot.mjs`. Acceptance: runs and
  emits `evidence/audit/repo.json` as specified in `AUDIT_PLAN.md`.

- **T-A-02** [owner:forge-rovo-eng] [deps:T-B-02]
  Implement `scripts/audit/forge-snapshot.mjs`.

- **T-A-03** [owner:jira-client-eng] [deps:T-B-02]
  Implement `scripts/audit/jira-snapshot.mjs`. Read-only; no mutations.

- **T-A-04** [owner:iac-architect] [deps:T-B-02]
  Implement `scripts/audit/v1-attempt.mjs`. Classifies prior
  commits/files as `iac-ok` / `manual-artifact` / `to-rewrite` /
  `to-revert`.

- **T-A-05** [owner:safety-tester] [deps:T-B-02]
  Implement `scripts/audit/safety-snapshot.mjs`. Scope audit + banned
  phrase scan + automation action audit.

- **T-A-06** [owner:iac-architect] [deps:T-A-01..T-A-05]
  Implement `scripts/audit/summarize.mjs` producing
  `evidence/audit/summary.json`. Print the delta summary to stderr.

- **T-A-07** [owner:lead] [deps:T-A-06]
  Run `scripts/audit/summary-to-tasks.mjs` and inject resulting
  `T-S-*`, `T-D-*`, `T-R-*` tasks into the shared task list.

## Phase 2 — Safety-first findings (`T-S-*`, created by audit)

These are **generated** by the audit. Template (actual ids assigned at
runtime):

- Any extra Forge scope → revert task.
- Any prompt containing banned phrases → rewrite task + safety test.
- Any automation rule action that could approve/send → remove task.
- Any policy referenced but missing → restore or rewrite task.

All `T-S-*` tasks are highest priority. Nothing else may be claimed
while any `T-S-*` is pending.

## Phase 3 — Delete manual artefacts (`T-D-*`, generated)

For every file under `evidence/` from v1 classified as
`manual-artifact`:

- Delete it.
- If its intent is still useful, open a `T-R-*` task to regenerate
  from a script.

Also delete from v1: any `docs/*.md` that directs the operator to
perform manual UI actions. `docs-scribe` rewrites them to point at the
scripted verb.

## Phase 4 — Declarative state scaffolding

- **T-R-INFRA-01** [owner:iac-architect] [deps:T-A-07]
  Create `infra/` tree per `DECLARATIVE_STATE.md`:
  `instances/staging.yaml`, and empty `schemaVersion: 1` stubs for
  issue-types, fields, screens, screen-schemes, workflow,
  workflow-schemes, filters, queues, dashboards, automation,
  seeds/matrix, rovo/agents. Commit.
  Evidence: `evidence/infra/tree.json`.

- **T-R-INFRA-02** [owner:script-eng] [deps:T-R-INFRA-01]
  Implement `scripts/infra/plan.mjs` as a pure composition over
  `scripts/infra/jira-*-plan.mjs` stubs. `npm run infra:plan` now
  returns a "nothing to do because declarations are empty" report
  without errors.

- **T-R-INFRA-03** [owner:script-eng] [deps:T-R-INFRA-02]
  Implement `scripts/infra/apply.mjs` composition (empty stubs apply
  no changes). Idempotent.

- **T-R-INFRA-04** [owner:script-eng] [deps:T-R-INFRA-03]
  Implement `scripts/verify/run-all.mjs` that runs every
  `scripts/verify/*.mjs` and aggregates JSON. Satisfies `npm run
  infra:verify`.

- **T-R-INFRA-05** [owner:jira-client-eng] [deps:T-R-INFRA-02]
  Implement `scripts/lib/jira.mjs` client (auth, retries, rate-limit,
  typed responses). All Jira calls go through it.
  Evidence: unit tests under `tests/lib/jira.test.ts`.

- **T-R-INFRA-06** [owner:forge-rovo-eng] [deps:T-R-INFRA-02]
  Implement `scripts/lib/forge.mjs` (wraps `forge` CLI and where
  possible the Rovo REST).

- **T-R-INFRA-07** [owner:iac-architect] [deps:T-R-INFRA-01]
  Fill `infra/jira/issue-types.yaml` with the canonical catalog.
  Fill `infra/jira/fields.yaml` with the full custom-field catalog
  from `specs/outcome-roadmap.md`. Fill `infra/jira/workflow/aigo-
  default.yaml` with 12 statuses + transition matrix.

## Phase 5 — Per-resource apply + verify (all depend on Phase 4)

For each resource category, one apply script + one verify script:

| Resource        | Apply                                          | Verify                               | VM                  |
| --------------- | ---------------------------------------------- | ------------------------------------ | ------------------- |
| Issue types     | `scripts/infra/jira-issue-types-apply.mjs`     | `scripts/verify/jira-issue-types.mjs`| VM-JIRA-ISSUE-TYPES |
| Fields+screens  | `scripts/infra/jira-fields-apply.mjs`          | `scripts/verify/jira-fields.mjs`     | VM-JIRA-FIELDS      |
| Workflow        | `scripts/infra/jira-workflow-apply.mjs`        | `scripts/verify/jira-workflow.mjs`   | VM-JIRA-WORKFLOW    |
| Filters         | `scripts/infra/jira-filters-apply.mjs`         | `scripts/verify/jira-filters.mjs`    | VM-JIRA-FILTERS     |
| Dashboards      | `scripts/infra/jira-dashboards-apply.mjs`      | `scripts/verify/jira-dashboards.mjs` | VM-JIRA-DASHBOARDS  |
| Seeds           | `scripts/infra/jira-seeds-apply.mjs`           | `scripts/verify/jira-seeds.mjs`      | VM-JIRA-SEEDS       |
| Automation      | `scripts/infra/automation-apply.mjs`           | `scripts/verify/automation-audit.mjs`| VM-AUTOMATION-*     |
| Rovo derivation | `scripts/infra/rovo-derive.mjs`                | `scripts/verify/rovo-agents.mjs`     | VM-ROVO-*           |

One `T-R-P5-<resource>` task per row, owned by `jira-client-eng`
(Jira rows) or `forge-rovo-eng` (Rovo/Forge rows), with `script-eng`
as reviewer. Every task is blocked on `T-R-INFRA-07`.

Each task's acceptance:

1. Apply script converges Jira to match declaration.
2. Verify script exits 0.
3. Re-run of apply reports `changes: []`.
4. Scripted evidence file exists.

## Phase 6 — Agent invocation harnesses

- **T-R-AGENT-01** [owner:forge-rovo-eng] [deps:T-R-P5-*]
  `scripts/invoke/run-all.mjs` + one wrapper per Rovo agent under
  `scripts/invoke/<agent>.mjs`. Each wrapper invokes the agent
  against its declared seed issue and asserts safety predicates.

- **T-R-AGENT-02** [owner:safety-tester] [deps:T-R-AGENT-01]
  `tests/safety/agent-outputs.test.ts` loads every
  `evidence/agent-runs/*.json` and re-asserts safety predicates so CI
  catches regressions.

## Phase 7 — Safety tests & hooks

- **T-R-SAFE-01** [owner:safety-tester] [deps:T-R-INFRA-01]
  Write `tests/safety/*.test.ts` covering the VM-SAFETY row bullets.

- **T-R-SAFE-02** [owner:safety-tester] [deps:T-R-SAFE-01]
  Wire CI job to run `npm run test:safety` and fail the build on red.

## Phase 8 — Docs regenerated from state

- **T-R-DOC-01** [owner:docs-scribe] [deps:T-R-P5-*]
  Implement `scripts/docs/generate.mjs` that rebuilds
  `docs/INTEGRATION.md`, `docs/PORTABILITY.md`, `docs/MVP_RUNBOOK.md`,
  and `docs/TROUBLESHOOTING.md` from the `infra/` tree and the
  verification matrix. Runs in CI; CI fails if `docs/` diverges.

- **T-R-DOC-02** [owner:docs-scribe] [deps:T-R-DOC-01]
  Regenerate. Commit. Delete any old hand-written runbook sections
  that contradict scripted state.

## Phase 9 — CI parity

- **T-R-CI-01** [owner:script-eng] [deps:T-R-INFRA-04]
  Extend `.github/workflows/ci.yml` to run
  `npm ci && npm run build && npm test && npm run test:safety && npm
  run forge:lint && npm run infra:plan`. `infra:plan` uses a
  `--dry-run` mode against a recording of the staging snapshot
  (sourced from `evidence/audit/jira.json`), not the live site, so
  CI is deterministic and offline.

- **T-R-CI-02** [owner:script-eng] [deps:T-R-CI-01]
  Add a nightly job that runs `npm run infra:verify` against live
  staging with a dedicated CI credential (if the operator provides
  one) or marks itself `skipped` on missing auth.

## Phase 10 — Final proof

- **T-F-01** [owner:lead] [deps:everything above]
  Run:
  ```
  rm -rf evidence/
  npm run infra:plan
  npm run infra:apply
  npm run infra:apply            # idempotency proof
  npm run infra:verify
  ```
  Every command exits 0 on the second attempt. `evidence/` rebuilds
  from scripts. Commit regenerated state.

- **T-F-02** [owner:safety-tester] [deps:T-F-01]
  Full audit pass: run `scripts/audit/safety-snapshot.mjs` against
  the final state and attach to `evidence/safety/final.json`.

- **T-F-03** [owner:iac-architect] [deps:T-F-01, T-F-02]
  `evidence/DONE.json` is produced by `npm run infra:verify` only
  when every VM row is green or marked
  `unsupported-by-platform` with a matching blocker file. Commit.

- **T-F-04** [owner:lead] [deps:T-F-03]
  Post handoff summary to the operator. Wait for explicit "clean up"
  before cleaning up the team.

## Continuous

- **T-CX-STATUS** [owner:lead] Never completes; update every ~20
  minutes.
- **T-CX-SAFETY** [owner:safety-tester] Never completes; review every
  diff on `main`.
- **T-CX-EVIDENCE** [owner:script-eng] Never completes; ensure every
  new file under `evidence/` has a `generated_by` header.
