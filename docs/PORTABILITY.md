<!-- generated_by: scripts/docs/generate.mjs -->
# Portable Jira Instance Provisioning

This repo should be reusable for many Jira Cloud sites and many Jira projects,
not just one `AIGO` board. The scalable pattern is:

1. Keep one Forge/Rovo app in this repo.
2. Install that app into each Jira Cloud site.
3. Represent each Jira project/board as an instance config.
4. Clone Jira project configuration from a golden template project when
   available.
5. Render seed data and checks from the instance config.
6. Rebuild Jira Automation rules from the documented templates, import them via
   the Jira Automation UI/export-import flow, or use a documented public API if
   Atlassian exposes one.

## Why Not Terraform

There is no complete first-party Terraform provider for general Jira Cloud
project configuration covering projects, issue types, workflows, boards,
filters, Automation rules, and Rovo agents. The reliable Atlassian-supported
interfaces for this MVP are:

- Forge CLI for app deployment and app installation per site.
- Atlassian CLI for supported Jira project, work-item, field, filter, and
  dashboard primitives.
- Jira UI, golden project cloning, or documented Jira REST APIs for workflow,
  issue-type scheme, screen, board, Rovo visibility, and Automation
  configuration that ACLI does not expose cleanly.

For scale, use a golden company-managed Jira project as the configuration
template. ACLI can create a new project from that project, which carries much
more configuration than a fresh team-managed project.

## ACLI Capability Inventory

Use ACLI first where Atlassian exposes a supported command group. Validate the
exact subcommand flags with `acli <group> --help` before adding scripts, because
the CLI is still evolving.

| Jira surface | ACLI command group | Use in this repo | Remaining gap |
|---|---|---|---|
| Project | `acli jira project` | List/view target projects; create from a golden company-managed template when `templateProjectKey` is set. | Team-managed project setup, schemes, workflows, screens, and boards still need Jira UI, golden templates, or documented REST. |
| Work items | `acli jira workitem` | Search with JQL, count seed coverage, bulk-create seed issues from CSV, edit/retype seed issues, and transition test issues where supported. | Does not prove hidden workflow states, board column wiring, Rovo behavior, or Automation rule execution. |
| Fields | `acli jira field` | Inventory/verify field availability before relying on Jira REST fallback scripts. | Custom field creation, context/options, and screen placement may still require documented REST or UI checks depending on CLI coverage. |
| Filters | `acli jira filter` | Search or inspect saved filters when validating portable queue configuration. | Current provisioning still uses documented Jira REST for idempotent create/update behavior. |
| Dashboards | `acli jira dashboard` | Inspect dashboard presence when validating a cloned or provisioned project. | Gadget layout/configuration can still require Jira REST or manual UI repair if gadget APIs return 404. |

Do not use ACLI as a proxy for Rovo or Automation proof. Actual Rovo agent
visibility requires Jira UI or public API evidence, and native Automation proof
requires an audit-log row from a rule that runs the **Use Rovo agent** action.

## Tracked NIH-Reduction Portability Tasks

Keep these tasks open until the linked evidence or final decision note exists.
If another worker has already landed part of the implementation, reference that
work rather than marking the task complete here.

| Task | Scope | Acceptance |
|---|---|---|
| T-NIH-03 | ACLI capability inventory for project, workitem, field, filter, and dashboard commands. | Native command owner, coverage, gaps, and supported fallback are documented for each resource. |
| T-NIH-04 | Golden template project validation. | A disposable clone passes readiness for issue types, statuses, screens, fields, board columns, queues, filters, dashboards, seeds, and Automation placeholders with fewer custom REST mutations than fresh provisioning. |
| T-NIH-05 | Atlassian product adoption spike. | JPD, Assets, Confluence, Analytics/Data Lake, and Goals each have a fit recommendation, prerequisites, custom-code reduction estimate, blockers, and rollback/manual fallback. |
| T-NIH-06 | Third-party Terraform disposable-site spike. | Create, import, plan, drift detection, and destroy behavior are proven in a disposable site before any production `.tf` resources are added. |
| T-NIH-07 | Custom script label inventory. | Every supported script is labeled `native wrapper`, `documented API gap`, or `Twin-specific logic`. |

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

T-NIH-06 acceptance:
- Use a disposable Jira site/project, not the reference development project.
- Test project configuration and Automation surfaces separately.
- Record create, import, plan, drift, destroy, unsupported-resource, provider
  maturity, and rollback results.
- Keep Forge, ACLI, documented Jira REST APIs, and golden-template cloning as
  the supported path unless the spike proves Terraform is smaller and safer.

## Atlassian Product Adoption Spike

T-NIH-05 evaluates whether native Atlassian products should own surfaces that
are currently modeled with custom issue types, fields, dashboards, or scripts.

