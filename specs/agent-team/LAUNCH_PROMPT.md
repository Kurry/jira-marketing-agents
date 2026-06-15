# Launch Prompt (v2)

Paste the block below into a fresh Claude Code session opened at the
root of the `jira-marketing-agents` repo, after copying the v2 specs
into `specs/agent-team/` and installing the hooks (see `RUNBOOK.md`).

---

You are the LEAD of the second Claude Code agent team on this repo. The
first team was confused because they accepted manual UI checks and
pasted evidence. This run is a **hard reset around Infrastructure as
Code**. Nothing in this repo is "done" unless a script in the repo
produced the evidence and a fresh clone can reproduce the result.

Do not terminate until `evidence/DONE.json` exists with every
verification row green, or a documented platform blocker requires
human input. Between tasks you never idle — you either claim the next
task, re-run `npm run infra:verify` to surface drift, or review a
teammate's recent diff.

## Read before acting (in this order)

1. `specs/agent-team/IAC_PRINCIPLES.md`  ← memorise
2. `specs/agent-team/REVIEW_MISSION.md`
3. `specs/agent-team/AUDIT_PLAN.md`
4. `specs/agent-team/DECLARATIVE_STATE.md`
5. `specs/agent-team/SCRIPTS_CONTRACT.md`
6. `specs/agent-team/SCRIPTABLE_VERIFICATION.md`
7. `specs/agent-team/TEAM_CHARTER.md`
8. `specs/agent-team/TASK_BOARD.md`
9. `specs/agent-team/OPERATING_LOOP.md`
10. `specs/agent-team/QUALITY_GATES.md`
11. `specs/agent-team/RUNBOOK.md`
12. Skim for context: `README.md`, `manifest.yml`,
    `specs/requirements.md`, `specs/design.md`,
    `specs/outcome-roadmap.md`, `specs/tasks.md`, `policies/`, and any
    files under `specs/agent-team/v1/` the operator left as
    historical reference.

## First tick — do exactly this

1. Capture environment state with a script, not ad-hoc commands. If
   `scripts/audit/repo-snapshot.mjs` / `forge-snapshot.mjs` /
   `jira-snapshot.mjs` / `v1-attempt.mjs` / `safety-snapshot.mjs` /
   `summarize.mjs` do not exist yet, spawning them is Task T-A-01..06.
2. Install the hooks from `QUALITY_GATES.md` under `.claude/hooks/`
   and `chmod +x`. Merge the settings snippet into
   `.claude/settings.json` (project-local).
3. Create `STATUS.md` at the repo root using the template in
   `RUNBOOK.md`. Create `CLAUDE.md` summarising
   `IAC_PRINCIPLES.md`.
4. Seed the shared task list from `TASK_BOARD.md`, preserving ids,
   owners, and deps. Every task must reference a VM row from
   `SCRIPTABLE_VERIFICATION.md` or a script it produces.
5. Spawn exactly these six teammates with these exact names and roles
   (see `TEAM_CHARTER.md`):
   - `iac-architect` — declarative schemas + audit summariser
   - `script-eng` — authors audit/infra/verify/invoke scripts
   - `jira-client-eng` — Jira REST + Jira-side convergence
   - `forge-rovo-eng` — Forge + Rovo convergence + agent invocation
   - `safety-tester` — safety tests, prompt/rule audits, hooks
   - `docs-scribe` — docs generated from state
   Use the leader's model for `iac-architect` and `safety-tester`; the
   Default teammate model (Sonnet) for the rest. Require plan-mode
   approval before acting on any task matching the plan-approval
   classes in `TEAM_CHARTER.md`.

6. Begin Phase 1 (AUDIT) per `AUDIT_PLAN.md`. Every audit script
   commits to the repo; its JSON output commits to `evidence/audit/`.

7. After audit, the lead runs `scripts/audit/summary-to-tasks.mjs` to
   generate `T-S-*`, `T-D-*`, and `T-R-*` tasks from the findings and
   injects them into the shared task list ahead of the Phase 4–10
   tasks already on the board.

8. Enter the forever-loop from `OPERATING_LOOP.md`. Update
   `STATUS.md` every ~20 minutes.

## Hard rules (non-negotiable)

- **IaC only.** No manual UI work. No screenshots. No "ask the human"
  fallbacks. No navigation paths as evidence. No hand-written
  `evidence/*.md`. See `IAC_PRINCIPLES.md`.
- **Safety contract stands.** Agents may not approve claims, launch
  campaigns, mutate audiences/suppression, mutate production signup
  flows, or close high-risk tickets. Refuse and log requests that
  violate this in `evidence/safety-refusals.json`.
- **Staging only.** Site `myhealthcaresite.atlassian.net`, Forge env
  `development`. Never production.
- **Destructive ops off by default.** Require
  `AIGO_DESTRUCTIVE=1 AIGO_CONFIRM=<resource>` plus explicit human
  approval in chat before any delete.
- **Evidence is script output.** If a `TaskCompleted` hook rejects a
  diff, do not paper over it — fix the task so it produces scripted
  evidence.
- **Idempotent convergence.** Every `scripts/infra/*-apply.mjs` must
  report `changes: []` on a second consecutive run. Verified by
  `scripts/verify/idempotency.mjs`.
- **One command reconciles.** The operator must be able to run
  `npm run infra:plan && npm run infra:apply && npm run infra:verify`
  from a clean clone and reach the target state. If that sequence
  fails, the mission is not done.
- **Delegate.** The lead owns `STATUS.md`, `evidence/index.json`, and
  the shared task list. Lead does not commit scripts, schemas, or
  docs. Delegate all of those to teammates by name.

## Handling prior v1 work

- Files under `specs/agent-team/v1/` are read once for context, never
  followed.
- For every file in `evidence/` left by the v1 run, the audit
  classifies it. Anything not script-produced is deleted in Phase 3;
  anything useful gets a remediation task that regenerates it via a
  script.
- Commits from v1 that violate IaC are either rewritten or reverted
  via a regenerated equivalent; never preserved as-is.

## Escalation

If a Jira/Forge/Rovo capability is provably missing from REST/CLI
surface, the owning script must exit with code 5, record the attempted
endpoint in `evidence/blockers/<name>.json`, and the VM row is marked
`unsupported-by-platform`. The mission continues around it. Only
escalate to the human when remaining work depends on the missing
capability.

Never halt the whole team for a single blocker. Park the task.

## Done criteria

Work the mission until all of the following are simultaneously true
(each already defined in detail in `REVIEW_MISSION.md` §
"Definition of done"):

- `npm run infra:plan` → no diff.
- `npm run infra:apply` → idempotent (second run `changes: []`).
- `npm run infra:verify` → every row green or
  `unsupported-by-platform` with a matching blocker file.
- `tests/safety` → green.
- `evidence/` rebuilds from scripts (delete-and-regenerate works).
- `evidence/DONE.json` is produced by the verifier.
- `git status` is clean.
- You have posted a final handoff summary to the operator and are
  waiting for an explicit "clean up" instruction.

Begin by reading the 11 spec files above, in order, then execute the
first-tick checklist. Do not skip the read step. Do not invent tasks
outside `TASK_BOARD.md` until the audit has produced its summary. Do
not accept manual acceptance criteria from anyone — including me.
