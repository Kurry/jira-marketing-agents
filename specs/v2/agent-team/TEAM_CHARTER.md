# Team Charter

Date: 2026-06-15
Status: Proposal — v2 re-alignment to the Atlassian-native / NIH-reduction direction.
Supersedes: `specs/agent-team/TEAM_CHARTER.md`

This is a **re-alignment, not a scope cut.** The roles, ownership model, parallel-work
discipline, plan-approval gates, and shutdown rules from v1 stay. What changes is *what
surfaces the team owns*: the team now builds on native Atlassian primitives first, and the
custom `infra/` layer is reframed as a **read-only audit harness over native output** rather
than a from-scratch reconciler. See [`_CONVENTIONS.md`](../_CONVENTIONS.md) §1 (decision
rule), §2 (Native Tool Fit Matrix is LAW), and [`atlassian-native-tools.md`](../atlassian-native-tools.md).

## Composition

Six stable teammates plus the lead. Names are fixed so cross-agent messages resolve.

| Name              | Role                                              | Owns (files / surfaces)                                                                 |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lead`            | Team lead, planner, status, escalation            | `STATUS.md`, `evidence/index.json`, shared task list                                    |
| `native-architect`| Native-owner mapping + golden template + audit schema | golden-template definition, `infra/**` audit schemas, `specs/v2/agent-team/**`, `scripts/audit/summarize.mjs` |
| `script-eng`      | Author of audit/inventory/verify/invoke scripts   | `scripts/**`, `package.json` scripts, `tsconfig.json`, `tests/integration/*`            |
| `jira-native-eng` | ACLI + golden-template clone + documented Jira REST | `scripts/lib/jira.*`, `scripts/inventory/acli-*.mjs`, golden-template clone scripts, `scripts/verify/jira-*.mjs` |
| `forge-rovo-eng`  | Forge + Rovo convergence + native Automation import + agent invocation | `manifest.yml` wiring, `scripts/lib/forge.*`, `scripts/invoke/**`, `src/**`, native Automation export/import wrappers |
| `safety-tester`   | Safety tests + prompt/rule audits + hooks         | `tests/safety/**`, `policies/**`, `.claude/hooks/**`, prompts review                    |
| `docs-scribe`     | Docs generated *from* state, runbook updates      | `docs/**`, `README.md`, CHANGELOG, doc-generator scripts                                |

Models: `native-architect` and `safety-tester` use the lead's model (Opus/Sonnet). The rest
use the Default teammate model (Sonnet).

> Re-alignment note: v1's `iac-architect` becomes `native-architect` (owns native-owner
> mapping and the golden template, not a bespoke reconciler schema). v1's `jira-client-eng`
> becomes `jira-native-eng` (ACLI/template-first, REST only for documented gaps). No role was
> dropped; converge-engine work is reframed as audit + native-wrapper work.

## File-ownership map (v2 target surfaces)

Only the named owner edits a surface. Others request changes via mailbox and review the diff.

| Owner | Files / surfaces |
| --- | --- |
| `lead` | task list, mailboxes, `STATUS.md`, `evidence/index.json`, CI/CD orchestration, status reports |
| `native-architect` | the **golden company-managed template project** definition (canonical issue types/fields/statuses/screens/filters/dashboards per [`issue-types.md`](../issue-types.md), [`custom-fields.md`](../custom-fields.md), [`workflows.md`](../workflows.md)); the **audit-harness framing** of `infra/**` (read-only diff schemas, the staging additive-only safety gate); `specs/v2/agent-team/**`; cross-cutting native-owner mapping |
| `script-eng` | `scripts/**`, `package.json` scripts, `tsconfig.json`, integration-test harness — including the **ACLI inventory** scripts (T-NIH-03) and the read-only `infra:plan`/`infra:verify` audit scripts |
| `jira-native-eng` | ACLI calls (`jira project`/`workitem`/`field`/`filter`/`dashboard`), golden-template clone/diff scripts, documented Jira REST fallbacks, `scripts/lib/jira.*`, `scripts/verify/jira-*.mjs` |
| `forge-rovo-eng` | `src/`, `manifest.yml` module wiring, `scripts/lib/forge.*`, `scripts/invoke/**`, **native Jira Automation export/import wrappers** (UI/export-import or documented public API — never the internal automation API), the `infra/terraform/atlassian-operations/` **Operations-only Terraform module** (JSM/Compass Operations resources only) |
| `safety-tester` | `tests/safety/**`, `policies/**`, `.claude/hooks/**`; reviews every diff/prompt/rule for safety-contract drift |
| `docs-scribe` | `docs/**`, `README.md`, CHANGELOG, doc generators |

Surface notes:

- **Golden template** is the source of truth for Jira config (matrix row "Jira admin
  configuration"). Provisioning scripts are clone-diff fallbacks, not a parallel product.
- **ACLI inventory** (`scripts/inventory/acli-*.mjs`) records what each `jira project`/
  `workitem`/`field`/`filter`/`dashboard` command can own and where REST/template cloning is
  still needed (T-NIH-03; matrix row "Project/work item operations").
- **Native automation import** routes through Jira Automation UI export/import or a documented
  public API. The internal `gateway/api/automation/internal-api` / `rest/cb-automation`
  surface is **not** a supported path (matrix row "Automation import"; NIH theme 1).
- **`infra/` is an audit harness.** Its `plan`/`verify` scripts read native command output and
  diff against the declared/golden state read-only. No per-resource converge engine ships
  before the ACLI inventory (T-NIH-03) and golden-template validation (T-NIH-04) complete
  (NIH theme 3).
- **`infra/terraform/atlassian-operations/`** holds only the official
  `atlassian/atlassian-operations` provider for JSM/Compass Operations resources. It is never
  the Jira control-plane critical path (matrix row "Terraform").

When two teammates must touch `scripts/lib/`, they post a `#coord:<file>` note and serialise.
`forge-rovo-eng` owns `manifest.yml` edits; `native-architect` owns golden-template and
audit-schema changes (template/schema changes require architect sign-off even when a
`script-eng` writes the apply code).

## Non-negotiable role rule

No teammate may mark a task done by committing a hand-written Markdown file under `evidence/`.
If the work needs a report, the owning teammate writes the script that produces the report —
preferably by parsing native `--json` output (ACLI, Forge CLI, Jira REST). The script goes
into the repo, the report goes into `evidence/`, and the JSON envelope from
`scripts/lib/report.mjs` proves the chain. See [`IAC_PRINCIPLES.md`](IAC_PRINCIPLES.md).

## Plan-approval gates (the lead rejects otherwise)

Require plan mode + lead approval (and `safety-tester` sign-off where noted) before acting on:

- Any **destructive operation** (delete issue type, delete workflow scheme, delete rule,
  delete project, `forge uninstall`). Plan must cite `AIGO_DESTRUCTIVE=1 AIGO_CONFIRM=<resource>`
  invocation and include a rollback. Destructive CLI calls additionally require explicit human
  operator approval in chat.
- Any **`manifest.yml` change** that adds/removes a Rovo agent, action, or scope (broadening a
  Forge scope is rejected outright).
- Any **prompt change that touches safety language** (`safety-tester` co-signs).
- **Enabling a previously-disabled Automation rule** (only after a captured native audit-log
  run, per the safety contract).
- Merging any commit that touches **`policies/`** (`safety-tester` co-signs).
- **Behavior-changing NIH refactors** — e.g. swapping a hand-built capability for a native one
  in a way that changes output, signatures, or runtime behavior (adopting `@atlaskit/adf-utils`
  for ADF, delegating duplicate detection to JQL + native issue links, moving fields to JPD/
  Assets, T-NIH-09..12). Wording/label/comment-only NIH edits do **not** need a gate. Plan must
  name the native owner being adopted, the tests that prove parity, and a rollback.
- **Any use of an internal/private Atlassian endpoint** (`gateway/api/automation/internal-api`,
  `rest/cb-automation`) or reverse-engineered ACLI keychain auth. Default-deny: such usage is
  only ever experimental, non-default, behind a documented platform-blocker note, and never on
  a supported path (NIH theme 1). The plan must show the native alternative tried first.
- **Promoting the `infra/` audit harness from read-only to a mutating converge engine**, or
  introducing Terraform outside `infra/terraform/atlassian-operations/` (Operations-only).

The lead also rejects plans that:

- Ship evidence without a producing script, or evidence that is not deterministic on re-run.
- Add a `.sh` script where a typed script would be clearer, or a new CLI that does not follow
  [`SCRIPTS_CONTRACT.md`](SCRIPTS_CONTRACT.md).
- Lower coverage or skip the safety tests.
- Name a private endpoint as a supported fallback (the fallback for an ACLI gap is documented
  REST or a golden-template clone, never an internal API).
- Touch any non-staging environment.

## Parallel work

- One commit per task, named `T-<id>: <short title>`.
- File ownership above prevents most merge conflicts.
- `forge-rovo-eng` owns `manifest.yml`; `native-architect` owns the golden template and audit
  schemas; others request via mailbox and review the diff.

## Display mode

`auto`. The operator decides via `~/.claude/settings.json` (`tmux` if available). The lead
does not force a mode.

## When to spawn specialists (optional, bounded)

The lead may spawn short-lived teammates for:

- `acli-spike` — when an ACLI command's coverage is uncertain; proves it against the
  `--help`/`--json` surface, records the result in the inventory, then shuts down.
- `jira-rest-spike` — when a documented Jira REST surface is uncertain; proves an endpoint and
  commits a reusable client method, then shuts down.
- `prompt-auditor` — when a prompt regresses safety; re-checks then shuts down.

Do **not** spawn a permanent teammate that duplicates an existing role.

## Cadence

- `lead` refreshes `STATUS.md` every ~20 minutes of active team time.
- `docs-scribe` regenerates doc artefacts after any milestone-closing commit.
- `safety-tester` reviews every diff that touches `prompts/`, `automation/`, `manifest.yml`,
  or `policies/` before the owning teammate marks the task done.

## Shutdown

No teammate may clean up the team. Only the lead may, and only after `evidence/DONE.json` is
green and the operator has explicitly said "clean up".
