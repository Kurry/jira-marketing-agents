# MVP Runbook

This runbook is the operator checklist for taking the Forge/Rovo-only AIGO app
from repo checkout to a working development-site MVP.

For repeatable provisioning across many Jira sites and boards, use
[`PORTABILITY.md`](PORTABILITY.md). This runbook describes the current
development instance and the per-instance validation gates.

Current MVP readiness status is tracked in
[`MVP_READINESS.md`](MVP_READINESS.md).

Target development site:

- Jira site: `myhealthcaresite.atlassian.net`
- Forge environment: `development`
- Jira project: `AI Growth Ops`, key `AIGO`
- Seed label: `aigo-seed`

## Current Live State

Verified by CLI:

- Forge app is registered in `manifest.yml`.
- Forge app is installed to Jira on `myhealthcaresite.atlassian.net`.
- `AIGO` exists as a team-managed business project.
- Seed issues `AIGO-1` through `AIGO-15` exist with label `aigo-seed`.

Current live state (as of 2026-06-15):

- All 14 canonical issue types are live (IDs 10048–10061). ✓
- All 15 seed issues are live with canonical issue types. ✓
- 6 custom fields are live (Segment, Primary Metric, Claims Risk, Experiment ID, Workflow Area, Priority Score). ✓
- 8 MVP workflow statuses are live (Intake, Triage, Spec Ready, In Review, Claims Review, Experiment Running, Decision Needed, Launch Prep). ✓
- 7 JQL saved filters are live (Intake, Claims Review, Launch Readiness, Readout Needed, Decision Needed, Blocked, Experiment Running). ✓
- Forge app deployed and installed. ✓

Open gates:

- Rovo agent visibility (T-M1-04): confirm all 19 agents visible in Jira UI → Apps → Rovo → Agents.
- Automation import (T-M3-02): run `forge deploy -e development && npm run provision:automation:forge`.
- Automation validation (T-M3-03): enable each rule one at a time after import.
- Manual agent runs (T-M4-01–06): validate each agent against seed issues.

## Deploy And Install

```bash
npm install
npm run build
npm test
npm run test:integration
forge lint
forge deploy -e development
forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes
forge install list
```

Expected `forge lint` state: no errors. The only acceptable warning is the
standalone `addAnalysisComment` action not being referenced by a Rovo agent.

## Seed And CLI Checks

Authenticate ACLI once:

```bash
acli jira auth login --web
acli jira auth status
```

Import seed issues only when the project is empty or missing the seed set:

```bash
AIGO_INSTANCE_CONFIG=instances/aigo.example.json npm run seed:render
acli jira workitem create-bulk --from-csv automation/seed/generated/AIGO-seed-issues.csv --yes
```

Run smoke checks:

```bash
AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
```

Run the readiness report:

```bash
npm run test:readiness:jira
```

If you need a non-failing report while the Jira project is still incomplete:

```bash
AIGO_READINESS_WARN_ONLY=1 npm run test:readiness:jira
```

The reusable entrypoint is:

```bash
AIGO_INSTANCE_CONFIG=instances/aigo.example.json npm run provision:instance -- --all --dry-run
```

## Jira Project Setup

Create or verify these 14 canonical issue types in AIGO (all live as of 2026-06-15,
IDs 10048–10061 — see `evidence/jira-config/issue-types.json`):

- AI Growth Request
- Creative Request
- Experiment
- Segmentation Request
- Personalization Journey
- Employer Launch
- Campaign
- Dashboard Request
- Signup Funnel Issue
- Research Brief
- Claims Review
- Decision Memo
- Positioning Update
- Bug

Create or verify these workflow statuses:

- To Do
- AI Triage
- Needs Info
- Needs Human Review
- Ready
- Claims Review
- In Progress
- Blocked
- Experiment Running
- Readout Needed
- Decision Needed
- Done

Minimum transition paths:

- To Do -> AI Triage -> Needs Info
- AI Triage -> Needs Human Review -> Ready -> In Progress
- Ready -> Claims Review -> In Progress
- In Progress -> Experiment Running -> Readout Needed -> Decision Needed -> Done
- Any active status -> Blocked -> prior working status

After the issue types exist, either keep the seed issues as portable `Task`
examples or re-import a copy of `automation/seed/aigo-seed-issues.csv` with the
intended AIGO issue type names.

## Rovo Agent Visibility Check

This is the primary install success criterion.

1. Open Jira on `myhealthcaresite.atlassian.net`.
2. Open an AIGO issue.
3. Open the Rovo chat panel or global Rovo chat.
4. Confirm all 19 agents from `manifest.yml` are visible.
5. Record the exact navigation path in the validation note.

If agents are missing:

1. Run `forge install list` and confirm the Jira installation is `Up-to-date`.
2. Re-run `forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes`.
3. Confirm Rovo/Atlassian Intelligence is enabled for the site and the user.
4. Confirm the deploy environment is `development`, matching the installation.
5. Check `forge logs -e development --since 1h --limit 50` after another manual
   attempt.

## Manual Agent Checks

Run these against the seeded AIGO issues and record expected vs actual output:

