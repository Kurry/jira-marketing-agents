# Team Charter (v2 — IaC remediation)

## Composition

Six stable teammates plus the lead. Names are fixed so cross-agent
messages resolve.

| Name              | Role                                          | Owns (files)                                                                 |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| `lead`            | Team lead, planner, status, escalation        | `STATUS.md`, `evidence/index.json`, shared task list                         |
| `iac-architect`   | Declarative schema + audit summariser         | `infra/**` schemas, `specs/agent-team/**`, `scripts/audit/summarize.mjs`     |
| `script-eng`      | Author of audit/infra/verify/invoke scripts   | `scripts/**`, `package.json` scripts, `tsconfig.json`, `tests/integration/*` |
| `jira-client-eng` | Jira REST client + converge logic             | `scripts/lib/jira.*`, `scripts/infra/jira-*.mjs`, `scripts/verify/jira-*.mjs`|
| `forge-rovo-eng`  | Forge + Rovo convergence + agent invocation   | `manifest.yml` wiring, `scripts/lib/forge.*`, `scripts/invoke/**`, `src/**`  |
| `safety-tester`   | Safety tests + prompt/rule audits + hooks     | `tests/safety/**`, `policies/**`, `.claude/hooks/**`, prompts review         |
| `docs-scribe`     | Docs generated *from* state, runbook updates  | `docs/**`, `README.md`, CHANGELOG, doc-generator scripts                     |

Models: `iac-architect` and `safety-tester` use the lead's model
(Opus/Sonnet). The rest use the Default teammate model (Sonnet).

## Non-negotiable role rule

No teammate may mark a task done by committing a hand-written Markdown
file under `evidence/`. If the work needs a report, the owning teammate
writes the script that produces the report. The script goes into the
repo, the report goes into `evidence/`, and the JSON envelope from
`scripts/lib/report.mjs` proves the chain.

## Parallel work

- One commit per task, named `T-<id>: <short title>`.
- File ownership above prevents most merge conflicts. When two
  teammates must touch `scripts/lib/`, they post a `#coord:<file>` note
  and serialise.
- `forge-rovo-eng` owns `manifest.yml` edits; others request via
  mailbox and review the diff.
- `iac-architect` owns schema changes; changes to `infra/**.yaml`
  schema require architect sign-off even if a script-eng is writing
  the apply code.

## Plan-approval gates (the lead rejects otherwise)

Require plan mode + lead approval before acting on:

- Any destructive operation (delete issue type, delete workflow
  scheme, delete rule, delete project, `forge uninstall`). Plan must
  explicitly cite `AIGO_DESTRUCTIVE=1` + `AIGO_CONFIRM=<resource>`
  invocation, and include a rollback.
- Any `manifest.yml` change that adds/removes a Rovo agent, action, or
  scope.
- Any prompt change that touches safety language.
- Enabling a previously disabled Automation rule.

The lead rejects plans that:

- Ship evidence without a producing script.
- Add a `.sh` script where a typed script would be clearer.
- Lower coverage or skip the safety tests.
- Add a new CLI that does not follow `SCRIPTS_CONTRACT.md`.
- Broaden Forge scopes.
- Touch any non-staging environment.

## Display mode

`auto`. The operator decides via `~/.claude/settings.json` (`tmux` if
available). The lead does not force a mode.

## When to spawn specialists (optional, bounded)

The lead may spawn short-lived teammates for:

- `jira-rest-spike` — when a Jira REST surface is uncertain; proves an
  endpoint and commits a reusable client method, then shuts down.
- `prompt-auditor` — when a prompt regresses safety; re-checks then
  shuts down.

Do **not** spawn a permanent teammate that duplicates an existing
role.

## Cadence

- `lead` refreshes `STATUS.md` every ~20 minutes of active team time.
- `docs-scribe` regenerates doc artefacts after any milestone-closing
  commit.
- `safety-tester` reviews every diff that touches `prompts/`,
  `automation/`, `manifest.yml`, or `policies/` before the owning
  teammate marks the task done.

## Shutdown

No teammate may clean up the team. Only the lead may, and only after
`evidence/DONE.json` is green and the operator has explicitly said
"clean up".
