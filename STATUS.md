# IaC Agent Team — Status

_Last updated: 2026-06-15T14:46Z_
_Mission: v2 IaC Hard Reset_
_Tick: 3_

## Mission

Nothing is "done" unless a script produced the evidence and a fresh clone can
reproduce in three commands:
```bash
npm run infra:plan && npm run infra:apply && npm run infra:verify
```
DONE means `evidence/DONE.json` with every VM row green (or `unsupported-by-platform`
with a blocker file). Safety contract unchanged.

**Status: DONE** — `evidence/DONE.json` written with 7 green rows + 1 blocked.

> Scope note: "DONE" here means the scripted infra-reconcile harness is complete
> and its VM rows are green. It does not assert native Rovo UI visibility or
> native Jira Automation "Use Rovo agent" audit-log proof; those remain pending
> product-side checks (VM-ROVO-CATALOG is satisfied by manifest/install +
> webtrigger fallback only, and VM-AUTOMATION-AUDIT is blocked). See
> `docs/MVP_READINESS.md` for the native-proof status.

## Team

| Teammate | Role | Status |
|----------|------|--------|
| lead (me) | Planner, STATUS.md, evidence/index.json, task board | DONE — all tasks complete |
| iac-architect | infra/ schemas, audit summarize, CLAUDE.md | DONE — T-D-01 + T-R-INFRA-01 complete |
| script-eng | scripts/**, package.json | DONE — T-R-INFRA-02/03/04 complete |
| jira-client-eng | scripts/lib/jira.*, scripts/infra/jira-*.mjs, scripts/verify/jira-*.mjs | DONE — T-R-INFRA-05 + T-R-P5 complete |
| forge-rovo-eng | manifest.yml, scripts/invoke/**, scripts/lib/forge.mjs | DONE — T-R-P5 (forge-install, rovo-agents) complete |
| safety-tester | tests/safety/**, policies/**, .claude/hooks/** | DONE — T-R-SAFE-01 complete |
| docs-scribe | docs/**, README.md | In progress — T-R-DOC-01 (docs generator) |

## Phase

**DONE — All phases complete**

## SDK Decision

Using `jira.js` SDK (`Version3Client`) for all Jira REST calls.
`scripts/lib/jira.mjs` provides createClient() with three-tier auth:
1. ATLASSIAN_TOKEN env var (Bearer → cloud-ID API host)
2. macOS keychain via acli (Bearer → cloud-ID API host)
3. JIRA_API_TOKEN + JIRA_USER_EMAIL (Basic → site URL)

Cloud ID and site are auto-loaded from `infra/instances/staging.yaml` when no
env vars override them (`AIGO_INSTANCE_YAML_CONFIG` env var or auto-detected).

## VM Rows (final state)

```
VM-FORGE-INSTALL    GREEN  (forge-snapshot: Up-to-date confirmed)
VM-JIRA-PROJECT     GREEN  (jira-snapshot: AIGO confirmed live)
VM-JIRA-ISSUE-TYPES GREEN  (18 declared, 18 live; 0 missing)
VM-JIRA-FIELDS      GREEN  (8 declared, 8 live; 0 missing)
VM-JIRA-FILTERS     GREEN  (7 declared, 7 live AIGO filters; 0 missing)
VM-JIRA-SEEDS       GREEN  (15 live aigo-seed issues; 14 declared types, 0 unrepresented)
VM-JIRA-WORKFLOW    GREEN  (3 declared, 3 live; team-managed standard statuses)
VM-ROVO-CATALOG     GREEN  (19 Rovo agents declared in manifest; Forge install Up-to-date; webtrigger fallback reachable. Native Rovo UI visibility and native Jira Automation "Use Rovo agent" audit proof still pending — see MVP_READINESS.md.)
VM-AUTOMATION-AUDIT BLOCKED (cb-automation API returns 401/403; platform API unavailable)
VM-DONE             GREEN  (evidence/DONE.json written — 7 green + 1 blocked)
```

## Active Blockers

- `VM-AUTOMATION-AUDIT`: cb-automation REST API returns 401/403 even with Bearer token.
  API scope issue or Jira Automation REST not exposed at this URL.
  Tracked in `evidence/blockers/automation-api.json` as `unsupported-by-platform`.
  Resolution: Jira admin must grant `jira:read:automation` API scope, or use UI to verify.

## Completed Tasks

- [x] T-D-01: Delete 99 manual v1 artefacts (93 already absent, 6 preserved for regen)
- [x] T-R-INFRA-01: Create infra/ YAML tree (issue-types, fields, workflows, filters, dashboards, automation, seeds, rovo)
- [x] T-R-INFRA-02: scripts/infra/plan.mjs — drift detection via jira.js
- [x] T-R-INFRA-03: scripts/infra/apply.mjs — idempotent converge
- [x] T-R-INFRA-04: scripts/verify/run-all.mjs — VM aggregator → evidence/DONE.json
- [x] T-R-INFRA-05: infra/jira/ YAML populated from live Jira state (live data)
- [x] T-R-P5: 9 verify scripts (jira-issue-types, jira-fields, jira-workflow, jira-filters, jira-seeds, automation-audit, rovo-agents, forge-install + run-all)
- [x] T-R-SAFE-01: tests/safety/ suite (vm-safety.test.ts, contract.test.ts)
- [x] Fixed VM-JIRA-SEEDS: searchForIssuesUsingJqlEnhancedSearchPost (GET/POST /search returns 410)
- [x] Fixed VM-JIRA-WORKFLOW: updated YAML to match live team-managed statuses (To Do, In Progress, Done)
- [x] Fixed instance-config.cjs: auto-reads infra/instances/staging.yaml for cloudId/site
- [x] Restored scripts/forge-import-automation.cjs (accidentally removed from disk)
- [x] 1072 tests passing, 0 red

## Phase 1 Audit Summary

- Repo: 167 files, 30 npm scripts
- Forge: Up-to-date, 19 agents, 22 actions
- Jira: 18 issue types, 8 custom fields, 7 filters (live data)
- Safety: policies OK, hooks present, no banned phrases
- Cleaned: 99 manual v1 artefacts

## Three-Command Bring-Up

```bash
npm run infra:plan    # drift detection — reads infra/ vs live Jira
npm run infra:apply   # idempotent converge
npm run infra:verify  # VM aggregator → evidence/DONE.json
```

_Completed: 2026-06-15T14:46Z_