| Product | Candidate ownership | Fallback until adopted |
|---|---|---|
| Jira Product Discovery | Ideas, insights, prioritization, and delivery links. | Jira issue types and labels for discovery work. |
| JSM Assets | Employers, partners, segments, services, and reusable launch objects. | Jira custom fields and issue links. |
| Confluence | Claims rules, SOPs, approved messaging, research synthesis, and prompt source references. | Versioned repo policy/prompt files plus Jira comments. |
| Analytics/Data Lake | Weekly readouts, dashboards, trend metrics, and decision evidence. | Jira filters, dashboards, and agent-generated decision memos. |
| Goals/Projects | Outcome rollups and cross-product alignment. | Jira links, labels, dashboards, and Decision Memo issues. |

Acceptance for T-NIH-05:
- Each product has a sample mapping, licensing/admin prerequisites, migration
  cost, custom-code reduction estimate, blockers, and rollback/manual fallback.
- The decision is `adopt`, `defer`, or `reject` for each product.
- No product becomes a critical-path dependency without tenant access and a
  documented fallback.

## Verified Staging State

The development site is the reference instance. The tables below are generated
from `infra/` state — do not hand-edit them; run `node scripts/docs/generate.mjs`.

<!-- BEGIN generated:staging-state -->
Verified staging state for `myhealthcaresite.atlassian.net` (project `AIGO`, id 10000, cloud 76683cc1-6501-400f-8b59-01eaad4418d2):

| Resource | Count | Reconcile command |
| --- | --- | --- |
| Managed issue types | 13 | `npm run infra:apply` |
| Custom fields | 8 | `npm run infra:apply` |
| JQL saved filters | 7 | `npm run infra:apply` |
| Workflow statuses | 3 | `npm run infra:apply` |
| Dashboards | 6 | `npm run infra:apply` |
| Seed issues | 15 | `npm run infra:apply` |
| Automation rules | 5 | `npm run infra:apply` |
<!-- END generated:staging-state -->

### Issue types

<!-- BEGIN generated:issue-types -->
13 managed AIGO issue types (IDs 10048–10060):

| Issue type | ID |
| --- | --- |
| AI Growth Request | 10048 |
| Creative Request | 10049 |
| Experiment | 10050 |
| Segmentation Request | 10051 |
| Personalization Journey | 10052 |
| Employer Launch | 10053 |
| Campaign | 10054 |
| Dashboard Request | 10055 |
| Signup Funnel Issue | 10056 |
| Research Brief | 10057 |
| Claims Review | 10058 |
| Decision Memo | 10059 |
| Positioning Update | 10060 |
<!-- END generated:issue-types -->

### Custom fields

<!-- BEGIN generated:fields -->
8 custom fields:

| Field | ID | Type |
| --- | --- | --- |
| Project | customfield_10034 | atlas-project |
| Design | customfield_10037 | array |
| Rank | customfield_10019 | any |
| Start date | customfield_10015 | date |
| Category | customfield_10040 | option |
| Budget | customfield_10041 | number |
| Development | customfield_10000 | any |
| Team | customfield_10001 | team |
<!-- END generated:fields -->

### Saved filters

<!-- BEGIN generated:filters -->
7 saved JQL filters:

| Filter | ID | JQL |
| --- | --- | --- |
| AIGO — Blocked | 10005 | `project = AIGO AND (labels = "blocked" OR (status in ("Triage", "Spec Ready", "In Review") AND updated <= "-7d")) ORDER BY updated ASC` |
| AIGO — Claims Review | 10001 | `project = AIGO AND status = "Claims Review" ORDER BY priority DESC, created DESC` |
| AIGO — Decision Needed | 10004 | `project = AIGO AND status = "Decision Needed" ORDER BY updated ASC` |
| AIGO — Experiment Running | 10006 | `project = AIGO AND status = "Experiment Running" ORDER BY created DESC` |
| AIGO — Intake | 10000 | `project = AIGO AND status = "Intake" ORDER BY created DESC` |
| AIGO — Launch Readiness | 10002 | `project = AIGO AND status = "Launch Prep" ORDER BY created DESC` |
| AIGO — Readout Needed | 10003 | `project = AIGO AND labels = "readout-needed" ORDER BY updated DESC` |
<!-- END generated:filters -->

Evidence files: `evidence/jira-config/` and `evidence/docs/generate.json`.

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

Current single-shot orchestrator:

```bash
# 1. Validate (no mutations)
npm run provision:all -- --dry-run --config instances/customer.json

# 2. Full provision (edit instances/customer.json first)
npm run provision:all -- --config instances/customer.json --site customer.atlassian.net
```

This runs the current scripted steps: forge lint → forge deploy → forge install
→ provision:jira → forge variables set → forge redeploy → provision:seeds →
experimental provision:automation:forge → test:smoke:jira → check:rovo.

