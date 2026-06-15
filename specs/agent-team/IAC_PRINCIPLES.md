# Infrastructure-as-Code Principles (read first)

> **NIH note (audit proposal, not authoritative architecture).** Per
> `specs/atlassian-native-tools.md` finding #4 and its "IaC hard reset"
> reduction, treat the `specs/agent-team/` v2 bundle — including the
> bespoke `infra/` reconciler and the three-command `infra:plan` /
> `infra:apply` / `infra:verify` contract below — as an **audit proposal**,
> not the repo's authoritative control plane. The native owners of Jira
> declarative state are **ACLI** (`jira project`/`workitem`/`field`/`filter`/
> `dashboard`), the **golden company-managed template project**, **Forge
> CLI + `manifest.yml`** (already IaC for Rovo/agents), documented **Jira
> REST**, and the **official Atlassian Operations Terraform provider** for
> JSM/Compass. Do not build a full from-scratch plan/apply/drift engine that
> re-implements Terraform or ACLI until each native surface has been
> evaluated and the gap is documented (see T-NIH-03..07). The reconciler is
> valuable framed as an **audit harness over native command output**, not as
> a replacement for those tools. `llms.txt` / source-of-truth wins on facts.

This repository is **Infrastructure as Code**. If a change to Jira, Forge,
Rovo, or the repo itself cannot be reproduced end-to-end by running a
script checked into the repo on a clean clone, **the change did not happen**.

Every teammate, every task, and every piece of evidence must obey the
rules below. The `TaskCompleted` hook (see `QUALITY_GATES.md`) rejects
anything that violates them.

## The one rule

**One command reconciles.** From a clean clone with authenticated CLIs,
the following must produce the fully configured staging environment:

```bash
npm ci
npm run infra:plan     # no drift, nothing left to do, exit 0
npm run infra:apply    # idempotent; re-running is a no-op
npm run infra:verify   # every invariant green, exit 0
```

If any of those steps does not exist yet, creating it is a task. If any
of those steps requires a human to click, paste, or screenshot anything,
it is broken and must be fixed.

## What "scriptable evidence" means

Evidence is valid **only** if it is:

1. A file produced by a script in the repo (under `scripts/` or
   `npm run …`).
2. Deterministic on re-run against the same environment (modulo
   timestamps and ephemeral ids).
3. Machine-readable where possible (JSON), with Markdown summaries
   generated *from* the JSON, not hand-written.
4. Checked into the repo under `evidence/` with the command that
   produced it recorded at the top of the file.

Evidence is **invalid** if it is:

- A screenshot.
- A textual description of a UI navigation path.
- A copy-paste from a human.
- A "spot check" the operator performed.
- Any file whose contents are not produced by a script referenced in
  `package.json` or in `scripts/`.

## Banned patterns (automatic reject)

- `"Ask the operator to paste …"`
- `"Open Jira and navigate to …"`
- `"Manual UI check"` as a success criterion.
- `"Take a screenshot"` or any `.png`/`.jpg` under `evidence/`.
- Acceptance bullets that hinge on human verification.
- Tasks whose "Run" field is not a command, or is a command that requires
  interactive input (`read`, `prompt`, TTY login).
- Tasks that say "decide manually" without a code artefact that encodes
  the decision.
- Tests that assert `true` or are skipped with `xit`/`describe.skip`.

## Declarative state vs. imperative drift

Jira configuration (issue types, fields, screens, workflows, filters,
dashboards, automation rules) is **declared once** in YAML/JSON under
`infra/` (see `DECLARATIVE_STATE.md`). Scripts under `scripts/infra/`
read that declaration and converge Jira to match. Scripts never read
Jira, hand-copy values into commit messages, and call it a day; they
compare against the declaration and either apply the delta or fail.

> **NIH note.** The "converge Jira to match a YAML declaration" loop
> described here re-implements the native Terraform-provider /
> golden-template-clone pattern. Before authoring per-resource converge
> code, check the Native Tool Fit Matrix in
> `specs/atlassian-native-tools.md`: most of these resources have an ACLI
> command, a golden-template clone path, or a documented REST endpoint that
> should be wrapped rather than reproduced. Keep the `infra/` apply scripts
> as **thin wrappers** that diff native command output; do not build a
> standalone configuration engine that duplicates ACLI or Terraform.

Forge is already IaC via `manifest.yml`. Do not add drift around it.
The repo's job is to make the *Jira side* equally declarative.

## Programmatic verification only

The following replace everything that was "manual" in v1:

| Prior "manual" check                     | Scripted replacement                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| "Confirm 19 agents visible in Rovo UI"   | `scripts/verify/rovo-agents.ts` — reads `manifest.yml`, calls Rovo/Forge REST, diffs.  |
| "Check Jira navigation path"             | None. Navigation paths are not verification.                                           |
| "Paste the audit log from a rule run"    | `scripts/verify/automation-audit.ts` — fetches the rule's audit log JSON and asserts.  |
| "Take a screenshot of the dashboard"     | `scripts/verify/dashboards.ts` — queries Jira REST for dashboards and gadget configs.  |
| "Open the Rovo chat and run the agent"   | `scripts/invoke/rovo-agent.ts` — invokes the agent via Forge trigger and captures JSON.|
| "Verify a seed issue exists"             | `scripts/verify/seed-coverage.ts` — JQL search, asserts counts per issue type.         |

If a Jira/Forge/Rovo capability has no REST/CLI surface, the task is
**documented as blocked** in `evidence/blockers.md` with the specific
endpoint that is missing, and a **fallback declarative stub** is
committed. No task pretends to be done by routing through a human.

## Authentication and secrets

- All CLIs (`forge`, `acli`, `gh`, Jira REST via bearer token) are
  pre-authenticated on the operator's machine. Scripts assume this.
- Scripts must never prompt for credentials. If a credential is missing,
  exit with a specific error code and a message telling the operator
  which env var or CLI login is required.
- Never commit tokens, cookies, site-specific ids beyond the staging
  site name, or PHI.

## Commands that mutate production are disabled

Any script that could touch a non-staging environment must:

- Refuse unless `AIGO_TARGET=staging` is set *and* the Jira site matches
  the allowlist (`myhealthcaresite.atlassian.net`).
- Refuse unless Forge env is `development`.
- Exit with a specific non-zero code when the safety check fails.

## Convergence, not one-shot

Every `scripts/infra/*-apply.ts` must be **idempotent**:

- First run: applies changes, reports deltas.
- Second run with no declaration change: reports zero deltas, exits 0.
- Any run after declaration change: applies only the delta.

`scripts/infra/plan.ts` computes and prints the delta without applying.
This is the Terraform-equivalent behaviour for Jira configuration.

> **NIH note.** "Terraform-equivalent behaviour for Jira" is precisely the
> parallel-control-plane risk this bundle must avoid. Terraform is out of scope
> for the current MVP/NIH completion path; the reduction is to run the ACLI and
> golden-template checks first and only own the slim documented gaps those tools
> cannot cover — not to ship a parallel convergence engine.

## Failure is visible

- Every script exits non-zero on failure with a short, parseable reason.
- Every script writes a JSON report under
  `evidence/<script-category>/<name>.json` even on success.
- `npm run infra:verify` summarises all JSON reports and exits non-zero
  if any predicate is red.

## Test budget

- No network calls in unit tests. Integration tests under
  `tests/integration/` are allowed to hit Jira/Forge and must tag every
  test with `staging-only`.
- A test that cannot be automated is not a test. It is a manual
  procedure that this repo does not accept.
