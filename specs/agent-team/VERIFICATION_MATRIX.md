# Verification Matrix

This is the **only** source of truth for "what proves a task is done". Every
row lists (a) what to run, (b) the file(s) evidence must land in, and (c) the
exact success signal. A task that cites a row here cannot be marked
`completed` until the evidence exists and the signal matches.

All paths are relative to the repo root unless prefixed `jira:`.

---

## VM-LOCAL-GATES — Local quality gates green

- Run (in order, from repo root):
  ```bash
  npm ci
  npm run build
  npm test
  npm run test:integration
  npx forge lint
  ```
- Evidence: `evidence/gates/local-<UTC-timestamp>.log` (full stdout+stderr).
- Success signal: every command exits 0. The only acceptable `forge lint`
  warning is the intentional standalone `addAnalysisComment` action.

## VM-FORGE-DEPLOY — Forge deploy succeeds on staging

- Run:
  ```bash
  forge deploy -e development
  ```
- Evidence: `evidence/gates/forge-deploy.log`.
- Success: deploy completes with no errors; new manifest version recorded.

## VM-FORGE-INSTALL — App installed on the staging site

- Run:
  ```bash
  forge install list
  ```
- Evidence: `evidence/gates/forge-install.log`.
- Success: output contains
  `myhealthcaresite.atlassian.net ... jira ... Up-to-date` with the version
  from VM-FORGE-DEPLOY.

## VM-SMOKE-JIRA — Live Jira smoke passes

- Run:
  ```bash
  AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
  ```
- Evidence: `evidence/gates/smoke-jira.log`.
- Success: exit 0; script confirms Forge install and seeded issue access.

## VM-ROVO-VISIBILITY — All 19 Rovo agents visible in Jira UI

> **NIH note.** This row honestly reflects that Rovo **UI visibility** has
> no guaranteed public listing API (per `specs/atlassian-native-tools.md`
> finding #2 / T-NIH-01). That is the native reality, not an IaC failure:
> the agent catalog is owned by `manifest.yml` + `forge install`, and
> `check:rovo` should report "manifest/install verified; UI confirmation
> pending" rather than claim guaranteed visibility. Keep manifest/install
> checks separate from the manual UI confirmation; do not "fix" this by
> inventing a bespoke visibility tracker.

- Preferred: enumerate via Forge Rovo agent listing API (as far as
  available to the account); record navigation path in the UI.
- Fallback: the lead asks the human operator in-chat to paste a screenshot
  or text listing; teammates capture to evidence.
- Evidence: `evidence/rovo/visibility.md` listing all 19 agent names from
  `manifest.yml` and the Jira navigation path.
- Success: every `rovo:agent.key` in `manifest.yml` appears; count == 19.

## VM-JIRA-ISSUE-TYPES — Canonical issue types present

- Run:
  ```bash
  node scripts/aigo-project-readiness.cjs --check issue-types
  ```
  (extend the script as part of T-M2-03 to enumerate required types).
- Evidence: `evidence/jira-config/issue-types.json` + script log.
- Success: JSON contains every type from `specs/issue-types.md` (14+ types).

## VM-JIRA-FIELDS — Custom fields present and wired to screens

- Evidence: `evidence/jira-config/custom-fields.json` with field id,
  type, and attached screens per issue type.
- Success: every field in `specs/custom-fields.md` resolves to a field id
  and is present on at least one screen for its owning issue types.

## VM-JIRA-WORKFLOW — Workflow statuses and transitions present

- Evidence: `evidence/jira-config/workflow.json` (export via Jira REST).
- Success: contains all 12 MVP statuses and the transitions defined in
  `specs/workflows.md`; no required status missing.

## VM-SEED-COVERAGE — At least one seed issue per canonical type

- Run:
  ```bash
  node scripts/aigo-project-readiness.cjs --check seeds
  ```
- Evidence: `evidence/jira-config/seeds.md`.
- Success: listing has ≥1 row per canonical issue type.

## VM-READINESS — Full project readiness check passes

- Run:
  ```bash
  node scripts/aigo-project-readiness.cjs --all
  ```
- Evidence: `evidence/readiness/full.log`.
- Success: exit 0; no `FAIL` lines.

## VM-AUTOMATION-RENDER — Rule rendering has no placeholders

- Run:
  ```bash
  npm test -- tests/automation
  ```
- Evidence: `evidence/automation/render.log`.
- Success: tests verify that rendered JSON contains no `{{...}}` tokens and
  that every `agentKey` matches a key in `manifest.yml`.

## VM-AUTOMATION-IMPORT — Rules imported, disabled by default

- Evidence: `evidence/automation/<rule-key>.md` per rule, each containing:
  Jira Automation rule id, enabled=false at import, source file.
- Success: all five rules exist; all disabled until VM-AUTOMATION-VALIDATE
  moves them.

## VM-AUTOMATION-VALIDATE — Each rule passes a real audit-log run

- Evidence: `evidence/automation/<rule-key>-audit.md` containing audit-log
  excerpt + resulting Jira comment body.
- Success: each rule shows one successful audit-log row with no errors and
  the posted comment includes the AI-analysis marker text. Creative Claims
  route does not include an approve step.

## VM-AGENT-RUN — Manual Rovo agent run captured per agent

- Evidence: `evidence/agent-runs/<agent-key>.md` containing: seed issue
  key, input summary, actual output, expected output bullets, pass/fail
  verdict, `forge logs -e development --since 1h` excerpt.
- Success: verdict is PASS and safety-reviewer initials appended.

## VM-SAFETY-TESTS — Safety invariants encoded in tests

- Run:
  ```bash
  npm test -- tests/safety
  ```
- Evidence: `evidence/gates/safety-tests.log`.
- Success: assertions cover — no claims approval, no campaign send, no
  audience/suppression mutation, no transition without allowlist, no
  high-risk auto-close, PHI redaction in quotes.

## VM-OUTCOME-E2E — Outcome workflow end-to-end trace

- One row per outcome (1–10). Evidence lives at
  `evidence/outcomes/<outcome-n>/trace.md` with:
    - seed issue key(s),
    - agent run output,
    - comment posted to Jira (or analysis returned),
    - any Automation rule audit-log link,
    - human-review gate confirmation (text describing where it is).
- Success: trace is coherent, safety-reviewer initials, acceptance bullets
  in `specs/outcome-roadmap.md` for that outcome all satisfied.

## VM-DOCS-LINK-CHECK — No broken links in docs

- Run:
  ```bash
  npx --yes markdown-link-check docs/*.md README.md specs/*.md 2>&1 | tee evidence/gates/link-check.log
  ```
- Success: no `[✖]` lines except for known-failing external providers which
  must be allowlisted in a config file.

## VM-CI-GREEN — CI workflow passes on the head commit

- Evidence: `evidence/gates/ci.md` with the run URL or `gh run view` output.
- Success: latest CI run on branch head is green.

## VM-FINAL — Final sweep

- Run every VM row above sequentially. Pipe combined output to
  `evidence/final-verification.log`.
- Success: every row green, `evidence/DONE.md` written, `STATUS.md`
  describes the end state, `git status` is clean.
