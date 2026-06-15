# Scripts Contract

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment to the Atlassian-native /
NIH-reduction direction; not authoritative until the architect + safety reviewer
accept it.
Supersedes: `specs/agent-team/SCRIPTS_CONTRACT.md`

Every script in this repo — audit, snapshot, verifier, agent invoker, automation
renderer — follows the rules below. The `TaskCompleted` hook rejects work that
adds or modifies a script violating any of them. Scripts bind native tooling and
generate evidence; they are not a parallel control plane (theme #3).

## Locations

```
scripts/
  audit/          # read-only; reads native sources, outputs JSON audit artefacts
  snapshot/       # read-only; serialize native output into infra/ snapshots
  verify/         # assertion scripts; exit non-zero on failure
  invoke/         # per-agent and per-rule invocation harnesses
  lib/            # shared helpers (jira client, forge client, report, safety, io)
```

There is **no** `scripts/infra/{plan,apply}` converge engine. Mutations are
performed by native tooling — ACLI, a golden company-managed template-project
clone, native Jira Automation import/export, and Forge — not by repo scripts.
Repo scripts read native output and write the read-only `infra/` snapshot (see
[DECLARATIVE_STATE.md](DECLARATIVE_STATE.md)).

Prefer `.mjs` (plain Node ESM) or `.ts` (compiled via `tsx`/`ts-node`) over
`.sh` when the script does more than three steps. `.sh` is fine for simple
pipelines; bash must be `set -euo pipefail`.

## T-NIH-07 label — required on every supported script

Per `atlassian-native-tools.md` T-NIH-07, **every supported `scripts/*`
entrypoint MUST carry exactly one** of these labels in a header block, and name
the native owner or documented endpoint it binds to:

| Label | Meaning | Must name |
| --- | --- | --- |
| `native-wrapper` | Thin wrapper/diff over a supported native command | The ACLI command, Forge CLI verb, golden-template clone step, or documented Jira REST GET it wraps |
| `documented-API-gap` | Fills a gap where no native command exists | The missing native capability and the **documented** public endpoint used as the fallback |
| `Twin-specific` | Encodes Twin policy, agent logic, safety, evidence generation, or instance binding | Which of those five reasons applies |

Header form (machine-checkable by `tests/script-label-inventory.test.ts`):

```js
// @t-nih-07: native-wrapper
// @native-owner: acli `jira field list --json`
// @reads: ACLI jira field listing (documented)
```

A script with zero labels, more than one label, or a label that does not match
the allowed set is rejected by the hook.

## Forbidden surfaces — private/internal endpoints (theme #1)

No supported script may name a **private/internal Atlassian endpoint** as its
path. The hook rejects any supported `scripts/*` that references:

- `gateway/api/automation/internal-api`
- `rest/cb-automation`
- any reverse-engineered ACLI macOS-keychain credential blob
  (base64→gunzip→JSON token extraction)
- any other undocumented/internal surface.

Auth uses the documented `ATLASSIAN_TOKEN` env var (and the already-authenticated
Forge/ACLI CLIs) only. If a needed capability has **no** documented public
REST/CLI surface, the script must exit 5 (platform-missing) and write a blocker
file under `evidence/blockers/`; it must **not** route through an internal
endpoint. Any experimental internal probe is non-default, lives outside the
supported entrypoints, and carries a platform-blocker note — it is never wired
into `npm run` scripts or CI.

## Interface

Every top-level script supports:

```
--help                      # prints usage and exits 0
--audit                     # read-only; reads native sources, writes snapshot/report
--verify                    # asserts invariants; exits non-zero on red
--json                      # machine-readable output to stdout
--quiet                     # suppress non-JSON output
--instance <path>           # default infra/instances/staging.yaml
```

There is no `--apply` verb in the supported path (no converge engine). Not every
script implements every verb; `--help` says which it supports. Verifier scripts
always implement `--json`.

## Inputs

- Read site/project/actor/env from `infra/instances/<name>.yaml` (default: staging).
- Read env vars for secrets only (documented `ATLASSIAN_TOKEN`). Missing secret →
  exit code 3.
- Never read from stdin. Never prompt.
- Never read undocumented credential stores or internal config blobs beyond the
  CLIs that are already authenticated.

## Outputs

- Human output to stderr; machine output to stdout.
- Every script writes a JSON report under a deterministic path:
  - audit: `evidence/audit/<name>.json`
  - snapshot: `evidence/snapshot/<name>.json`
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
    "t_nih_07": "native-wrapper | documented-API-gap | Twin-specific",
    "native_source": "acli jira field list --json | forge install list --json | <documented REST GET>",
    "summary": "...",
    "data": { ... }
  }
  ```
  `t_nih_07` and `native_source` mirror the header label and the source actually
  read, so evidence is self-describing about which native surface produced it.

## Exit codes (standardised)

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| 0    | Success                                              |
| 1    | Generic failure with diagnostics in stderr           |
| 2    | Validation / assertion failed (verifier)             |
| 3    | Missing credential, env var, or CLI auth             |
| 4    | Target environment mismatch (safety refusal)         |
| 5    | Platform capability missing (no documented REST/CLI) |
| 10+  | Category-specific; document in the script's --help   |

Exit 5 is the required outcome when only a private/internal endpoint could
satisfy the request; the script writes a blocker file instead of using it.

## Idempotency / determinism

- Audit and snapshot scripts are read-only and safe to re-run; re-running against
  unchanged native state produces an identical snapshot/report (modulo
  `generated_at`/`git_sha`).
- No supported script deletes or mutates Jira/Forge resources. Mutating native
  operations (ACLI writes, template clone, Forge deploy/install, Automation
  import) are run by an operator/CI using native tooling, gated by the safety
  rails below — never by a repo converge engine.

## Safety rails baked in

Any script that could *invoke* a native mutation (e.g. an ACLI write wrapper or a
seed upsert) must:

1. Call `assertStagingOnly()` from `scripts/lib/safety.ts` before invoking the
   native command. That helper verifies `infra/instances/<name>.yaml`.`site`
   equals `myhealthcaresite.atlassian.net` and `forgeEnv` equals `development`;
   exits code 4 otherwise.
2. Refuse to invoke any operation on resources tagged
   `policy: human-approval-required` without `AIGO_HUMAN_APPROVED=<task-id>`.
3. Never enable a Jira Automation rule; rules stay disabled until a native
   audit-log capture (VM-AUTOMATION-AUDIT) is green, and enablement is a separate
   human-gated native step (safety contract, `_CONVENTIONS.md` §5).

## No network in unit tests

`tests/**` under `npm test` must not call Jira or Forge. Network-using tests live
under `tests/integration/`, must be tagged `staging-only`, refuse to run unless
`AIGO_ALLOW_INTEGRATION=1`, and use the same `scripts/lib/` clients as production
scripts.

## Logging & reproducibility

- Every script logs the full resolved config (secrets redacted) to stderr on
  startup, including its `t_nih_07` label and `native_source`.
- Re-running with the same inputs produces the same report modulo `generated_at`
  and `git_sha`.

## Top-level `package.json` scripts

These npm scripts are the **only** entrypoints humans and CI run:

```json
{
  "scripts": {
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:integration": "AIGO_ALLOW_INTEGRATION=1 vitest run tests/integration",
    "test:safety": "vitest run tests/safety",

    "audit": "node scripts/audit/run-all.mjs",
    "snapshot": "node scripts/snapshot/run-all.mjs",

    "infra:verify": "node scripts/verify/run-all.mjs",

    "rovo:invoke-all": "node scripts/invoke/run-all.mjs",

    "lint": "tsc --noEmit && eslint .",

    "forge:deploy": "forge deploy -e development",
    "forge:install": "forge install --upgrade -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes",
    "forge:lint": "forge lint"
  }
}
```

There is no `infra:apply` entrypoint — mutations go through native tooling, not a
repo converge command (theme #3). If any of these scripts does not exist yet,
creating it is a remediation task (see `TASK_BOARD.md`).

## No hand-written evidence

Helpers in `scripts/lib/report.mjs` produce the standard JSON envelope (including
`t_nih_07` and `native_source`) and a sibling Markdown summary. Markdown under
`evidence/` must be generated by this helper, not hand-edited. The `TaskCompleted`
hook rejects `evidence/**/*.md` without a `generated_by:` front-matter.
