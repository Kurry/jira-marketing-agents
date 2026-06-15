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

## Verified Staging State (2026-06-15)

The development site `myhealthcaresite.atlassian.net` is the reference instance.
Everything listed here has been verified live:

| Resource | Count | How to re-provision |
|---|---|---|
| Canonical issue types | 14 (IDs 10048–10061) | `npm run provision:jira` |
| Custom fields | 6 (IDs 10043–10048) | `npm run provision:jira` |
| Workflow statuses | 8 | `npm run provision:jira` |
| Field options | 24 across 4 fields | `npm run provision:jira` |
| JQL saved filters | 7 (IDs 10000–10006) | `npm run provision:filters` |
| Dashboards | 6 | `npm run provision:dashboards` |
| Seed issues | 15 (all canonical types) | `npm run provision:seeds` |
| Automation rules | 5 rendered (import pending) | `npm run provision:automation:forge` |
| Rovo agents | 19 in manifest | `forge deploy -e development` |

Evidence files: `evidence/jira-config/` (issue-types.json, custom-fields.json,
queues.md, dashboards.md, seeds-output.json, forge-vars.sh)

## Instance Config

Create a JSON file per Jira target. Required fields for the full IaC suite:

```json
{
  "site": "customer.atlassian.net",
  "forgeEnvironment": "development",
  "projectKey": "CUST",
  "projectName": "Customer Growth Ops",
  "projectDescription": "Customer Growth Ops workspace.",
  "seedLabel": "aigo-seed",
  "minSeedCount": 15,
  "cloudId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "projectId": "10000",
  "actorAccountId": "557058:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "templateProjectKey": "AIGOTPL",
  "seedTemplate": "automation/seed/aigo-seed-issues.csv",
  "renderedSeedFile": "automation/seed/generated/CUST-seed-issues.csv",
  "automationRulesFile": "automation/rules/aigo-automation-ruleset.json"
}
```

- `cloudId` — from `GET https://api.atlassian.com/oauth/token/accessible-resources`
- `projectId` — from `GET /rest/api/3/project/CUST` → `.id`
- `actorAccountId` — the Atlassian account ID of the automation rule actor (the user who appears as the rule's actor in Jira Automation)

Do not commit customer-specific secrets. Instance files should contain site and
project identifiers only — no tokens.

## Commands

Full provision in one shot (preferred):

```bash
# 1. Validate (no mutations)
npm run provision:all -- --dry-run --config instances/customer.json

# 2. Full provision (edit instances/customer.json first)
npm run provision:all -- --config instances/customer.json --site customer.atlassian.net
```

This runs all steps: forge lint → forge deploy → forge install → provision:jira →
forge variables set → forge redeploy → provision:seeds → provision:automation:forge →
test:smoke:jira → check:rovo.

Render seed data for an instance:

```bash
AIGO_INSTANCE_CONFIG=instances/customer.json npm run seed:render
```

Run individual steps:

```bash
node scripts/provision-jira.cjs --config instances/customer.json
node scripts/provision-seeds.cjs --config instances/customer.json
node scripts/provision-filters.cjs   # uses AIGO_CLOUD_ID + AIGO_PROJECT_KEY env vars
node scripts/provision-dashboards.cjs  # uses AIGO_CLOUD_ID + filter IDs env vars
npm run provision:automation:forge   # uses instances/aigo.example.json by default
```

Dry-run individual scripts:

```bash
node scripts/provision-jira.cjs --dry-run
node scripts/provision-seeds.cjs --dry-run
node scripts/provision-dashboards.cjs --dry-run
node scripts/forge-import-automation.cjs --dry-run
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
- The target Jira project exists and has the expected issue types (all 14).
- Seed issues exist with the configured label and correct canonical types.
- Custom fields exist with correct IDs and are mapped to Forge variables.
- Workflow statuses exist (by ID scan).
- Field options are present on select fields.
- JQL saved filters exist by name (IDs stable for dashboard references).
- Automation rule JSON is rendered with no unfilled `{{ALL_CAPS}}` placeholders.
- Automation rules are imported as DISABLED via Forge function (when deployed).

Manual Jira validation is still required for:

- Rovo agent visibility in the Jira UI (`Apps → Rovo → Agents`).
- Board column → status wiring (Project settings → Board).
- Workflow transition paths (company-managed projects only; verified via test issues).
- Jira Automation: enabling each rule, triggering on a seed issue, capturing audit log.
- Dashboard gadget configuration if gadget API calls return 404 (add manually).

## Per-Instance MVP Checklist

For every new Jira site/project:

1. **Create instance config**: copy `instances/aigo.example.json` → `instances/<name>.json`. Fill in `site`, `cloudId`, `projectId`, `actorAccountId`, `projectKey`.
2. **Dry-run**: `npm run provision:all -- --dry-run --config instances/<name>.json`
3. **Deploy**: `forge deploy -e development`
4. **Install** (accept all 4 scopes including `manage:jira-configuration`):
   `forge install -e development -p jira --site <site> --confirm-scopes`
5. **Provision Jira**: `node scripts/provision-jira.cjs --config instances/<name>.json`
   - Creates issue types, custom fields, workflow statuses, field options.
   - Generates `evidence/jira-config/forge-vars.sh`.
6. **Apply Forge variables**: `bash evidence/jira-config/forge-vars.sh`
7. **Redeploy**: `forge deploy -e development` (picks up new variable bindings)
8. **Seed issues**: `node scripts/provision-seeds.cjs --config instances/<name>.json`
9. **JQL filters**: `AIGO_CLOUD_ID=<cloudId> node scripts/provision-filters.cjs`
10. **Dashboards**: `AIGO_CLOUD_ID=<cloudId> node scripts/provision-dashboards.cjs`
11. **Import automation rules** (Forge function): `npm run provision:automation:forge`
12. **Smoke + readiness**: `npm run test:smoke:jira && npm run test:readiness:jira`
13. **UI steps** (manual):
    - Board → add 8 statuses to columns.
    - `Apps → Rovo → Agents` → confirm all 19 visible.
    - Automation → enable each rule, verify audit log, capture to `evidence/automation/<rule>-audit.md`. **Requires Rovo/AI active for the org/site** — current Atlassian docs say Rovo is included with paid Standard, Premium, and Enterprise subscriptions; Free subscriptions cannot use Rovo, and orgs need a verified business domain. See `skills/jira-automation-rovo-setup/SKILL.md` and `docs/TROUBLESHOOTING.md` → "Use agent blocked".
14. **Manual agent checks**: T-M4-01 through T-M4-06 (6 seed issue runs).

Or use the single-shot orchestrator for steps 2–12:
```bash
npm run provision:all -- --config instances/<name>.json --site <site>
```