`check:rovo` is a manifest/install check, not actual Rovo UI visibility proof.
`provision:automation:forge` is a staging helper that relies on private/internal
Automation endpoints; it is not the supported portability path.

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
npm run provision:automation:forge   # experimental private/internal Automation import helper
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
2. Configure the 14 issue types, workflows, statuses, screens, fields, and board
   layout there.
3. Validate Rovo agents in the UI/API and native Automation audit logs in one clone.
4. For each new project, set `templateProjectKey` in the instance config.
5. Run `npm run provision:instance -- --project` to create the new project from
   the template.

If no template project is available, the script can create a basic project from
key/name. That project still needs manual Jira configuration before the full MVP
readiness check passes.

T-NIH-04 validation must use a disposable clone and record:

- Template and clone project keys.
- Which resources came from the template, ACLI, Jira REST, UI/manual setup, or
  repo scripts.
- Readiness result for issue types, statuses, transition paths, required fields,
  screens, board columns, queues, filters, dashboards, seeds, Rovo UI visibility
  checks, and Automation placeholders/audit-log checks.
- The custom REST mutation count compared with fresh provisioning.
- Follow-up gaps instead of hidden script mutations.

## Custom Script Labels

T-NIH-07 requires every supported script to have exactly one long-term label:

| Label | Meaning |
|---|---|
| `native wrapper` | Thin orchestration around Forge, ACLI, documented Jira REST, or template cloning. |
| `documented API gap` | Temporary script for a public/documented surface that native tools do not cover cleanly. |
| `Twin-specific logic` | Repo-owned policy, agent behavior, safety checks, evidence rendering, or instance binding. |

Acceptance for T-NIH-07:
- Every supported `scripts/*` entrypoint is inventoried with one label.
- Gap scripts name the missing native capability and the documented endpoint or
  manual fallback.
- Scripts using private endpoints cannot be part of the supported portability
  path.

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
- Automation rule JSON is staged for import/rebuild. The experimental Forge
  importer can prove a disabled staging import, but it is not the supported
  portability path.

Manual Jira validation is still required for:

- Rovo agent visibility in the Jira UI or a public Rovo listing API if
  Atlassian exposes one.
- Board column → status wiring (Project settings → Board).
- Workflow transition paths (company-managed projects only; verified via test issues).
- Jira Automation: using the native **Use Rovo agent** action, triggering each
  rule on a seed issue, and capturing audit-log evidence.
- Dashboard gadget configuration if gadget API calls return 404 (add manually).

## Per-Instance MVP Checklist

For every new Jira site/project:

1. **Create instance config**: copy `instances/aigo.example.json` → `instances/<name>.json`. Fill in `site`, `cloudId`, `projectId`, `actorAccountId`, `projectKey`.
2. **Dry-run**: `npm run provision:all -- --dry-run --config instances/<name>.json`
3. **Deploy**: `forge deploy -e development`
4. **Install** (accept the current manifest scopes; `manage:jira-configuration`
   is only needed if intentionally running the experimental Forge importer):
   `forge install -e development -p jira --site <site> --confirm-scopes`
5. **Provision Jira**: `node scripts/provision-jira.cjs --config instances/<name>.json`
   - Creates issue types, custom fields, workflow statuses, field options.
   - Generates `evidence/jira-config/forge-vars.sh`.
6. **Apply Forge variables**: `bash evidence/jira-config/forge-vars.sh`
7. **Redeploy**: `forge deploy -e development` (picks up new variable bindings)
8. **Seed issues**: `node scripts/provision-seeds.cjs --config instances/<name>.json`
9. **JQL filters**: `AIGO_CLOUD_ID=<cloudId> node scripts/provision-filters.cjs`
10. **Dashboards**: `AIGO_CLOUD_ID=<cloudId> node scripts/provision-dashboards.cjs`
11. **Automation rules**: rebuild from `automation/jira-automation-rules.md` or
    import rendered JSON through Jira Automation UI/export-import. Use
    `npm run provision:automation:forge` only as experimental staging evidence,
    not as the supported path.
12. **Smoke + readiness**: `npm run test:smoke:jira && npm run test:readiness:jira`
13. **UI steps** (manual):
    - Board → add 8 statuses to columns.
    - `Apps → Rovo → Agents` → confirm all 19 visible and capture UI/API evidence.
    - Automation → wire the native **Use Rovo agent** action, trigger each rule, verify the audit log, capture to `evidence/automation/<rule>-audit.md`. **Requires Rovo/AI active for the org/site** — current Atlassian docs say Rovo is included with paid Standard, Premium, and Enterprise subscriptions; Free subscriptions cannot use Rovo, and orgs need a verified business domain. See `skills/jira-automation-rovo-setup/SKILL.md` and `docs/TROUBLESHOOTING.md` → "Use agent blocked".
14. **Manual agent checks**: T-M4-01 through T-M4-06 (6 seed issue runs).

Or use the single-shot orchestrator for steps 2–12:
```bash
npm run provision:all -- --config instances/<name>.json --site <site>
```
