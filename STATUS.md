# IaC Agent Team — Status

_Last updated: 2026-06-15T14:30Z_
_Mission: v2 IaC Hard Reset_
_Tick: 1_

## Mission

Nothing is "done" unless a script produced the evidence and a fresh clone can
reproduce in three commands:
```bash
npm run infra:plan && npm run infra:apply && npm run infra:verify
```
DONE means `evidence/DONE.json` with every VM row green (or `unsupported-by-platform`
with a blocker file). Safety contract unchanged.

## Team

| Teammate | Role | Current Task |
|----------|------|-------------|
| lead (me) | Planner, STATUS.md, evidence/index.json, task board | First tick setup; spawning teammates |
| iac-architect | infra/ schemas, audit summarize, CLAUDE.md | T-B-01 (verify spec copy), T-A-04 (v1-attempt.mjs), T-A-06 (summarize.mjs), CLAUDE.md rewrite |
| script-eng | scripts/**, package.json, scripts tree | T-B-02 (skeleton tree + npm scripts), T-A-01 (repo-snapshot.mjs) |
| jira-client-eng | scripts/lib/jira.*, scripts/infra/jira-*.mjs, scripts/verify/jira-*.mjs | T-A-03 (jira-snapshot.mjs) |
| forge-rovo-eng | manifest.yml, scripts/invoke/**, src/** | T-A-02 (forge-snapshot.mjs) |
| safety-tester | tests/safety/**, policies/**, .claude/hooks/** | T-B-03 (verify hooks), T-A-05 (safety-snapshot.mjs) |
| docs-scribe | docs/**, README.md | Observe Phase 1 audit; prepare for T-R-DOC-01 |

## Phase

**Phase 0–1: Bootstrap + Audit**

All audit scripts must be created (scripts commit to repo) before running. Each
writes JSON under `evidence/audit/`. After T-A-06, lead runs
`scripts/audit/summary-to-tasks.mjs` to inject T-S-*, T-D-*, T-R-* tasks.

## VM Rows (current state)

All rows RED — scripts and infra/ tree do not exist yet.

```
VM-LOCAL            RED  (npm scripts infra:plan/apply/verify missing)
VM-FORGE-INSTALL    RED  (no verify script)
VM-ROVO-CATALOG     RED  (no verify script)
VM-JIRA-PROJECT     RED  (no verify script)
VM-JIRA-ISSUE-TYPES RED  (no verify script)
VM-JIRA-FIELDS      RED  (no verify script)
VM-JIRA-WORKFLOW    RED  (no verify script)
VM-JIRA-FILTERS     RED  (no verify script)
VM-JIRA-DASHBOARDS  RED  (no verify script)
VM-JIRA-SEEDS       RED  (no verify script)
VM-AUTOMATION-*     RED  (no verify script)
VM-ROVO-INVOKE      RED  (no verify script)
VM-SAFETY           RED  (tests/safety/ does not exist)
VM-IDEMPOTENCY      RED  (no apply script)
VM-CLEAN-WORKTREE   YELLOW (git working tree has changes)
VM-REGENERABLE-EVIDENCE RED (evidence/*.md files have no generated_by header)
VM-CI               UNKNOWN
VM-DONE             RED  (evidence/DONE.json does not exist)
```

## Active Blockers

None yet — audit will surface real blockers.

## Completed This Tick

- [x] Read all 11 IaC spec files
- [x] Confirmed hooks installed (.claude/hooks/task-completed.sh, task-created.sh, teammate-idle.sh)
- [x] Settings wired (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, teammateMode=auto)
- [x] Written new STATUS.md (this file)
- [ ] CLAUDE.md rewrite (delegated to iac-architect)
- [ ] Spawn 6 teammates (in progress)
- [ ] Phase 1 audit scripts (delegated to team)

## Gap Summary (pre-audit)

- `infra/` does not exist
- `scripts/audit/`, `scripts/infra/`, `scripts/verify/`, `scripts/invoke/`, `scripts/lib/` do not exist
- npm scripts `infra:plan`, `infra:apply`, `infra:verify`, `audit`, `test:safety` are missing
- `evidence/audit/`, `evidence/verify/`, `evidence/blockers/`, `evidence/DONE.json` do not exist
- `tests/safety/` does not exist
- All existing `evidence/*.md` files lack `generated_by:` headers (v1 artefacts)

## Next

After all audit scripts run and T-A-06 completes, lead will:
1. Run `scripts/audit/summary-to-tasks.mjs` → inject T-S-*/T-D-*/T-R-* tasks
2. Assign Phase 4 tasks to teammates
3. Update STATUS.md

_Refresh every ~20 minutes._
