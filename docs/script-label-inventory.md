# Custom Script Label Inventory

Status: T-NIH-07 inventory baseline.

Every script entrypoint is assigned exactly one long-term label:

- `native wrapper`: wraps a supported Atlassian CLI, Forge CLI, or documented API without owning domain logic.
- `documented API gap`: exists because ACLI/Forge/Jira native surfaces do not currently cover the required idempotent operation; supported paths must use documented APIs only.
- `Twin-specific logic`: implements AIGO policy, agent behavior, evidence, instance binding, verification, rendering, or orchestration that is specific to this repo.

Private/internal Atlassian endpoints are not a supported path. The only remaining internal Automation helper is explicitly experimental and non-default.

| Script | Label | Native owner/API | Why it exists |
| --- | --- | --- | --- |
| `scripts/aigo-project-readiness.cjs` | `Twin-specific logic` | Jira REST read APIs | Verifies the AIGO project readiness contract and emits operator-facing gaps. |
| `scripts/audit/forge-snapshot.mjs` | `Twin-specific logic` | Forge CLI | Captures read-only Forge install and manifest evidence for the staging audit. |
| `scripts/audit/jira-snapshot.mjs` | `Twin-specific logic` | Jira REST read APIs | Captures read-only Jira project evidence for audit summaries. |
| `scripts/audit/repo-snapshot.mjs` | `Twin-specific logic` | Git/file system | Captures repo structure, npm scripts, and evidence inventory. |
| `scripts/audit/run-all.mjs` | `Twin-specific logic` | Local audit scripts | Orchestrates the repo audit evidence bundle. |
| `scripts/audit/safety-snapshot.mjs` | `Twin-specific logic` | Git/file system | Captures safety policy and hook evidence. |
| `scripts/audit/summarize.mjs` | `Twin-specific logic` | Local audit evidence | Aggregates audit JSON into a decision summary. |
| `scripts/audit/v1-attempt.mjs` | `Twin-specific logic` | Git/file system | Inventories legacy/v1 artifacts so they can be retired or regenerated. |
| `scripts/check-rovo-visibility.cjs` | `Twin-specific logic` | Forge CLI | Verifies manifest agent count and Forge install status; Rovo UI visibility remains product evidence. |
| `scripts/docs/generate.mjs` | `Twin-specific logic` | Repo `infra/` YAML | Regenerates state-derived documentation regions from checked-in declarative state. |
| `scripts/fix-automation-triggers.cjs` | `documented API gap` | Native Jira Automation UI | Historical staging-only trigger repair helper; live internal API use requires explicit experimental opt-in. |
| `scripts/infra/apply.mjs` | `documented API gap` | ACLI plus documented Jira REST | Reconciles Jira config where ACLI/golden-template cloning do not yet cover idempotent apply. |
| `scripts/infra/cleanup-v1-evidence.mjs` | `Twin-specific logic` | Git/file system | Removes or quarantines non-repeatable v1 evidence artifacts. |
| `scripts/infra/jira-backfill.mjs` | `documented API gap` | Documented Jira REST | Backfills Jira IDs into declarative YAML after live resources exist. |
| `scripts/infra/plan.mjs` | `documented API gap` | ACLI plus documented Jira REST | Computes drift without adopting a third-party Terraform provider. |
| `scripts/infra/render-all.mjs` | `Twin-specific logic` | Repo `infra/` YAML | Renders local artifacts from declarative state. |
| `scripts/infra/render-infra-tree.mjs` | `Twin-specific logic` | Repo `infra/` YAML | Produces the consolidated infrastructure tree evidence. |
| `scripts/instance-config.cjs` | `Twin-specific logic` | Instance config contract | Normalizes per-tenant config and environment propagation. |
| `scripts/invoke/run-all.mjs` | `Twin-specific logic` | Forge CLI | Exercises AIGO agent invocation smoke checks and writes evidence. |
| `scripts/lib/apply-jira.mjs` | `documented API gap` | Documented Jira REST | Shared create/update helpers for Jira resources not fully covered by ACLI. |
| `scripts/lib/evidence.mjs` | `Twin-specific logic` | Local evidence schema | Standardizes generated evidence envelopes. |
| `scripts/lib/forge.mjs` | `native wrapper` | Forge CLI | Parses Forge install state for audits and verifiers. |
| `scripts/lib/jira.mjs` | `documented API gap` | Documented Jira REST | Shared Jira client for read/write scripts using supported REST endpoints. |
| `scripts/lib/plan-jira.mjs` | `documented API gap` | Documented Jira REST | Shared read/diff logic for Jira plan operations. |
| `scripts/lib/runner.mjs` | `Twin-specific logic` | Local process execution | Provides common command/evidence handling for repo scripts. |
| `scripts/lib/staging.mjs` | `Twin-specific logic` | Staging safety policy | Guards scripts that are intentionally staging-only. |
| `scripts/lib/verify.mjs` | `Twin-specific logic` | Local verifier framework | Shared assertions and evidence helpers for verification scripts. |
| `scripts/live-jira-smoke.sh` | `Twin-specific logic` | Forge CLI plus Jira REST actions | Runs live AIGO smoke checks against the selected instance. |
| `scripts/provision-all.cjs` | `Twin-specific logic` | Forge CLI, ACLI, documented Jira REST | Orchestrates the portable AIGO provisioning sequence. |
| `scripts/provision-automation.cjs` | `documented API gap` | Native Jira Automation import/rebuild | Validates Automation JSON and stops before mutation; experimental API import is off by default. |
| `scripts/provision-dashboards.cjs` | `documented API gap` | Documented Jira dashboard REST | Creates dashboard shells/gadgets where ACLI/golden-template cloning is insufficient. |
| `scripts/provision-filters.cjs` | `documented API gap` | Documented Jira filter REST | Idempotently creates/updates saved filters for dashboards and queues. |
| `scripts/provision-instance.cjs` | `native wrapper` | Forge CLI and ACLI | Provides a config-aware wrapper for install, project clone/create, seed, smoke, and readiness steps. |
| `scripts/provision-jira.cjs` | `documented API gap` | ACLI plus documented Jira REST | Provisions Jira fields/options/status metadata where native cloning is not available. |
| `scripts/provision-seeds.cjs` | `documented API gap` | Documented Jira issue REST | Creates seed issues and labels idempotently for readiness and agent tests. |
| `scripts/render-automation-rules.cjs` | `Twin-specific logic` | AIGO Automation templates | Renders portable Automation JSON from the instance config. |
| `scripts/render-seed.cjs` | `Twin-specific logic` | AIGO seed templates | Renders tenant-specific seed CSV files from the canonical template. |
| `scripts/verify/automation-audit.mjs` | `Twin-specific logic` | Jira Automation audit evidence | Verifies or records the native Automation/Rovo audit-log evidence requirement. |
| `scripts/verify/forge-install.mjs` | `Twin-specific logic` | Forge CLI | Verifies Forge app installation evidence for the target site. |
| `scripts/verify/jira-fields.mjs` | `Twin-specific logic` | Jira REST read APIs | Verifies AIGO field presence and IDs against declarative state. |
| `scripts/verify/jira-filters.mjs` | `Twin-specific logic` | Jira REST read APIs | Verifies AIGO saved filters against declarative state. |
| `scripts/verify/jira-issue-types.mjs` | `Twin-specific logic` | Jira REST read APIs | Verifies canonical AIGO issue types against declarative state. |
| `scripts/verify/jira-seeds.mjs` | `Twin-specific logic` | Jira REST search | Verifies seed issue coverage for the selected instance. |
| `scripts/verify/jira-workflow.mjs` | `Twin-specific logic` | Jira REST read APIs | Verifies workflow/status coverage for AIGO readiness. |
| `scripts/verify/rovo-agents.mjs` | `Twin-specific logic` | Forge manifest plus install evidence | Verifies Rovo manifest/install state, not UI visibility. |
| `scripts/verify/run-all.mjs` | `Twin-specific logic` | Local verifier scripts | Orchestrates the verification evidence suite. |

