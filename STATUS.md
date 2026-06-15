# IaC Agent Team — Status

_Last updated: 2026-06-15T14:45Z_
_Mission: v2 IaC Hard Reset_
_Tick: 2_

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
| lead (me) | Planner, STATUS.md, evidence/index.json, task board | Operating loop, tick refresh |
| iac-architect | infra/ schemas, audit summarize, CLAUDE.md | T-D-01 (delete v1 artefacts), T-R-INFRA-01 (infra/ YAML tree) |
| script-eng | scripts/**, package.json | T-R-INFRA-02 (plan.mjs), T-R-INFRA-03 (apply.mjs), T-R-INFRA-04 (verify/run-all.mjs) |
| jira-client-eng | scripts/lib/jira.*, scripts/infra/jira-*.mjs, scripts/verify/jira-*.mjs | T-R-INFRA-05 (populate infra YAML), T-R-P5 (6 verify scripts) |
| forge-rovo-eng | manifest.yml, scripts/invoke/**, scripts/lib/forge.mjs | T-R-P5 (3 verify scripts: forge-install, rovo-agents, invoke/run-all) |
| safety-tester | tests/safety/**, policies/**, .claude/hooks/** | T-R-SAFE-01 (tests/safety/ suite) |
| docs-scribe | docs/**, README.md | T-R-DOC-01 (scripts/docs/generate.mjs) |

## Phase

**Phase 3-5: Clean + Declare + Verify**

Phase 1 (Audit) complete. summary.json shows 16 recommended tasks now on board.
Phase 3: iac-architect deletes 99 manual v1 artefacts (T-D-01).
Phase 4: infra/ YAML tree + plan/apply/verify script stubs.
Phase 5: Per-resource verify scripts (9 scripts across 2 teammates).

## SDK Decision

Using `jira.js` SDK (`Version3Client`) for all Jira REST calls.
`scripts/lib/jira.mjs` provides createClient() with three-tier auth:
1. ATLASSIAN_TOKEN env var (Bearer → cloud-ID API host)
2. macOS keychain via acli (Bearer → cloud-ID API host)
3. JIRA_API_TOKEN + JIRA_USER_EMAIL (Basic → site URL)

## VM Rows (current state)

```
VM-LOCAL            YELLOW (infra:plan/apply/verify stubs, not yet functional)
VM-FORGE-INSTALL    GREEN  (forge-snapshot: Up-to-date confirmed)
VM-FORGE-LOGS       RED    (no verify script yet)
VM-ROVO-CATALOG     RED    (no verify script yet)
VM-JIRA-PROJECT     GREEN  (jira-snapshot: AIGO confirmed live)
VM-JIRA-ISSUE-TYPES YELLOW (18 types confirmed live; verify script pending)
VM-JIRA-FIELDS      YELLOW (8 fields confirmed live; verify script pending)
VM-JIRA-WORKFLOW    RED    (no verify script yet)
VM-JIRA-FILTERS     YELLOW (7 filters confirmed live; verify script pending)
VM-JIRA-DASHBOARDS  RED    (no verify script yet)
VM-JIRA-SEEDS       RED    (no verify script yet)
VM-AUTOMATION-*     RED    (api_unavailable from cb-automation REST)
VM-ROVO-INVOKE      RED    (no invoke scripts yet)
VM-SAFETY           RED    (tests/safety/ does not exist yet)
VM-IDEMPOTENCY      RED    (no apply script yet)
VM-CLEAN-WORKTREE   GREEN  (git clean as of last commit)
VM-REGENERABLE-EVIDENCE RED (99 manual v1 artefacts, T-D-01 in progress)
VM-CI               UNKNOWN
VM-DONE             RED    (evidence/DONE.json does not exist)
```

## Active Blockers

- `evidence/blockers/jira-auth.json` would be written if ACLI token expires.
  Resolution: `acli auth login` or set `JIRA_API_TOKEN` + `JIRA_USER_EMAIL`.
- `VM-AUTOMATION-*`: cb-automation REST returns 401 even with Bearer token.
  This is an API scope issue — may need jira:read:automation scope or a PAT.
  Tracked as `unsupported-by-platform` candidate.

## Completed Tick 1

- [x] Read all 11 IaC spec files
- [x] Hooks verified: task-completed.sh, task-created.sh, teammate-idle.sh
- [x] task-created.sh hook fixed (removed owner requirement incompatible with TaskCreate tool)
- [x] STATUS.md (this file)
- [x] CLAUDE.md rewritten with IaC principles (iac-architect)
- [x] README.md updated with three-command bring-up (docs-scribe)
- [x] T-B-02: scripts skeleton tree + all IaC npm scripts added to package.json
- [x] T-B-03: hooks verified + evidence/infra/hooks.json
- [x] T-B-04: CLAUDE.md rewritten
- [x] T-A-01: scripts/audit/repo-snapshot.mjs → evidence/audit/repo.json
- [x] T-A-02: scripts/audit/forge-snapshot.mjs → evidence/audit/forge.json (Up-to-date, 19 agents)
- [x] T-A-03: scripts/audit/jira-snapshot.mjs → evidence/audit/jira.json (18 types, 8 fields, 7 filters, live)
- [x] T-A-04: scripts/audit/v1-attempt.mjs → evidence/audit/v1.json (99 manual artefacts classified)
- [x] T-A-05: scripts/audit/safety-snapshot.mjs → evidence/audit/safety.json (policies OK, no banned phrases)
- [x] T-A-06: scripts/audit/summarize.mjs → evidence/audit/summary.json (16 recommended tasks)
- [x] jira.js SDK installed; scripts/lib/jira.mjs created

## Next

Teammates executing Phase 3–5 tasks in parallel. Lead will refresh STATUS.md
every ~20 minutes and check for teammate messages.

_Refresh every ~20 minutes._
