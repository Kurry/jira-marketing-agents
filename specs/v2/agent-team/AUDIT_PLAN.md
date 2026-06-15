# Audit Plan (Phase 1) — Read-Only, Native Sources Only

Date: 2026-06-15
Status: Proposal — re-alignment of the startup audit to the Atlassian-native / NIH-reduction refactor.
Supersedes: `specs/agent-team/AUDIT_PLAN.md` (v1 at `specs/agent-team/v1/AUDIT_PLAN.md`).

> Read first: [`_CONVENTIONS.md`](../_CONVENTIONS.md) (§1 decision rule, §3 the
> five NIH themes) and [`atlassian-native-tools.md`](../atlassian-native-tools.md).
> Companion docs: [`TASK_BOARD.md`](TASK_BOARD.md) (the audit seeds Phase 1),
> [`QUALITY_GATES.md`](QUALITY_GATES.md) (the gates the audit feeds),
> [`SCRIPTABLE_VERIFICATION.md`](SCRIPTABLE_VERIFICATION.md) (the proof rule the
> audit shares), [`AUDIT_PLAN.md`] outputs map to `T-A-*` on the board.

The lead runs this plan at startup. Every step outputs a JSON artefact under
`evidence/audit/` and concludes with `evidence/audit/summary.json`, which seeds
the remediation task board. All steps are commands or short scripts. **None
involves the UI, and none mutates anything.**

## The audit-source rule (NIH themes #1, #4)

> **The audit reads native sources only.** Every snapshot is built from
> documented native output: documented Forge CLI `--json` surfaces, ACLI
> `jira project/workitem/field/filter/dashboard` **list** commands with `--json`,
> documented Jira REST GET endpoints, and the **native Jira Automation audit
> log**. The same proof rule as [`SCRIPTABLE_VERIFICATION.md`](SCRIPTABLE_VERIFICATION.md).

The audit must **not** read from, nor treat as authoritative:

