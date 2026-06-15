# Verification Matrix

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment to the Atlassian-native /
NIH-reduction direction; not authoritative until the architect + safety reviewer
accept it.
Supersedes: `specs/agent-team/VERIFICATION_MATRIX.md`

This is the **only** source of truth for "what proves a task is done". Every row
lists (a) what to run, (b) where evidence must land, and (c) the exact success
signal. A task that cites a row here cannot be marked `completed` until the
evidence exists and the signal matches. Evidence is valid only if a repo script
produced it, it is deterministic on re-run, machine-readable JSON where possible,
and Markdown summaries are generated from JSON (see
[SCRIPTS_CONTRACT.md](SCRIPTS_CONTRACT.md)). The detailed per-row mechanics live
in [SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md).

All rows read **native sources only** — `forge install list`/`--json`, ACLI list
commands, documented Jira REST GETs, and the native Jira Automation audit log.
No row reads `gateway/api/automation/internal-api`, `rest/cb-automation`, or any
private/internal surface (theme #1).

Canonical entity counts/names come from [`issue-types.md`](../issue-types.md),
[`custom-fields.md`](../custom-fields.md), and [`workflows.md`](../workflows.md);
rows below reference those catalogs and never restate counts.

All paths are relative to the repo root unless prefixed `jira:`.

---

## VM-LOCAL-GATES — Local quality gates green

- Run (in order): `npm ci`, `npm run build`, `npm test`, `npm run test:integration`, `npx forge lint`.
- Evidence: `evidence/gates/local-<UTC-timestamp>.json` (+ generated `.md`).
- Success: every command exits 0. The only acceptable `forge lint` warning is the
  intentional standalone `addAnalysisComment` action.

## VM-FORGE-DEPLOY — Forge deploy succeeds on staging

- Run: `forge deploy -e development`.
- Evidence: `evidence/gates/forge-deploy.json`.
- Success: deploy completes with no errors; new manifest version recorded.

## VM-FORGE-INSTALL — App installed on the staging site

- Run: `forge install list --json` (parsed by `scripts/verify/forge-install.mjs`).
- Evidence: `evidence/gates/forge-install.json`.
- Success: the `myhealthcaresite.atlassian.net` Jira entry is `Up-to-date` with
  the version from VM-FORGE-DEPLOY.

## VM-SMOKE-JIRA — Live Jira smoke passes

- Run: `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`.
- Evidence: `evidence/gates/smoke-jira.json`.
- Success: exit 0; script confirms Forge install and seeded issue access.

## VM-ROVO-MANIFEST-INSTALL — Manifest/install check (renamed from "visibility")

> Renamed from the prior "All 19 Rovo agents visible in Jira UI" row (theme #4,
> T-NIH-01). There is **no public Rovo agent listing API**, so this row proves
> only that every declared agent is in `manifest.yml` and the app is installed —
> a **manifest/install check**, not UI visibility. UI confirmation stays a
> manual, product-gated step in the runbook and is never asserted green here.

- Run: `node scripts/verify/rovo-manifest-install.mjs --json`.
- Evidence: `evidence/rovo/manifest-install.json`.
- Success: every `rovo:agent.key` in `manifest.yml` is present; app installed and
  `Up-to-date`; each prompt resource resolves. Report states
  `claim: "manifest/install verified; UI confirmation pending"`.

## VM-JIRA-ISSUE-TYPES — Canonical issue types present

- Run: `node scripts/verify/jira-issue-types.mjs --json` (ACLI listing; REST GET fallback).
- Evidence: `evidence/jira-config/issue-types.json`.
- Success: every canonical type from [`issue-types.md`](../issue-types.md) is
  present with the declared name; aliases resolved.

## VM-JIRA-FIELDS — Custom fields present and wired to screens

- Run: `node scripts/verify/jira-fields.mjs --json` (ACLI `jira field` + REST screen GETs).
- Evidence: `evidence/jira-config/custom-fields.json` with field id, type, and
  attached screens per issue type.
- Success: every field in [`custom-fields.md`](../custom-fields.md) resolves and
  is on at least one screen for its owning issue types. Fields the catalog marks
  JSM-Assets- or JPD-owned are asserted against their native owner, not as custom
  fields (theme #2).

## VM-JIRA-WORKFLOW — Workflow statuses and transitions present

- Run: `node scripts/verify/jira-workflow.mjs --json` (documented REST GET, or
  the golden-template clone's observed shape).
- Evidence: `evidence/jira-config/workflow.json`.
- Success: all statuses and transitions in [`workflows.md`](../workflows.md) are
  present; no required status missing.

## VM-SEED-COVERAGE — At least one seed issue per canonical type

- Run: `node scripts/verify/jira-seeds.mjs --json` (ACLI `jira workitem search --jql`).
- Evidence: `evidence/jira-config/seeds.json`.
- Success: ≥1 row per canonical issue type (`issue-types.md`).

## VM-READINESS — Full audit-snapshot readiness passes

- Run: `node scripts/verify/snapshot-fresh.mjs --json` (audit harness; re-reads
  native sources, diffs the read-only `infra/` snapshot).
- Evidence: `evidence/readiness/full.json`.
- Success: exit 0; zero diff between native state and the committed snapshot. (No
  converge/apply engine is exercised — theme #3.)

## VM-AUTOMATION-RENDER — Rule rendering has no placeholders

- Run: `npm test -- tests/automation`.
- Evidence: `evidence/automation/render.json`.
- Success: rendered JSON contains no `${...}` tokens; every `agentKey` matches a
  key in `manifest.yml`.

## VM-AUTOMATION-IMPORT — Rules imported via native path, disabled by default

- Run: `node scripts/verify/automation-import.mjs --json` (native Jira Automation
  export/list only).
- Evidence: `evidence/automation/<rule-key>.json` per rule, each with: rule id,
  enabled=false at import, source file.
- Success: all declared rules exist; all disabled until VM-AUTOMATION-AUDIT moves
  them. Import never depends on private endpoints; absent a public surface, exit 5
  + blocker file.

## VM-AUTOMATION-AUDIT — Native audit-log proof (distinct from webtrigger)

> The **only** row that proves native Jira Automation invoked Rovo. Reads the
> **native Jira Automation audit log** — never a webtrigger probe (theme #4,
> finding #6).

- Run: `node scripts/verify/automation-audit.mjs --json`.
- Evidence: `evidence/automation/<rule-key>-audit.json` containing an audit-log
  excerpt + the resulting Jira comment body.
- Success: each rule shows one successful audit-log row with no errors and a
  posted comment including the AI-analysis marker. The Creative Claims route
  includes no approve step. Rules stay disabled until their own audit row is
  green.

## VM-WEBTRIGGER-FALLBACK — Operator-fallback reachability (NOT native proof)

> A **separate** row from VM-AUTOMATION-AUDIT. Webtrigger reachability is a
> controlled operator fallback, never proof that native Automation invoked Rovo.
> The evidence record keeps "webtrigger fallback complete" and "native
> Automation/Rovo audit proof pending" distinct (theme #4).

- Run: `node scripts/verify/webtrigger-fallback.mjs --json`.
- Evidence: `evidence/rovo/webtrigger-fallback.json` with
  `proves_native_automation: false`.
- Success: webtrigger reachable. This row never satisfies VM-AUTOMATION-AUDIT.

## VM-AGENT-RUN — Scripted Rovo agent run captured per agent

- Run: `node scripts/invoke/run-all.mjs --json`.
- Evidence: `evidence/agent-runs/<agent-key>.json` containing: seed issue key,
  input summary, actual output, expected-output bullets, pass/fail verdict, and a
  `forge logs -e development --since 1h --json` excerpt.
- Success: verdict PASS; safety assertions in `scripts/lib/safety.mjs` pass.

## VM-SAFETY-TESTS — Safety invariants encoded in tests

- Run: `npm test -- tests/safety`.
- Evidence: `evidence/gates/safety-tests.json`.
- Success: assertions cover — no claims approval, no campaign send, no
  audience/suppression mutation, no transition without allowlist, no high-risk
  auto-close, PHI redaction in quotes.

## VM-OUTCOME-E2E — Outcome workflow end-to-end trace

- One row per outcome (see [`outcome-roadmap.md`](../outcome-roadmap.md)). Evidence
  at `evidence/outcomes/<outcome-n>/trace.json` with: seed issue key(s), agent
  run output, comment posted (or analysis returned), any **native** Automation
  audit-log link, and a description of the human-review gate.
- Success: trace is coherent; safety-reviewer initials recorded; the acceptance
  bullets in `outcome-roadmap.md` for that outcome are satisfied. Native
  Automation links cite VM-AUTOMATION-AUDIT, not webtrigger evidence.

## VM-DOCS-LINK-CHECK — No broken links in docs

- Run: `npx --yes markdown-link-check docs/*.md README.md specs/**/*.md 2>&1 | tee evidence/gates/link-check.log`.
- Success: no `[✖]` lines except known-failing external providers allowlisted in
  a config file.

## VM-CI-GREEN — CI workflow passes on the head commit

- Run: `node scripts/verify/ci-status.mjs --json` (`gh run list`).
- Evidence: `evidence/gates/ci.json` with the run URL / `gh run view` output.
- Success: latest CI run on branch head is green.

## VM-FINAL — Final sweep

- Run every VM row above sequentially via `npm run infra:verify`; pipe combined
  output to `evidence/final-verification.json`.
- Success: every row green (or `unsupported-by-platform` with a blocker file);
  `evidence/DONE.json` written; `STATUS.md` describes the end state; `git status`
  clean. Native Automation proof and webtrigger-fallback reachability are
  reported as distinct lines.
