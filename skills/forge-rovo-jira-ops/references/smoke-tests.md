# Smoke Test Reference

## Automated Checks

Run these before manual Rovo checks:

```bash
npm run test:integration
AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
npm run test:readiness:jira
```

For a non-default project/site, run the same checks with an instance config:

```bash
AIGO_INSTANCE_CONFIG=instances/<name>.json npm run seed:render
AIGO_INSTANCE_CONFIG=instances/<name>.json AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
AIGO_INSTANCE_CONFIG=instances/<name>.json npm run test:readiness:jira
```

`test:integration` is CI-safe and checks manifest, prompt, action, handler, and
safety contracts without Jira credentials. `test:smoke:jira` is a live check for
an authenticated Forge/ACLI session, a visible Forge Jira installation, and
seeded Jira issues. It does not import issues unless explicitly enabled:

```bash
AIGO_IMPORT_SEED=1 npm run test:smoke:jira
```

Forge integration testing is deployment and product validation: `forge deploy`,
`forge install`, `forge tunnel`, `forge logs`, Jira Automation audit logs, and
seeded Jira issues. Evals are useful for prompt quality and agent-output
rubrics, but they are not the Forge integration-test mechanism.

`test:readiness:jira` verifies the parts of live AIGO project configuration that
ACLI can prove: project issue types, seeded issues, and observed seed statuses.
Use `AIGO_READINESS_WARN_ONLY=1 npm run test:readiness:jira` while product setup
is still incomplete.

## Manual Rovo Checks

1. Confirm all 19 Rovo agents from `manifest.yml` appear in Jira/Rovo. This is
   the primary installation success criterion.
2. On a seeded funnel issue, ask the AI Growth Triage Agent: "Triage this
   issue." Expect Signup Funnel area, high priority, missing info or blocker
   notes, and a next-status recommendation.
3. On the risky creative issue, ask the Creative Claims Agent to review claims.
   Expect prohibited/risky claims, safer rewrites, and human review required.
4. On the experiment issue, ask the Experiment Design Agent for a spec. Expect
   hypothesis, variants, primary metric, guardrails, tracking, and decision rule.
5. On the employer launch issue, ask the Employer Launch Agent for readiness.
   Expect readiness score below full confidence, blockers, and no go/no-go
   approval.
6. Run Duplicate Detector against the mobile signup issue. Expect the similar
   mobile signup bug to be identified.
7. Run Weekly Readout. Expect recent completed, blocked, and decision-needed
   work to be summarized.

## Automation Checks

1. Enable only one rule at a time until each passes.
2. Create a new `AIGO` issue. Intake Triage should call the Rovo agent and add
   a comment with `{{agentResponse}}`.
3. Transition a Creative Request to `Ready`. Creative Claims should add a review
   comment and, when configured, transition the issue to `Claims Review`.
4. Create or transition an Experiment into the rule condition. It should add an
   experiment spec comment.
5. Create an Employer Launch issue. It should add a readiness/workback comment.
6. Run Weekly Readout manually. It should create a Decision Memo or update the
   configured recurring issue, depending on the rule.

## Failure Triage

- Check Automation audit logs before changing code.
- Check Forge logs for handler exceptions.
- Verify scopes and app installation when Jira reads or comments fail.
- If agents do not appear, run `forge install list` and
  `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`, then confirm Rovo is
  enabled on the Jira site.
- Verify project permissions and issue security for 403/404 failures.
- If comments are missing from context, test an issue with a visible comment and
  confirm the app can read comments.
- If Rovo action placeholders fail after import, reselect the Rovo agent in the
  Jira Automation UI.
