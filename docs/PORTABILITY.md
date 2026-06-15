# Portable Jira Instance Provisioning

This repo should be reusable for many Jira Cloud sites and many Jira projects,
not just one `AIGO` board. The scalable pattern is:

1. Keep one Forge/Rovo app in this repo.
2. Install that app into each Jira Cloud site.
3. Represent each Jira project/board as an instance config.
4. Clone Jira project configuration from a golden template project when
   available.
5. Render seed data and checks from the instance config.
6. Import or rebuild Jira Automation rules with instance-specific placeholders.

## Why Not Terraform

There is no complete first-party Terraform provider for general Jira Cloud
project configuration covering projects, issue types, workflows, boards,
filters, Automation rules, and Rovo agents. The reliable Atlassian-supported
interfaces for this MVP are:

- Forge CLI for app deployment and app installation per site.
- Atlassian CLI for project create/view and work-item bulk import.
- Jira UI or project cloning for workflow, issue-type, screen, and Automation
  configuration that ACLI does not expose cleanly.

For scale, use a golden company-managed Jira project as the configuration
template. ACLI can create a new project from that project, which carries much
more configuration than a fresh team-managed project.

## Terraform Provider Shortlist

Evaluate Terraform after the Jira control plane is stable. Use a disposable Jira
site/project and prove create, import, plan, drift, and destroy behavior before
making any provider part of the supported setup path.

- [`atlassian/terraform-provider-atlassian-operations`](https://github.com/atlassian/terraform-provider-atlassian-operations):
  official Atlassian provider for JSM/Compass operations resources, not general
  Jira project/workflow configuration.
- [`gothub97/terraform-provider-atlassian`](https://github.com/gothub97/terraform-provider-atlassian):
  experimental Jira Cloud provider candidate with project, field, screen,
  status, workflow, and scheme resources.
- [`lbajsarowicz/terraform-provider-atlassian`](https://github.com/lbajsarowicz/terraform-provider-atlassian):
  experimental Jira/Confluence config-as-code provider candidate with import and
  drift-detection claims.
- [`fourplusone/terraform-provider-jira`](https://github.com/fourplusone/terraform-provider-jira):
  older Jira provider with project, issue type, filter, group, issue, role,
  user, and webhook resources.
- [`Vestmark/terraform-provider-jira`](https://github.com/Vestmark/terraform-provider-jira):
  fork/variant of the older Jira provider; do not assume modern Jira Cloud
  workflow coverage without testing.
- [`alc0der/terraform-provider-jira-automation`](https://github.com/alc0der/terraform-provider-jira-automation):
  Jira Automation rule provider candidate with raw JSON fallback.

## Instance Config

Create a JSON file per Jira target. Start from
[`../instances/aigo.example.json`](../instances/aigo.example.json):

```json
{
  "site": "customer.atlassian.net",
  "forgeEnvironment": "development",
  "projectKey": "CUST",
  "projectName": "Customer Growth Ops",
  "projectDescription": "Customer Growth Ops workspace.",
  "seedLabel": "aigo-seed",
  "minSeedCount": 15,
  "templateProjectKey": "AIGOTPL",
  "seedTemplate": "automation/seed/aigo-seed-issues.csv",
  "renderedSeedFile": "automation/seed/generated/CUST-seed-issues.csv",
  "automationRulesFile": "automation/rules/aigo-automation-ruleset.json"
}
```

Do not commit customer-specific secrets. Instance files should contain site and
project identifiers only.

## Commands

Render seed data for an instance:

```bash
AIGO_INSTANCE_CONFIG=instances/customer.json npm run seed:render
```

Dry-run the full flow:

```bash
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --all --dry-run
```

Run individual steps:

```bash
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --install-forge
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --project
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --seed
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --smoke
AIGO_INSTANCE_CONFIG=instances/customer.json npm run provision:instance -- --readiness
```

The same scripts also accept environment variables:

```bash
JIRA_SITE=customer.atlassian.net \
AIGO_PROJECT_KEY=CUST \
AIGO_PROJECT_NAME="Customer Growth Ops" \
AIGO_TEMPLATE_PROJECT_KEY=AIGOTPL \
npm run provision:instance -- --project --seed
```

## Golden Template Project

Recommended for repeatable Jira configuration:

1. Create one company-managed template project, for example `AIGOTPL`.
2. Configure the 12 issue types, workflows, statuses, screens, fields, and board
   layout there.
3. Validate Rovo agents and Automation in one clone.
4. For each new project, set `templateProjectKey` in the instance config.
5. Run `npm run provision:instance -- --project` to create the new project from
   the template.

If no template project is available, the script can create a basic project from
key/name. That project still needs manual Jira configuration before the full MVP
readiness check passes.

## What The Scripts Can Prove

Automated checks can verify:

- Forge app deploy/install commands ran for a specific site.
- The target Jira project exists.
- Seed issues exist with the configured label.
- Expected issue types are present on the project.
- Seeded issues occupy some observed statuses.

Manual Jira validation is still required for:

- Rovo agent visibility in the Jira UI.
- Team-managed workflow statuses that are not visible on issues.
- Workflow transition paths.
- Jira Automation import, actor, Rovo agent selection, enablement, and audit
  logs.

## Per-Instance MVP Checklist

For every new Jira site/project:

1. Create `instances/<name>.json`.
2. `AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --all --dry-run`.
3. `AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --install-forge`.
4. `AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --project`.
5. Configure or clone issue types/workflows if readiness reports gaps.
6. `AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --seed`.
7. `AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --smoke --readiness`.
8. Confirm all 19 Rovo agents in Jira/Rovo.
9. Import/rebuild Automation rules and validate each audit log.
10. Run the six manual Rovo agent checks from [`../specs/tasks.md`](../specs/tasks.md).