- AI Growth Triage Agent on the mobile Safari signup issue.
- AI Creative Claims Agent on the risky creative issue.
- AI Experiment Design Agent on the email subject-line experiment.
- AI Employer Launch Agent on the Acme launch issue.
- AI Duplicate Detector Agent on the mobile Safari funnel issue.
- AI Weekly Readout Agent over recent AIGO issues.

After manual runs:

```bash
forge logs -e development --since 1h --limit 50
```

Classify failures as prompt issue, Jira config issue, permission issue, or code
issue.

## Jira Automation Import (T-M3-02)

The preferred path is the Forge function — it runs inside Atlassian's
infrastructure and doesn't require a session cookie or admin OAuth token:

```bash
# Step 1: deploy (must include fn-import-automation + manage:jira-configuration scope)
forge deploy -e development

# Step 2: accept new scope if prompted
forge install --upgrade -e development -p jira \
  --site myhealthcaresite.atlassian.net --confirm-scopes

# Step 3: invoke the import function
npm run provision:automation:forge
```

This reads all 5 files from `automation/rules/rendered/`, validates each has
`state: "DISABLED"`, then calls `fn-import-automation` which POSTs each rule to
the Jira Automation gateway. Evidence is written to
`evidence/automation/forge-import-output.json`.

If the Forge function returns HTTP 403 (scope not yet accepted), re-run
`forge install --upgrade` and approve `manage:jira-configuration` in the
consent dialog.

**Manual fallback** (if Forge function fails):

1. Jira: AIGO → Project Settings → Automation → ⋮ → Import rules.
2. Upload each file from `automation/rules/rendered/` one at a time.
3. Confirm each rule appears **disabled** after import.
4. See `docs/OPERATOR_PROMPTS.md` → "Import automation rules (T-M3-02)" for
   the full step-by-step.

## Jira Automation Validation (T-M3-03)

> **BLOCKED (BLK-02 — Rovo/AI activation eligibility):** "Use agent" in Jira Automation
> requires Rovo/AI to be active for the organization. Current Atlassian docs say
> Rovo is included with paid Standard, Premium, and Enterprise subscriptions;
> Free subscriptions cannot use Rovo, and orgs need a verified business domain.
> Confirm billing/domain eligibility, enable Rovo/AI, then follow
> `skills/jira-automation-rovo-setup/SKILL.md` to complete this step.
> See `evidence/blockers.md#BLK-02` and `docs/TROUBLESHOOTING.md` → "Use agent
> blocked by activate AI" for full investigation notes.

After resolving BLK-02 and connecting Rovo (Settings → Automation → Rovo),
enable and validate one rule at a time:

1. Enable `AIGO – Intake Triage`.
2. Create or update an AIGO issue (or use a seed issue in `Intake` status).
3. Wait for the rule to fire; check Automation audit log for a green row.
4. Confirm the Rovo agent ran and the comment body contains `[AI Analysis]`.
5. If green, leave it enabled and move to the next rule. If red, disable,
   open a child task, and fix before proceeding.

Rules to validate in order:

1. AIGO – Intake Triage → seed issue type: AI Growth Request, Bug, or Signup Funnel Issue
2. AIGO – Creative Claims Review → seed issue type: Creative Request (use the "guaranteed diabetes reversal" seed)
3. AIGO – Experiment Spec → seed issue type: Experiment (use the email subject-line experiment seed)
4. AIGO – Employer Launch → seed issue type: Employer Launch (use the Acme Corp seed)
5. AIGO – Weekly Readout → trigger manually via "Run now" in Automation UI before enabling the schedule

After each rule fires:

```bash
forge logs -e development --since 30m --limit 100
```

Evidence per rule: `evidence/automation/<rule-key>-audit.md` containing the
audit log row and the posted comment body.

## Release Checklist

For manifest, prompt, or handler changes:

1. `npm run build`
2. `npm test`
3. `npm run test:integration`
4. `forge lint`
5. `forge deploy -e development`
6. `forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes` if scopes changed
7. `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`
8. `npm run test:readiness:jira` or `AIGO_READINESS_WARN_ONLY=1 npm run test:readiness:jira`
9. Manual Rovo visibility check
10. Manual primary-agent checks
11. Automation audit-log checks

Rollback:

- Disable affected Jira Automation rules first.
- Re-deploy the previous Forge app version or revert the manifest/code change
  and run `forge deploy -e development`.
- Re-run smoke and manual Rovo checks before re-enabling rules.

## Known Limitations

- No MCP/Cowork path; Forge/Rovo is the only supported integration.
- No autonomous field writes.
- No autonomous workflow transitions from Forge actions.
- No campaign sends, audience mutations, suppression changes, experiment
  launches, claims approvals, or production signup-flow writes.
- No prompt-quality eval suite yet; current integration tests protect
  manifest/action/handler contracts.
- No production promotion guide yet; the runbook targets the development site.
- Jira Automation import JSON may drift; the UI rebuild path is the supported
  fallback.
- General Jira project configuration is not Terraform-managed in this repo.
  Use golden project cloning plus instance configs for repeatable setup.
