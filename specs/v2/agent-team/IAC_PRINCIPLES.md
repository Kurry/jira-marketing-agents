# Infrastructure-as-Code Principles (read first)

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment; does not supersede the
current specs until accepted by the architect + safety reviewer.
Supersedes: `specs/agent-team/IAC_PRINCIPLES.md`

This repository practices **Infrastructure as Code**: every change to Jira,
Forge, Rovo, or the repo itself must be reproducible end-to-end from a clean
clone by a checked-in script. If a change cannot be reproduced that way, **the
change did not happen**.

What v2 changes is *who owns the converge step*, not the IaC discipline. The v1
contract drifted toward a bespoke `infra/` reconciler presented as a
Terraform-equivalent control plane for Jira. Per `_CONVENTIONS.md` §1 (the
decision rule) and the NIH second-pass review theme #3, that framing is
**re-aligned, not removed**: the `infra/` layer is a **read-only audit harness
over native command output**, and **mutations route through native tools**.

## The decision rule governs IaC too

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

The native owners of Jira declarative state are:

- **Forge CLI + `manifest.yml`** — already IaC for the app runtime, Rovo
  agents, actions, workflow modules, scheduled triggers. Do not add drift
  around it.
- **The golden company-managed template project** — the source of truth for
  issue types, fields, screens, statuses, board columns, queues, filters, and
  dashboards (per matrix row "Jira admin configuration").
- **ACLI** (`jira project` / `workitem` / `field` / `filter` / `dashboard`) —
  the supported imperative surface for project and work-item primitives.
- **Documented Jira REST** — for admin surfaces ACLI does not cover.
- **Native Jira Automation import/export** — for automation rules.
- **The official `atlassian/atlassian-operations` Terraform provider** — for
  JSM/Compass Operations resources only, never the Jira control-plane critical
  path.

A from-scratch plan/apply/drift engine that re-implements Terraform or ACLI is
**not** built. See `[DECLARATIVE_STATE.md](DECLARATIVE_STATE.md)` for what
`infra/` declares and `[SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md)`
for how each invariant is proven.

## The NIH decision rule (theme #3 — IaC hard reset)

This rule is binding on every IaC task and gates the `TaskCompleted` hook
(see `[QUALITY_GATES.md](QUALITY_GATES.md)`):

> **Native-first beats build-a-reconciler.** The `infra/` reconciler is a
> read-only audit harness over native output, not a Terraform-equivalent
> control plane. **No per-resource converge engine is built before the ACLI
> capability inventory (T-NIH-03) and golden-template validation (T-NIH-04)
> complete.** Any resource an ACLI command, a golden-template clone, a Forge
> module, or a documented REST endpoint already owns must be wrapped, not
> reproduced. A custom converge step is acceptable only for a documented gap
> those native tools cannot cover, and only after the gap is recorded in
> `evidence/blockers.md`.

Concretely:

- `infra/` apply scripts are **thin wrappers** that diff native command output
  and route mutations to ACLI / golden-template clone / Forge / native
  Automation import. They do not own a standalone configuration engine.
- "Terraform-equivalent behaviour for Jira" is exactly the parallel-control-
  plane risk to avoid; that phrasing is retired from the v2 contract.
- The defensible custom pieces of the harness are (a) the **read-only diff**
  against native output and (b) the **staging additive-only safety gate**.

## The one rule (re-aligned)

**One command reconciles** — but the converge step delegates to native tools.
From a clean clone with authenticated CLIs, the following must bring up the
fully configured staging environment:

```bash
npm ci
npm run infra:plan     # read-only diff of native output vs declaration; exit 0 if none
npm run infra:apply    # idempotent; routes mutations through native tools; re-run is a no-op
npm run infra:verify   # every invariant green, exit 0
```

If any step does not yet exist, creating it is a task — but the task must
satisfy the NIH decision rule: prefer wrapping a native surface over building a
converge engine, and block per-resource converge work behind T-NIH-03/04. If any
step requires a human to click, paste, or screenshot in a **supported path**, it
is broken and must be fixed. A capability with no REST/CLI surface is recorded
as a documented gap (see below), not hidden behind an internal endpoint.

## What "scriptable evidence" means (unchanged — strong part kept)

Evidence is valid **only** if it is:

1. A file produced by a script in the repo (under `scripts/` or `npm run …`).
2. Deterministic on re-run against the same environment (modulo timestamps and
   ephemeral ids).
3. Machine-readable where possible (JSON), with Markdown summaries generated
   *from* the JSON, not hand-written.
4. Checked into the repo under `evidence/` with the command that produced it
   recorded at the top of the file.

Evidence is **invalid** if it is:

- A screenshot.
- A textual description of a UI navigation path.
- A copy-paste from a human.
- A "spot check" the operator performed.
- Any file whose contents are not produced by a script referenced in
  `package.json` or in `scripts/`.

Per theme #4, **native Automation/Rovo audit-log proof and webtrigger-fallback
evidence are tracked in separate rows**; webtrigger reachability is never
recorded as proof that native Jira Automation invoked Rovo, and Rovo
"visibility" wording is a "manifest/install check" unless a public listing API
exists.

## Banned patterns (automatic reject — unchanged)

