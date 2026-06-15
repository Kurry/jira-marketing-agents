---
name: forge-rovo-jira-ops
description: Operate this repo's Atlassian Forge/Rovo Jira agent system. Use when deploying, installing, connecting to Jira Cloud, configuring the AIGO project, importing Jira Automation rules, seeding verification issues, running smoke tests, or troubleshooting Forge/Rovo agent behavior for this codebase.
---

# Forge Rovo Jira Ops

Use this skill for Forge/Rovo-only operation of the Jira AI Growth Ops app.

## First Checks

1. Inspect `git status --short --branch` and preserve unrelated user changes.
2. Run local health checks before live Jira work:
   - `npm ci`
   - `npm run build`
   - `npm test`
   - `forge --version`
   - `forge lint` after registration
3. Confirm `manifest.yml` has a real Forge `app.id`. If it still contains the
   placeholder UUID, run `forge register` before deploy.
4. Confirm the target Jira Cloud site has Rovo enabled and the operator has site
   admin rights.

## Workflow

Use this order for a fresh connection:

1. Read `references/setup.md` for install/deploy commands and Jira project
   configuration.
2. Read `references/seed-data.md` when the user wants a seed project or live
   verification data.
3. Read `references/smoke-tests.md` before validating Rovo agents or Jira
   Automation.

Keep the default dev target as project `AI Growth Ops`, key `AIGO`, unless the
user explicitly supplies another key. For any repeatable target, prefer
`AIGO_INSTANCE_CONFIG=instances/<name>.json` over ad hoc environment variables.
If the key changes, update default JQL, Automation placeholders, and seed
instructions together.

## Safety Rules

- The app may analyze, draft, classify, route, summarize, and recommend.
- It must not approve claims, send campaigns, mutate audiences or suppression,
  launch experiments, change production signup flows, delete issues, or change
  permissions.
- The intended app mutation is an AI-labeled Jira comment via
  `addAnalysisComment`.
- The Creative Claims Automation transition to `Claims Review` is allowed for
  this project only when the user has explicitly selected that routing behavior.

## Troubleshooting Priorities

- `401/403`: check Forge install, consented scopes, Rovo enablement, and Jira
  project permissions.
- `404`: check Jira site URL, issue key, app visibility, and issue security.
- Missing comments in analysis: inspect comment permissions and `getIssueContext`
  behavior before assuming there are no comments.
- Rovo agent missing: verify `manifest.yml` agent keys, `read:chat:rovo`, deploy
  environment, and site Rovo availability.
- Automation import failure: reselect the "Use Rovo agent" action in the Jira UI
  and reapply the agent key placeholders manually.

## References

- `references/setup.md` - Forge CLI, deploy/install, project/workflow setup
- `references/seed-data.md` - canonical AIGO seed issue set
- `references/smoke-tests.md` - manual and Automation verification checklist
