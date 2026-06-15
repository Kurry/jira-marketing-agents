# MVP Task Plan

## Task Status Key

- `[x]` Done or already validated in this repo/session.
- `[ ]` Remaining MVP work.
- `[~]` Partially done; needs manual Jira or product validation.

## Milestone 1: Stabilize the Forge/Rovo Repo

- `[x]` Remove MCP/Cowork implementation from the active repo scope.
- `[x]` Register the Forge app and replace the placeholder app id.
- `[x]` Add root `index.ts` so Forge handler paths resolve.
- `[x]` Rename internal Forge function module keys to unique short keys.
- `[x]` Add action input descriptions required by Forge lint.
- `[x]` Keep Rovo action keys stable and descriptive.
- `[x]` Change TypeScript config so local build and Forge bundling both work.
- `[x]` Add CI-safe integration tests for manifest/action/function contracts.
- `[x]` Add live Jira smoke script for Forge install and seed verification.
- `[x]` Review the current dirty worktree and create one clean commit for the
  Forge/Rovo-only MVP baseline.

Acceptance:
- `npm run build`, `npm test`, `npm run test:integration`, and `forge lint`
  pass with no errors.
- The only Forge lint warning is the intentional standalone
  `addAnalysisComment` action.

## Milestone 2: Confirm Jira Agent Visibility

- `[x]` Deploy the app to Forge `development`.
- `[x]` Install the app to Jira on `myhealthcaresite.atlassian.net`.
- `[x]` Verify `forge install list` shows Jira as `Up-to-date`.
- `[x]` Run `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`.
- `[ ]` Open Jira/Rovo and confirm all 19 AI Growth Ops agents are visible.
- `[ ]` Capture the exact Jira navigation path where the agents appear.
- `[ ]` If agents do not appear, confirm Rovo is enabled for the site and user,
  then reinstall with confirmed scopes.

Acceptance:
- A human can see the agents in Jira/Rovo.
- The docs identify agent visibility as the primary install success criterion.

## Milestone 3: Finish AIGO Project Configuration

- `[x]` Confirm project `AIGO` exists.
- `[x]` Import or verify the 15 `aigo-seed` issues.
- `[~]` Transition supported seed issues to available statuses.
- `[x]` Add portable instance config and seed rendering for non-`AIGO` project
  keys.
- `[x]` Add a repeatable provision/check entrypoint for future Jira sites and
  boards.
- `[ ]` Add or verify the 12 intended AIGO issue types.
- `[ ]` Add or verify all MVP workflow statuses.
- `[ ]` Wire workflow transitions for Intake, Claims Review, Experiment,
  Employer Launch, Blocked, Decision Needed, and Done paths.
- `[ ]` Re-import or recreate seed issues with custom issue types after the
  project supports them, if useful.
- `[x]` Document any live Jira differences from the ideal AIGO workflow.

Acceptance:
- The AIGO create dialog shows all intended issue types.
- The workflow supports statuses referenced by Automation rules.
- Seed issues cover at least one example for each primary agent flow.

## Milestone 4: Validate Rovo Agent Behavior Manually

- `[ ]` Run AI Growth Triage Agent on the mobile Safari signup issue.
- `[ ]` Run AI Creative Claims Agent on the risky creative issue.
- `[ ]` Run AI Experiment Design Agent on the email subject-line experiment.
- `[ ]` Run AI Employer Launch Agent on the Acme launch issue.
- `[ ]` Run AI Duplicate Detector Agent on the mobile Safari funnel issue.
- `[ ]` Run AI Weekly Readout Agent over recent AIGO issues.
- `[ ]` Record expected vs actual output for each flow in a short validation
  note or checklist.
- `[ ]` Check `forge logs -e development --since 1h` after manual runs for
  handler errors.

Acceptance:
- Each primary agent returns structured, useful output.
- No agent performs or recommends unsafe autonomous action.
- Any failures are classified as prompt issue, Jira config issue, permissions
  issue, or code issue.

## Milestone 5: Import and Validate Jira Automation

- `[ ]` Import `automation/rules/aigo-automation-ruleset.json`, or rebuild the
  five MVP rules manually if import schema drifts.
- `[ ]` Replace all placeholders:
  project key, project id, actor account id, and agent keys.
- `[ ]` Enable only one rule at a time.
- `[ ]` Validate Intake Triage on a newly created AIGO issue.
- `[ ]` Validate Creative Claims on a Ready creative issue.
- `[ ]` Validate Experiment Spec on an experiment issue.
- `[ ]` Validate Employer Launch on an employer launch issue.
- `[ ]` Validate Weekly Readout manually before scheduling.
- `[ ]` Capture Jira Automation audit-log results for each rule.

Acceptance:
- Each rule runs without audit-log errors.
- Each rule posts the expected AI analysis comment.
- Creative Claims routing to Claims Review works only as a review route, not an
  approval.

## Milestone 6: Final MVP Documentation and Runbook

- `[x]` Update install docs to use the registered app flow.
- `[x]` Update smoke docs to require Forge install visibility for agent work.
- `[x]` Add a final MVP runbook section covering:
  deploy, install, seed, Rovo UI check, Automation validation, logs, rollback.
- `[x]` Add a release checklist for future manifest/prompt changes.
- `[x]` Add a troubleshooting note for Rovo UI visibility vs Forge install
  visibility.
- `[x]` Add a short "known limitations" section:
  no field writes, no autonomous transitions, no prompt evals, no production
  promotion yet.
- `[x]` Add portability guidance for many Jira sites/projects and golden
  template project cloning.

Acceptance:
- A new engineer can follow the docs and reproduce the MVP without guessing.
- Docs clearly separate completed repo work from remaining Jira product setup.

## Milestone 7: MVP Exit Review

- `[x]` Run all automated checks:
  `npm run build`, `npm test`, `npm run test:integration`, `forge lint`, and
  `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`.
- `[ ]` Run the six manual Rovo checks from Milestone 4.
- `[ ]` Run all five Automation checks from Milestone 5.
- `[ ]` Review safety policies against live Automation behavior.
- `[x]` Create a final MVP readiness note with blockers, risks, and decisions.

Acceptance:
- No critical blocker remains for the development-site MVP.
- Any post-MVP work is explicitly moved out of the MVP checklist.

## Post-MVP Backlog

- `[ ]` Add custom-field read mappings for optional workflow metadata.
- `[ ]` Add field-write action behind explicit allowlist and tests.
- `[ ]` Add issue-transition action behind explicit allowlist and tests.
- `[ ]` Add prompt-quality evals for key agent outputs.
- `[ ]` Add production/staging promotion guidance.
- `[ ]` Add usage/decision metrics and dashboards.
- `[ ]` Add Slack or other notification paths through Jira Automation.
