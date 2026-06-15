# Audit Plan (Phase 1)

The lead runs this plan at startup. Every step outputs a JSON artefact
under `evidence/audit/` and concludes with
`evidence/audit/summary.json`, which seeds the remediation task board.

All steps are commands or short scripts. None involve the UI.

## A1 — Snapshot the repo (`architect`)

```bash
node scripts/audit/repo-snapshot.mjs > evidence/audit/repo.json
```

The script (create it if missing) records:

- `git status --porcelain` (untracked, modified, staged).
- `git log --format='%H %s' -n 50`.
- File counts by directory: `src/`, `tests/`, `prompts/`, `automation/`,
  `scripts/`, `specs/`, `docs/`, `infra/` (if it exists), `evidence/`.
- Presence of expected IaC artefacts (see `DECLARATIVE_STATE.md`):
  mark each as `present` / `stub` / `missing`.
- For every file produced by v1 (anything added under `evidence/` or
  `specs/agent-team/v1/`), record its path and flag whether it looks
  script-generated (contains `"generated_by"` or `"command"` top-line)
  or hand-written.

## A2 — Snapshot Forge + Rovo (`forge-engineer`)

```bash
node scripts/audit/forge-snapshot.mjs > evidence/audit/forge.json
```

Records:

- `forge --version`, `forge whoami`.
- `forge install list` (parsed JSON).
- `forge lint --json` result (warnings and errors enumerated).
- `forge variables list -e development` (keys only; no values).
- Parsed `manifest.yml`: list of `rovo:agent.key`, `action.key`,
  `function.key`, `resource.key`, `permissions.scopes`.
- `forge logs -e development --since 2h --json`, filtered for handler
  errors and warnings.

## A3 — Snapshot Jira staging (`jira-admin`)

```bash
node scripts/audit/jira-snapshot.mjs \
  --site myhealthcaresite.atlassian.net \
  --project AIGO \
  > evidence/audit/jira.json
```

Records via Jira REST:

- Project metadata, lead, style (team-managed / company-managed).
- Issue types (id, name, description, hierarchy level).
- Custom fields (id, name, schema).
- Screens and screen schemes attached to the project.
- Workflow(s) and workflow scheme, statuses, transitions, conditions,
  validators, post-functions.
- Filters owned by the automation actor.
- Dashboards visible to the automation actor.
- Automation rules (id, name, enabled, trigger, actions summary).
- Seed issue enumeration: `project = AIGO AND labels = "aigo-seed"`,
  grouped by issue type.

All calls are read-only. Any 401/403/404 is recorded verbatim; the
script never prompts for credentials.

## A4 — Snapshot the v1 attempt (`architect`)

```bash
node scripts/audit/v1-attempt.mjs > evidence/audit/v1.json
```

Records, if v1 artefacts exist:

- Contents of `STATUS.md` (last tick, last reported milestone).
- Task list snapshot from `~/.claude/tasks/<team-name>/` if still
  present.
- Everything under `evidence/` from the v1 run with a classification
  per file: `iac-ok` | `manual-artifact` | `unclear`.
- Any commits on `main` since the first v1 tick, with a per-commit
  classification: `iac-ok` | `manual-artifact` | `to-rewrite` |
  `to-revert`.

## A5 — Snapshot the safety surface (`safety-reviewer`)

```bash
node scripts/audit/safety-snapshot.mjs > evidence/audit/safety.json
```

Records:

- Diff of `manifest.yml` scopes vs. the allowlist
  `[read:jira-work, write:jira-work, read:chat:rovo]`. Any extra scope
  becomes a must-revert finding.
- For every file in `prompts/`: regex scan for banned phrases
  (approve claims, launch now, send now, etc.). Report hits.
- For every file in `automation/rules/`: parse JSON; flag any action
  that could approve claims, send campaigns, or mutate audiences.
- For `policies/*.md`: hash + presence check; flag any unreferenced
  policy file.

## A6 — Unify into `audit/summary.json` (`architect` + `lead`)

```bash
node scripts/audit/summarize.mjs \
  evidence/audit/repo.json \
  evidence/audit/forge.json \
  evidence/audit/jira.json \
  evidence/audit/v1.json \
  evidence/audit/safety.json \
  > evidence/audit/summary.json
```

`summary.json` is a JSON document with, at minimum:

```json
{
  "generated_by": "scripts/audit/summarize.mjs",
  "generated_at": "<ISO>",
  "iac_posture": {
    "infra_dir_present": false,
    "infra_plan_cmd_present": false,
    "infra_apply_cmd_present": false,
    "infra_verify_cmd_present": false
  },
  "missing_scripts": ["scripts/infra/plan.mjs", "..."],
  "missing_declarations": ["infra/jira/issue-types.yaml", "..."],
  "manual_artifacts_to_delete": ["evidence/rovo/visibility.md", "..."],
  "commits_to_rewrite": ["<sha> <subject>", "..."],
  "jira_deltas": {
    "issue_types_missing": [],
    "fields_missing": [],
    "workflow_deltas": [],
    "filters_missing": [],
    "dashboards_missing": [],
    "automation_rules_missing_or_disabled_pending": []
  },
  "safety_findings": [],
  "forge_findings": [],
  "seed_deltas": {}
}
```

## A7 — Seed the remediation backlog (`lead`)

The lead then transforms `summary.json` into tasks by running:

```bash
node scripts/audit/summary-to-tasks.mjs \
  evidence/audit/summary.json \
  > evidence/audit/tasks.json
```

Every missing declaration, script, or verifier becomes a `T-R-*` task.
Every `manual_artifact_to_delete` becomes a `T-D-*` cleanup task.
Every `safety_finding` becomes a `T-S-*` task at highest priority.

The lead enqueues `T-S-*` before anything else, then `T-D-*`, then
`T-R-*` by dependency order from `TASK_BOARD.md`.

## Audit quality gate

Before Phase 2 (remediation) starts, the lead must confirm:

- All A1–A6 scripts ran and produced JSON.
- Every script the audit referenced but could not find now has a
  `T-R-*` task to create it.
- `STATUS.md` is updated with the audit snapshot counts.

If any audit script does not exist at startup, the lead spawns
`forge-engineer` or `architect` to write it before running Phase 1 on
that step. This is itself IaC: the audit scripts must live in the repo
so future runs are reproducible.