- Private/internal endpoints (`gateway/api/automation/internal-api`,
  `rest/cb-automation`) or reverse-engineered ACLI keychain auth (NIH theme #1).
  Auth uses the documented `ATLASSIAN_TOKEN` env var. If an audit step can only
  reach a surface through an internal endpoint, it records a **documented gap /
  blocker**, not a value.
- Human-formatted CLI tables (box-drawing / aligned columns) where a `--json`
  flag exists (T-NIH-13).
- Webtrigger round-trips presented as native Automation/Rovo proof. Webtrigger
  reachability, if recorded at all, is a **separate field** from native
  audit-log evidence and is labeled as fallback-only (NIH theme #4).

Any 401/403/404 or "no documented surface" is recorded verbatim and routed to a
blocker file; the script never prompts for credentials and never substitutes an
internal endpoint. A platform gap is data, not a failure to hide.

## A1 — Snapshot the repo (`native-architect`)

```bash
node scripts/audit/repo-snapshot.mjs > evidence/audit/repo.json
```

Records:

- `git status --porcelain` (untracked, modified, staged).
- `git log --format='%H %s' -n 50`.
- File counts by directory: `src/`, `tests/`, `prompts/`, `automation/`,
  `scripts/`, `specs/`, `docs/`, `infra/` (if it exists), `evidence/`.
- Presence of expected IaC artefacts (see [`DECLARATIVE_STATE.md`](DECLARATIVE_STATE.md)):
  mark each as `present` / `stub` / `missing`. **NIH theme #3:** "missing" is
  not automatically a gap to fill by building the bespoke `infra/` reconciler.
  For each missing artefact, first record whether a native owner (ACLI,
  golden-template clone, Forge manifest, documented REST) already covers the
  resource; only flag remediation work where no native surface exists.
- For every supported `scripts/*` entrypoint: the presence and value of its
  single **T-NIH-07 label** (native-wrapper / documented-api-gap /
  twin-specific). Unlabeled or multiply-labeled scripts become findings.
- For every v1-produced file (anything under `evidence/` or
  `specs/agent-team/v1/`), record its path and flag whether it looks
  script-generated (`generated_by` / `command` top-line) or hand-written.
- A scan of supported paths for internal-endpoint / keychain references
  (`gateway/api/automation/internal-api`, `rest/cb-automation`, keychain). Hits
  outside an `experimental`/`platform-blocker` context are findings (NIH #1).

## A2 — Snapshot Forge + Rovo (`forge-rovo-eng`)

```bash
node scripts/audit/forge-snapshot.mjs > evidence/audit/forge.json
```

Records, from documented Forge CLI `--json` output only (never box-drawing
tables — T-NIH-13):

- `forge --version`, `forge whoami`.
- `forge install list --json` (parsed JSON).
- `forge lint --json` (warnings and errors enumerated).
- `forge variables list -e development` (keys only; no values).
- Parsed `manifest.yml`: `rovo:agent.key`, `action.key`, `function.key`,
  `resource.key`, `permissions.scopes`.
- `forge logs -e development --since 2h --json`, filtered for handler
  errors/warnings.

**NIH theme #4:** this step records a **manifest/install check** — which agents
are declared and deployed — not a Rovo "visibility" claim. There is no public
Rovo agent listing API; UI visibility is a separate, product-gated row tracked
in [`VERIFICATION_MATRIX.md`](VERIFICATION_MATRIX.md), never asserted here as
"guaranteed visible."

## A3 — Snapshot Jira staging (`jira-native-eng`)

```bash
node scripts/audit/jira-snapshot.mjs \
  --site myhealthcaresite.atlassian.net \
  --project AIGO \
  > evidence/audit/jira.json
```

Records via **documented Jira REST GET / ACLI `--json`** only:

- Project metadata, lead, style (team-managed / company-managed). **NIH theme
  #2 / T-NIH-04:** explicitly record the style, since a company-managed project
  is required to be the golden-template clone source; flag if AIGO is
  team-managed/next-gen.
- Issue types (id, name, description, hierarchy level).
- Custom fields (id, name, schema). Flag fields that the target model moves to
  **JSM Assets** (segment/partner/service) or **JPD**
  (confidence/expected-lift/discovery) per T-NIH-11.
- Screens and screen schemes attached to the project.
- Workflow(s) and workflow scheme, statuses, transitions, conditions,
  validators, post-functions.
- Filters owned by the automation actor; dashboards visible to it.
- Automation rules (id, name, enabled, trigger, actions summary) via **native
  Jira Automation export or a documented public API** — never
  `gateway/api/automation/internal-api` / `rest/cb-automation` (NIH #1). If no
  documented read surface exists, record a blocker naming the missing endpoint.
- Seed enumeration: `project = AIGO AND labels = "aigo-seed"`, grouped by type,
  via ACLI `jira workitem search --jql ... --json`.

All calls are read-only. The script never prompts for credentials and never
falls back to an internal endpoint.

## A4 — Snapshot the v1 attempt (`native-architect`)

```bash
node scripts/audit/v1-attempt.mjs > evidence/audit/v1.json
```

Records, if v1 artefacts exist (this step reads the historical `v1/` archive and
is **marked experimental** — it is not a supported native path and never gates a
green row):

- Contents of `STATUS.md` (last tick, last reported milestone).
- Task-list snapshot from `~/.claude/tasks/<team-name>/` if still present.
- Everything under `evidence/` from the v1 run with a per-file classification:
  `iac-ok` | `manual-artifact` | `unclear`.
- Any commits on `main` since the first v1 tick, with a per-commit
  classification: `iac-ok` | `manual-artifact` | `to-rewrite` | `to-revert`.
- **NIH-specific flags:** any v1 artefact that (a) depended on an internal/
  private endpoint or keychain auth on a supported path, (b) presented
  webtrigger reachability as native Automation/Rovo proof, or (c) built a
  per-resource converge engine ahead of the ACLI inventory (T-NIH-03) /
  golden-template validation (T-NIH-04). Each becomes a `T-S-*` or `T-R-*`
  candidate.

## A5 — Snapshot the safety surface (`safety-tester`)

```bash
node scripts/audit/safety-snapshot.mjs > evidence/audit/safety.json
```

Records:

- Diff of `manifest.yml` scopes vs. the allowlist
  `[read:jira-work, write:jira-work, read:chat:rovo]`. Any extra scope is a
  must-revert finding.
- For every file in `prompts/`: regex scan for banned phrases (approve claims,
  launch now, send now, etc.). Report hits.
- For every file in `automation/rules/`: parse JSON; flag any action that could
  approve claims, send campaigns, or mutate audiences/suppression.
- For `policies/*.md`: hash + presence check; flag any unreferenced policy file
  and any prompt whose `policyHash` no longer matches.
- PHI scan over prompts, sample outputs, and any committed evidence.
- Internal-endpoint / keychain scan of supported paths (mirrors A1's scan from
  the safety angle; a hit on a supported path is a highest-priority `T-S-*`).

## A6 — Unify into `audit/summary.json` (`native-architect` + `lead`)

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
  "native_posture": {
    "project_style": "team-managed|company-managed",
    "golden_template_present": false,
    "acli_inventory_present": false,
    "internal_endpoints_on_supported_path": [],
    "scripts_missing_nih07_label": []
  },
  "iac_posture": {
    "infra_dir_present": false,
    "infra_plan_readonly_present": false,
    "infra_verify_present": false
  },
  "missing_scripts": ["scripts/inventory/acli-fields.mjs", "..."],
  "missing_declarations": ["infra/jira/issue-types.yaml", "..."],
  "manual_artifacts_to_delete": ["evidence/rovo/visibility.md", "..."],
  "commits_to_rewrite": ["<sha> <subject>", "..."],
  "jira_deltas": {
    "issue_types_missing": [],
    "fields_missing": [],
    "fields_to_move_native": [],
    "workflow_deltas": [],
    "filters_missing": [],
    "dashboards_missing": [],
    "automation_rules_missing_or_disabled_pending": []
  },
  "webtrigger_vs_native": {
    "webtrigger_fallback_reachable": null,
    "native_automation_audit_proof": "pending|present|blocked"
  },
  "safety_findings": [],
  "forge_findings": [],
  "seed_deltas": {},
  "blockers": []
}
```

The Jira-delta block references — but does not restate — the canonical counts in
[`issue-types.md`](../issue-types.md), [`custom-fields.md`](../custom-fields.md),
and [`workflows.md`](../workflows.md). The summary names the native owner for
each delta (matrix row), and keeps `webtrigger_vs_native` as two distinct fields
(NIH theme #4).

## A7 — Seed the remediation backlog (`lead`)

```bash
node scripts/audit/summary-to-tasks.mjs \
  evidence/audit/summary.json \
  > evidence/audit/tasks.json
```

The lead transforms `summary.json` into tasks:

- Every `safety_finding` and every `internal_endpoints_on_supported_path` /
  `scripts_missing_nih07_label` hit becomes a `T-S-*` task at **highest
  priority** (nothing else claimable while any `T-S-*` is pending).
- Every `manual_artifact_to_delete` becomes a `T-D-*` cleanup task.
- Every missing declaration, script, or verifier becomes a `T-R-*` task, ordered
  by [`TASK_BOARD.md`](TASK_BOARD.md) — with the **native-first gate enforced**:
  the ACLI inventory (T-NIH-03) and golden-template validation (T-NIH-04) are
  scheduled **before** any Phase-5 per-resource converge task (NIH theme #3).
- Every `blockers` entry becomes a `evidence/blockers.md` row naming the missing
  documented endpoint — never a task to wire an internal endpoint.

## Audit quality gate

Before Phase 2 (remediation) starts, the lead must confirm:

- All A1–A6 scripts ran from native `--json` sources and produced JSON with a
  `generated_by` header.
- No supported-path internal-endpoint or keychain hit remains unticketed.
- Every script the audit referenced but could not find now has a `T-R-*` task to
  create it (the audit scripts themselves are IaC and live in the repo).
- `STATUS.md` is updated with the audit snapshot counts (sourced from the
  canonical data model, not hand-typed — T-NIH-14).

If any audit script does not exist at startup, the lead spawns `forge-rovo-eng`,
`jira-native-eng`, or `native-architect` to write it before running Phase 1 on
that step.
