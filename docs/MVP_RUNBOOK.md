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

Known live gaps:

- The AIGO project currently exposes only `Workstream`, `Task`, and `Sub-task`
  issue types.
- Seed issues are imported as `Task` until the richer AIGO issue types exist.
- Observed seed statuses are `To Do`, `In Progress`, and `Done`; the full MVP
  workflow still needs Jira product configuration.
- Rovo agent visibility must be confirmed in the Jira UI. `forge install list`
  proves app installation, but it does not prove the user can see every agent in
  Rovo.
- Jira Automation rules need import or manual rebuild, placeholder replacement,
  and audit-log validation.

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

Create or verify these issue types in AIGO:

- Growth Task
- Experiment
- Creative Request
- Claims Review
- Dashboard Request
- Automation Request
- Employer Launch
- Segmentation Request
- Signup Funnel Issue
- Insight / Research Brief
- Bug / Tracking Issue
- Decision Memo

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

## Jira Automation Validation

Import path:

1. Jira project settings -> Automation -> Import rules.
2. Upload `automation/rules/aigo-automation-ruleset.json`.
3. Replace project, actor, and agent placeholders.
4. Enable one rule at a time.
5. Validate each rule's Automation audit log before enabling the next rule.

Manual fallback:

- Rebuild the five rules from `automation/jira-automation-rules.md`.
- Use the "Use Rovo agent" action followed by explicit Jira Automation comment
  or routing steps.

Rules to validate:

- Intake Triage on a newly created AIGO issue.
- Creative Claims on a Ready creative issue.
- Experiment Spec on an experiment issue.
- Employer Launch on an employer launch issue.
- Weekly Readout by manual rule run before enabling a schedule.

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
