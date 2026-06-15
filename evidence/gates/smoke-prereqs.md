# VM-SMOKE-JIRA — Smoke Test Prerequisites Analysis
Date: 2026-06-14
Analyst: qa-verifier

---

## 1. Environment variables required

### Required by `scripts/live-jira-smoke.sh`

| Variable | Source | Purpose | Default / Notes |
|---|---|---|---|
| `AIGO_REQUIRE_FORGE_INSTALL` | env | If set to `1`, the script will exit with error if the manifest still contains the placeholder app id. This is the flag used by VM-SMOKE-JIRA. | Default: `0` |
| `AIGO_CHECK_FORGE_INSTALL` | env | If `1` (default), the script checks `forge install list`. Set to `0` to skip. | Default: `1` |
| `AIGO_MIN_SEED_COUNT` | env or instance-config | Minimum number of seed issues required. Falls back to `loadInstanceConfig()`. | Default: `15` |
| `AIGO_IMPORT_SEED` | env | If `1`, auto-imports seed issues when count is below minimum. | Default: `0` |
| `AIGO_INSTANCE_CONFIG` | env | Path to a JSON file overriding `instance-config.cjs` defaults. | Optional |
| `AIGO_PROJECT_KEY` | env or instance-config | Jira project key to check. | Default: `AIGO` |
| `AIGO_SEED_LABEL` | env or instance-config | Label used to identify seed issues. | Default: `aigo-seed` |
| `AIGO_SEED_FILE` / `AIGO_SEED_TEMPLATE` | env or instance-config | Path to the rendered CSV seed file (used only if `AIGO_IMPORT_SEED=1`). | Default: `automation/seed/generated/AIGO-seed-issues.csv` |
| `JIRA_SITE` / `AIGO_JIRA_SITE` | env or instance-config | Site URL for `acli` context. | Used by acli implicitly |

### Required tools (checked by the script itself)
- `node` — must be in PATH
- `acli` — must be installed and authenticated (`acli jira auth status` must pass)
- `forge` — must be installed and authenticated (`forge whoami` must succeed)

---

## 2. What `live-jira-smoke.sh` actually checks (step by step)

1. **node present** — `require_cmd node` — exits 1 if missing.
2. **acli present** — `require_cmd acli` — exits 1 if missing.
3. **forge present** — `require_cmd forge` — exits 1 if missing.
4. **ACLI Jira auth** — runs `acli jira auth status`. Exits non-zero on auth failure.
5. **Forge auth** — runs `forge whoami >/dev/null`. Exits non-zero on failure.
6. **Forge install check** (if `AIGO_CHECK_FORGE_INSTALL=1`, the default):
   - If manifest contains placeholder app id (`00000000-0000-0000-0000-000000000000`):
     - If `AIGO_REQUIRE_FORGE_INSTALL=1` → **exits 1** with error message.
     - Otherwise → prints a skip message and continues.
   - Otherwise → runs `forge install list` to verify the app is installed.
7. **Jira project exists** — runs `acli jira project view --key AIGO --json`. Exits on failure.
8. **Seed issue count** — runs `acli jira workitem search --jql "project = AIGO AND labels = aigo-seed" --count`.
   - Exits 1 if count output cannot be parsed.
   - If `AIGO_IMPORT_SEED=1` and count < min, auto-imports seed CSV.
   - Exits 1 if count < `AIGO_MIN_SEED_COUNT` after optional import.
9. **Lists recent seed issues** — `acli jira workitem search` with CSV output (informational, not a gate).
10. Prints "Live Jira smoke test passed." and exits 0.

---

## 3. What `aigo-project-readiness.cjs` checks

This script is called via `npm run test:readiness:jira` and directly via `node scripts/aigo-project-readiness.cjs`.

**Arguments:**
- `--check issue-types` — check only issue types (VM-JIRA-ISSUE-TYPES path, but the script does not currently parse `--check` argv; it runs the full check unconditionally)
- `--check seeds` — same; script ignores this flag and runs full check
- `--all` — same; script runs full check regardless of flags
- `AIGO_READINESS_WARN_ONLY=1` — collect report without calling `process.exit(1)` on failures

**What it checks:**
1. Loads instance config from `AIGO_INSTANCE_CONFIG` file or env vars.
2. **Project exists** — `acli jira project view --key AIGO --json`.
3. **Issue types** — checks 12 expected types against `project.issueTypes`:
   `Growth Task`, `Experiment`, `Creative Request`, `Claims Review`, `Dashboard Request`,
   `Automation Request`, `Employer Launch`, `Segmentation Request`, `Signup Funnel Issue`,
   `Insight / Research Brief`, `Bug / Tracking Issue`, `Decision Memo`.
   Any missing types are added to `failures[]`.
4. **Seed issues** — JQL: `project = AIGO AND labels = aigo-seed ORDER BY key ASC` (limit 100).
   Fails if `seedIssues` response is not an array, or if count < `minSeedCount` (default 15).
5. **Statuses observed** (warning-only) — checks 12 expected statuses on seed issues:
   `To Do`, `AI Triage`, `Needs Info`, `Needs Human Review`, `Ready`, `Claims Review`,
   `In Progress`, `Blocked`, `Experiment Running`, `Readout Needed`, `Decision Needed`, `Done`.
   Unobserved statuses produce warnings, not failures (since acli can't prove workflow statuses exist).
6. Prints manual-check reminders (Rovo agents, workflow transitions, Automation rules, agent runs).
7. Exits 1 on failures unless `AIGO_READINESS_WARN_ONLY=1`.

**NOTE:** The `--check issue-types`, `--check seeds`, and `--all` flags are listed in VM rows
but the script does not currently parse `process.argv` for these flags. It always runs the full
check. The VM-JIRA-ISSUE-TYPES and VM-SEED-COVERAGE rows reference these flags — a future
improvement would add argv parsing, but the full check satisfies both VM rows in one run.

---

## 4. Issues that would cause VM-SMOKE-JIRA to fail

1. **`acli` not authenticated** — `acli jira auth status` will fail. Fix: `acli jira login`.
2. **`forge` not authenticated** — `forge whoami` will fail. Fix: `forge login`.
3. **Manifest still has placeholder app id** and `AIGO_REQUIRE_FORGE_INSTALL=1` is set — exits 1.
   Current manifest uses the real app id (`d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`), so this is NOT a risk.
4. **AIGO project does not exist** on `myhealthcaresite.atlassian.net` — acli will return an error.
5. **Fewer than 15 seed issues labelled `aigo-seed`** — exits 1 unless `AIGO_IMPORT_SEED=1`.
6. **`acli jira workitem search --count` output doesn't contain a parseable integer** — exits 1
   (regex `grep -Eo '[0-9]+' | tail -n 1` on the count output).
7. **`node` not found in PATH** — first `require_cmd` check fails.

## 5. Status of blocking prerequisites

- `evidence/gates/forge-deploy.log` — EXISTS, shows `✔ Deployed` (T-M1-01 complete by forge-engineer)
- `evidence/gates/forge-install.log` — EXISTS, shows `myhealthcaresite.atlassian.net ... Up-to-date (version 2)` (T-M1-02 complete by forge-engineer)
- Manifest app id is real (not placeholder) — Forge install check will proceed.
- **Blocking gap remaining:** Smoke test requires live `acli` auth and ≥15 seed issues.
  T-M1-03 can now be attempted: `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`
