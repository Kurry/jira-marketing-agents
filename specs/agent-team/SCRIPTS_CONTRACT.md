# Scripts Contract

Every script in this repo — audit, infra apply, verifier, agent
invoker, automation renderer — follows the rules below. The
`TaskCompleted` hook rejects work that adds or modifies a script
violating any of them.

## Locations

```
scripts/
  audit/          # read-only, outputs JSON audit artefacts
  infra/          # plan / apply / render / destroy (destroy opt-in)
  verify/         # assertion scripts, exit non-zero on failure
  invoke/         # per-agent and per-rule invocation harnesses
  lib/            # shared helpers (jira client, forge client, io)
```

> **NIH note.** Per `specs/atlassian-native-tools.md` (T-NIH-07, "custom
> script label inventory"), every `scripts/infra/*` entrypoint should carry
> exactly one label — **native wrapper**, **documented API gap**, or
> **Twin-specific logic** — naming the native owner (ACLI command, Forge CLI
> verb, golden-template clone step, or documented REST endpoint) it binds
> to. `scripts/infra/` should be predominantly thin wrappers/diffs over
> those native surfaces, not a self-contained config engine. No script may
> name a private/internal Atlassian endpoint as its supported path.

Prefer `.mjs` (plain Node ESM) or `.ts` (compiled via `tsx`/`ts-node`)
over `.sh` when the script does more than three steps. `.sh` is fine
for simple pipelines; bash must be `set -euo pipefail`.

## Interface

Every top-level script supports:

```
--help                      # prints usage and exits 0
--plan                      # dry-run; computes delta, no mutations
--apply                     # converges live state to declared state
--verify                    # asserts invariants; exits non-zero on red
--json                      # machine-readable output to stdout
--quiet                     # suppress non-JSON output
--instance <path>           # default infra/instances/staging.yaml
```

Not every script implements every verb; `--help` says which verbs it
supports. Verifier scripts always implement `--json`.

## Inputs

- Read site/project/actor/env from
  `infra/instances/<name>.yaml` (default: staging).
- Read env vars for secrets only. Missing secrets → exit code 3.
- Never read from stdin. Never prompt.
- Never read from `~/.aws`, `~/.atlassian`, etc. beyond the CLIs that
  are already authenticated.

## Outputs

- Human output goes to stderr; machine output to stdout.
- Every script (audit, infra, verify, invoke) writes a JSON report
  under a deterministic path:
  - audit: `evidence/audit/<name>.json`
  - infra: `evidence/infra/<name>.json`
  - verify: `evidence/verify/<name>.json`
  - invoke: `evidence/agent-runs/<agent-or-rule>.json`
- Every JSON report includes:
  ```json
  {
    "generated_by": "scripts/<category>/<name>.mjs",
    "generated_at": "<ISO>",
    "git_sha": "<HEAD sha>",
    "instance": "staging",
    "exit_code": 0,
    "summary": "...",
    "data": { ... }
  }
  ```

## Exit codes (standardised)

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 0    | Success                                              |
| 1    | Generic failure with diagnostics in stderr           |
| 2    | Validation / assertion failed (verifier)             |
| 3    | Missing credential, env var, or CLI auth             |
| 4    | Target environment mismatch (safety refusal)         |
| 5    | Platform capability missing (no REST/CLI surface)    |
| 6    | Destructive op blocked (no `AIGO_DESTRUCTIVE=1`)     |
| 10+  | Category-specific; document in the script's --help   |

## Idempotency

- `*-apply.mjs` must be safe to re-run. Second run on the same
  declaration reports `changes: []` in its JSON report and exits 0.
- No script deletes resources unless both
  `AIGO_DESTRUCTIVE=1` and `AIGO_CONFIRM=<exact-resource-key>` are
  present. Otherwise exit code 6.

## Safety rails baked in

Every script that could touch Jira or Forge mutatingly must:

1. Call `assertStagingOnly()` from `scripts/lib/safety.ts` before any
   mutation. That helper verifies:
   - `infra/instances/<name>.yaml`.`site` equals
     `myhealthcaresite.atlassian.net`.
   - `forgeEnv` equals `development`.
   - Exits code 4 otherwise.
2. Refuse any mutation on resources tagged
   `policy: human-approval-required` without
   `AIGO_HUMAN_APPROVED=<task-id>`.

## No network in unit tests

`tests/**` that runs under `npm test` must not call Jira or Forge.
Network-using tests belong under `tests/integration/` and must:

- Be tagged `staging-only` in the test name.
- Refuse to run if `AIGO_ALLOW_INTEGRATION=1` is not set.
- Use the same `scripts/lib/` clients as production scripts.

## Logging & reproducibility

- Every script logs the full resolved config (with secrets redacted) to
  stderr on startup.
- Every mutation logs a before/after diff to stderr and to the JSON
  report's `changes` array.
- Re-running with the same inputs produces the same report modulo
  `generated_at` and `git_sha`.

## Top-level `package.json` scripts

The following npm scripts are the **only** entrypoints humans and CI
run. Internal scripts may exist but should be composed into these:

```json
{
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:integration": "AIGO_ALLOW_INTEGRATION=1 vitest run tests/integration",
    "test:safety": "vitest run tests/safety",

    "audit": "node scripts/audit/run-all.mjs",

    "infra:plan":   "node scripts/infra/plan.mjs",
    "infra:apply":  "node scripts/infra/apply.mjs",
    "infra:verify": "node scripts/verify/run-all.mjs",
    "infra:render": "node scripts/infra/render-all.mjs",

    "rovo:invoke-all": "node scripts/invoke/run-all.mjs",

    "lint": "tsc --noEmit && eslint .",

    "forge:deploy": "forge deploy -e development",
    "forge:install": "forge install --upgrade -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes",
    "forge:lint": "forge lint"
  }
}
```

If any of these scripts does not exist yet, creating it is a
remediation task (see `TASK_BOARD.md`).

## No hand-written evidence

Helpers in `scripts/lib/report.mjs` produce the standard JSON envelope
and a sibling Markdown summary. Markdown under `evidence/` must be
generated by this helper, not hand-edited. The `TaskCompleted` hook
rejects `evidence/**/*.md` without a `generated_by:` front-matter.
