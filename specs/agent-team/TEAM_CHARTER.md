# Team Charter

## Composition

Seven teammates + one lead. Names are stable so the human operator and
teammates can address each other predictably. The lead **must** spawn them
with these exact names.

| Name              | Role                                | Primary files & surfaces                                                                                   |
| ----------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lead`            | Team lead (the session you opened)  | Task list, mailboxes, evidence index, CI/CD orchestration, human-facing status reports                     |
| `architect`       | System architect / planner          | `specs/*`, `docs/*`, `manifest.yml` (schema), `CLAUDE.md`, cross-cutting design decisions                   |
| `forge-engineer`  | Forge + TypeScript builder          | `src/`, `index.ts`, `tests/`, `tsconfig.json`, `package.json`, `manifest.yml` module wiring                 |
| `jira-admin`      | Jira product configurator           | Jira REST/ACLI calls, issue types, workflows, screens, fields, queues, filters, dashboards, project setup   |
| `automation-eng`  | Jira Automation + prompts           | `automation/**`, `prompts/**`, `policies/**`, per-instance rule rendering                                   |
| `qa-verifier`     | Tester + evidence collector         | `tests/**`, `evidence/**`, smoke/readiness scripts, live Jira/Rovo manual validation                        |
| `safety-reviewer` | Adversary / safety + claims auditor | Reviews every PR-equivalent diff, every prompt change, and every Automation rule for safety-contract drift |
| `docs-writer`     | Docs + runbook editor               | `docs/**`, `README.md`, CHANGELOG, release checklist, troubleshooting                                       |

Rationale for seven: the original repo cleanly splits into code, Jira admin,
automation/prompts, verification, safety, and docs. Seven teammates keep
~5–6 tasks per worker across ~40 live tasks, which matches the Claude Code
agent-teams guidance.

## Models

- `lead`: whatever the operator opened the session with (Opus/Sonnet fine).
- `architect`, `safety-reviewer`: **Opus-tier** (or the leader's model);
  these roles do most of the reasoning.
- `forge-engineer`, `jira-admin`, `automation-eng`, `qa-verifier`,
  `docs-writer`: Sonnet (Default teammate model).

If the operator's `/config` shows something different, the lead should
respect it but log the choice in `evidence/team-config.md`.

## Display mode

`auto` (tmux split panes if the operator is in tmux or iTerm2; in-process
otherwise). The lead does **not** force a mode.

## Permission boundaries (who may edit what)

The shared task list should tag every task `[owner:<name>]`. Only the owner
(or the lead, by reassignment) commits code to the files listed in the
Composition table. When two teammates *must* edit the same file, they:

1. Post a `#coord:<filename>` message to both mailboxes.
2. Whoever holds the lock edits first, commits, and releases via a follow-up
   message.
3. The second teammate rebases on the fresh HEAD before editing.

## How teammates talk

- **Direct mailbox** for synchronous questions (`@jira-admin` etc.).
- **Task list** for work state. Comments on a task are the audit trail.
- **`evidence/`** tree for durable artefacts (logs, screenshots, run notes).
- **`STATUS.md`** at the repo root: the lead updates every ~20 minutes with
  the current milestone, the top three risks, and the three most recent
  completions. This is the file the human operator reads when they check in.

## Parallel-work rules (to keep merges clean)

- **Code split:** `forge-engineer` owns `src/`, `tests/`, `index.ts`.
  `automation-eng` owns `automation/` and `prompts/`. `docs-writer` owns
  `docs/` and `README.md`. `architect` owns `specs/`. `jira-admin` owns
  `instances/`, `scripts/` that touch Jira REST, and Jira-side configuration
  (which lives outside git). `safety-reviewer` and `qa-verifier` own
  `policies/` and `tests/` jointly (review vs. write).
- **Manifest editing:** only `forge-engineer` edits `manifest.yml`. Other
  teammates request changes via mailbox; `forge-engineer` batches edits.
- **One commit per task** (or per small cluster of related tasks). No
  "kitchen sink" commits. Commit messages reference the task id.
- **Never squash away another teammate's commits.** Rebase-forward only.

## When to spawn or shut down teammates

The lead may spawn *extra* short-lived teammates for:

- a bounded Terraform provider spike (see Outcome Platform tasks), named
  `tf-spike`, in a branch, cleaned up when the spike concludes.
- parallel prompt A/B evaluation when a prompt regresses, named
  `prompt-eval`, cleaned up when a decision lands.

The lead shuts down any teammate that has had no productive turn for
30 minutes **and** has no open tasks, after posting their closing summary.
Role-owner teammates (the seven above) are never shut down while the mission
is active.

## Plan-approval gates (enforced by the lead)

For the following task classes, the owning teammate **must** submit a plan
for lead approval *before* implementation (see Claude Code "plan mode"):

- Any Jira mutation that changes workflow schemes, deletes statuses, or
  reassigns seed issue types.
- Any change to `manifest.yml` that adds/removes a Rovo agent or a scope.
- Any change to a prompt file that alters the safety contract language.
- Enabling a previously-disabled Jira Automation rule.
- Merging a PR-equivalent commit that touches `policies/`.

Approval criteria the lead uses:

- Plan names the exact file paths and Jira resources affected.
- Plan lists the exact verification commands from
  `VERIFICATION_MATRIX.md`.
- Plan includes a rollback step.
- Plan confirms no safety-contract violation.
- `safety-reviewer` has messaged `approve` or has not objected for
  10 minutes of active team time.

Reject plans that modify the database schema, disable tests, lower coverage,
skip CI, or broaden Forge scopes.