- `"Ask the operator to paste …"`
- `"Open Jira and navigate to …"`
- `"Manual UI check"` as a success criterion.
- `"Take a screenshot"` or any `.png`/`.jpg` under `evidence/`.
- Acceptance bullets that hinge on human verification.
- Tasks whose "Run" field is not a command, or is a command that requires
  interactive input (`read`, `prompt`, TTY login).
- Tasks that say "decide manually" without a code artefact that encodes the
  decision.
- Tests that assert `true` or are skipped with `xit`/`describe.skip`.

Added in v2 per the NIH themes:

- A custom per-resource converge engine for a resource that ACLI, a
  golden-template clone, Forge, or a documented REST endpoint already owns,
  authored before T-NIH-03/04 complete.
- Any **internal/private Atlassian endpoint** (`gateway/api/automation/
  internal-api`, `rest/cb-automation`) or reverse-engineered ACLI keychain
  credential blob in a **supported** path. Such usage is experimental,
  non-default, and tied to a `evidence/blockers.md` platform-blocker note only.

## Declarative state vs. imperative drift

Jira configuration (issue types, fields, screens, workflows, filters,
dashboards, automation rules) is **declared once** under `infra/` (see
`[DECLARATIVE_STATE.md](DECLARATIVE_STATE.md)`). The declaration is the diff
target for the audit harness; it is **not** the input to a bespoke convergence
engine. Scripts under `scripts/infra/` read the declaration, diff it against
**native command output**, and route any needed mutation to the native owner
(ACLI, golden-template clone, Forge, documented REST, native Automation import).
They never read Jira, hand-copy values into a commit message, and call it done.

Forge is already IaC via `manifest.yml`. The repo's job is to make the *Jira
side* equally declarative **by binding native tools**, not by reproducing them.

## Programmatic verification only

The following replace everything that was "manual" in v1. The native owner for
each verification is named per the matrix; webtrigger fallbacks and native
audit-log proof live in separate rows:

| Prior "manual" check                     | Scripted replacement                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Confirm 19 agents visible in Rovo UI"   | `scripts/verify/rovo-agents` — reads `manifest.yml` + `forge install` (manifest/install check, not UI visibility). |
| "Check Jira navigation path"             | None. Navigation paths are not verification.                                                  |
| "Paste the audit log from a rule run"    | `scripts/verify/automation-audit` — fetches the **native** rule audit-log JSON and asserts.   |
| "Take a screenshot of the dashboard"     | `scripts/verify/dashboards` — queries Jira REST / ACLI for dashboards and gadget configs.     |
| "Open the Rovo chat and run the agent"   | `scripts/invoke/rovo-agent` — invokes via the native Automation/Forge path and captures JSON. |
| "Verify a seed issue exists"             | `scripts/verify/seed-coverage` — ACLI/JQL search, asserts counts per issue type.              |

If a Jira/Forge/Rovo capability has no REST/CLI surface, the task is
**documented as blocked** in `evidence/blockers.md` with the specific missing
endpoint, the verification row is marked `unsupported-by-platform` in
`[SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md)`, and a **declarative
stub** is committed. No task pretends to be done by routing through a human, and
no task substitutes an internal endpoint for the missing public one.

## Authentication and secrets

- All CLIs (`forge`, `acli`, `gh`, Jira REST via bearer token) are
  pre-authenticated on the operator's machine. Scripts assume this.
- Auth uses the **documented `ATLASSIAN_TOKEN` env var** (per theme #1). The
  reverse-engineered ACLI keychain credential blob is not a supported auth path.
- Scripts must never prompt for credentials. If a credential is missing, exit
  with a specific error code and a message telling the operator which env var or
  CLI login is required.
- Never commit tokens, cookies, site-specific ids beyond the staging site name,
  or PHI.

## Commands that mutate production are disabled

Any script that could touch a non-staging environment must:

- Refuse unless `AIGO_TARGET=staging` is set *and* the Jira site matches the
  allowlist (`myhealthcaresite.atlassian.net`).
- Refuse unless Forge env is `development`.
- Exit with a specific non-zero code when the safety check fails.

## Convergence, not one-shot

Every `scripts/infra/*-apply` must be **idempotent** and delegate the mutation
to a native owner:

- First run: routes the needed changes through ACLI / golden-template clone /
  Forge / native Automation import, reports deltas.
- Second run with no declaration change: reports zero deltas, exits 0.
- Any run after declaration change: applies only the delta, via the native
  owner for that resource.

`scripts/infra/plan` computes and prints the delta against native output without
applying. It is a **read-only audit diff**, not a Terraform-equivalent
control plane. The staging additive-only gate is the only mutation safety logic
this layer owns directly; everything else is the native tool's job.

## Failure is visible

- Every script exits non-zero on failure with a short, parseable reason.
- Every script writes a JSON report under
  `evidence/<script-category>/<name>.json` even on success.
- `npm run infra:verify` summarises all JSON reports and exits non-zero if any
  predicate is red.

## Test budget

- No network calls in unit tests. Integration tests under `tests/integration/`
  are allowed to hit Jira/Forge and must tag every test with `staging-only`.
- A test that cannot be automated is not a test. It is a manual procedure that
  this repo does not accept.
