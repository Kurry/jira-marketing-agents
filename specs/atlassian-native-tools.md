# Atlassian-Native Tools and NIH Reduction Plan

Date: 2026-06-15

## Purpose

This repo should build the Jira-native AI Growth Ops control plane without
re-implementing Atlassian products. The default decision rule is:

Use Atlassian-native capabilities first. Keep custom code only when it expresses
Twin-specific policy, agent logic, safety rules, evidence generation, or a
documented platform gap.

## Current Direction

Keep the core platform:

- Forge for app runtime, Rovo agents, actions, workflow modules, storage,
  scheduled triggers, and webtriggers.
- Jira Automation or Studio automation for event and schedule orchestration.
- ACLI for supported Jira project, field, filter, dashboard, and work item
  primitives.
- Jira REST APIs for documented Jira admin surfaces that ACLI does not cover.
- Golden company-managed Jira template projects for configuration that is hard
  to express through public APIs.

Do not build a general Atlassian Terraform replacement in this repo unless a
bounded spike proves that official APIs cannot meet the portability target and
the custom layer is smaller than the manual work it removes.

## Source Checks

Documentation checked through Context7 and official Atlassian/GitHub sources:

- Forge Rovo agent manifest module:
  https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/
- Forge workflow modules:
  https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-validator/
  https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-condition/
  https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-post-function/
- Forge webtriggers:
  https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/
- Atlassian CLI Jira commands:
  https://developer.atlassian.com/cloud/acli/reference/commands/jira-project/
  https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem/
  https://developer.atlassian.com/cloud/acli/reference/commands/jira-field/
  https://developer.atlassian.com/cloud/acli/reference/commands/jira-filter/
  https://developer.atlassian.com/cloud/acli/reference/commands/jira-dashboard/
- Rovo in automation:
  https://support.atlassian.com/studio/docs/use-rovo-in-an-automation-rule/
- Jira Product Discovery:
  https://support.atlassian.com/jira-product-discovery/docs/what-is-jira-product-discovery/
- JSM Assets:
  https://support.atlassian.com/jira-service-management-cloud/docs/build-an-object-schema-for-it-asset-management-itam/
- Atlassian Analytics:
  https://support.atlassian.com/analytics/resources/
  https://support.atlassian.com/analytics/docs/what-is-the-atlassian-data-lake/
- Atlassian Goals and Projects:
  https://support.atlassian.com/platform-experiences/docs/track-goals-and-projects-across-atlassian-products/
  https://support.atlassian.com/platform-experiences/docs/use-goals-and-projects-in-jira/
- Compass:
  https://support.atlassian.com/compass/docs/what-is-compass/
- Bitbucket Cloud:
  https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-cloud/
- Official Atlassian Operations Terraform provider:
  https://github.com/atlassian/terraform-provider-atlassian-operations

## NIH Risk Findings

1. `scripts/provision-automation.cjs` uses a documented-looking REST path first,
   then falls back to `gateway/api/automation/internal-api/...`. The fallback is
   an internal API dependency and should not be a long-term portability
   foundation.
2. `scripts/check-rovo-visibility.cjs` infers Rovo UI visibility from
   `manifest.yml` plus `forge install list` and currently says agents are
   "guaranteed visible." That should be downgraded to "manifest/install
   verified; UI/API confirmation still required" unless Atlassian exposes a
   public agent listing API.
3. `src/webtrigger.ts` is useful as a controlled operator fallback, but it
   should not be the primary proof that Jira Automation has invoked Rovo. The
   primary proof should be Jira Automation audit-log evidence from the native
   "Use Rovo agent" action.
4. `specs/agent-team/` v2 pushes toward a bespoke `infra/` reconciler and
   three-command IaC contract. That may be useful as an audit harness, but it is
   not yet proven to be smaller or safer than Forge CLI, ACLI, Jira REST, and a
   golden template project.
5. The repo has overlapping provisioning entrypoints (`provision-jira`,
   `provision-instance`, `provision-all`, filters, dashboards, automation,
   seeds). This is acceptable for MVP, but the long-term portable path should
   wrap native primitives rather than build a parallel product model.
6. Some docs still treat webtrigger comments as completion of Jira Automation
   Rovo wiring. The evidence record should keep those separate:
   webtrigger fallback complete, native Automation/Rovo audit proof pending.

## Native Tool Fit Matrix

| Need | Use first | Keep custom only for |
| --- | --- | --- |
| Agent runtime | Forge `rovo:agent`, `action`, `function`, prompt resources | Twin-specific prompts, handlers, safety output schema |
| Agent event triggers | Jira Automation or Studio "Use Rovo agent" action | Temporary webtrigger fallback and audit harness |
| Workflow gates | Forge workflow validator, condition, post-function modules on company-managed projects | Human-gate logic that Atlassian modules cannot express |
| Project/work item operations | ACLI `jira project`, `jira workitem`, `jira field`, `jira filter`, `jira dashboard` commands | Gaps in ACLI coverage, with documented REST fallback |
| Jira admin configuration | Golden company-managed template project plus documented Jira REST APIs | Thin scripts for issue types, fields, statuses, field options, and checks |
| Automation import | Native Jira Automation UI/export/import or documented API if available | Disabled JSON rendering and validation; no internal API as primary path |
| Ideas and product discovery | Jira Product Discovery | Only growth-specific issue types that truly need execution workflow |
| Employers, partners, segments, services | JSM Assets, if licensed | Minimal custom fields when Assets is unavailable |
| Knowledge and SOPs | Confluence pages, databases, and knowledge sources | Prompt pack and claims policy files that must version with code |
| Weekly readouts and dashboards | Atlassian Analytics/Data Lake where available; Jira dashboards/filters otherwise | Agent-generated decision memo comments and evidence files |
| Outcome alignment | Atlassian Goals/Projects if available in the tenant | Jira issue links and labels until Goals is adopted |
| Software component catalog | Compass for Forge app ownership/scorecards if software ops grows | Repo-local status files for MVP only |
| Source control and CI | Keep GitHub unless the team moves to Bitbucket | Bitbucket Pipelines only after source migration |
| Async context | Loom for walkthroughs/readouts | Repo docs/evidence for machine-verifiable state |
| Terraform | Official Atlassian Operations provider only for JSM/Compass ops resources | Third-party provider spike, not critical path |

## What Should Stay Custom

- Pure TypeScript domain modules in `src/` for triage, claims risk,
  experimentation, employer launch planning, readouts, and funnel analysis.
- Prompt files and policy files that encode Twin-specific growth, claims, and
  safety behavior.
- `src/comments.ts` and ADF rendering for clearly labeled AI analysis comments.
- Tests that enforce no claims approval, no campaign send, no audience mutation,
  no suppression mutation, and no production signup-flow mutation.
- Instance config and evidence generation, as long as they bind native tools
  rather than replacing them.

## What Should Move Native Or Be Reduced

1. Automation import:
   - Keep JSON templates and validation.
   - Remove internal API reliance from the supported path.
   - Prefer Jira Automation UI import, Studio automation, or documented public
     APIs. If no public API exists, mark it as a platform blocker instead of
     hiding it behind an internal fallback.
2. Rovo visibility:
   - Rename `check:rovo` output from "visibility" to "manifest/install check"
     unless it performs a UI/API listing.
   - Keep manual/browser confirmation or native Atlassian UI evidence for actual
     visibility.
3. IaC hard reset:
   - Treat `specs/agent-team/` v2 as an audit proposal, not the authoritative
     architecture.
   - Do not build a full `infra/` reconciler until each native surface has been
     evaluated and the gaps are documented.
4. Jira project configuration:
   - Make the golden template project the scale path.
   - Use ACLI project/work item/field/filter/dashboard commands where they
     exist.
   - Keep REST scripts thin and explicitly tied to documented endpoints.
5. Product/workflow modeling:
   - Use Jira Product Discovery for idea capture, insights, prioritization, and
     links to delivery where the work is discovery rather than execution.
   - Use JSM Assets for reusable business entities if available.
   - Use Confluence for claims rules, SOPs, approved messaging, and research
     synthesis.

## Recommended Architecture Boundary

```text
Atlassian-native layer
  Forge app install/deploy
  Rovo agents/actions
  Jira Automation/Studio rules
  ACLI project/work item/field/filter/dashboard commands
  Jira REST documented admin APIs
  Golden template Jira projects
  Optional JPD / Assets / Confluence / Analytics / Goals

Repo-owned layer
  Twin prompts and policies
  Pure TypeScript domain logic
  AI-labeled comment rendering
  Safety tests and manifest contract tests
  Instance config and evidence harness
  Small fallback scripts for documented platform gaps
```

## Near-Term Tasks

- `[ ]` Replace "guaranteed visible" wording in `scripts/check-rovo-visibility.cjs`
  and docs with "manifest/install verified; UI confirmation pending" unless a
  public Rovo listing API is added.
- `[ ]` Split MVP evidence into two rows: webtrigger fallback proof and native
  Jira Automation/Rovo audit-log proof.
- `[ ]` Remove `gateway/api/automation/internal-api/...` from the supported
  automation import path or mark it explicitly experimental.
- `[ ]` Remove `fn-import-automation` and the `manage:jira-configuration` scope
  if the Automation importer is retired from the supported path.
- `[ ]` Reconcile any README language that implies there are no manual UI steps;
  Rovo UI visibility and native Automation/Rovo audit-log checks are still
  product-gated unless Atlassian exposes public APIs for them.
- `[ ]` Add an ACLI capability inventory to `docs/PORTABILITY.md` covering
  project, workitem, field, filter, and dashboard commands.
- `[ ]` Add a golden-template project validation task that proves a new project
  clone can pass readiness with fewer custom REST mutations.
- `[ ]` Add a bounded "Atlassian product adoption" spike:
  Jira Product Discovery for ideas/insights, JSM Assets for employer/segment
  objects, Confluence for claims/SOP knowledge, Analytics for readouts, and
  Goals for outcome rollups.
- `[ ]` Keep third-party Terraform providers in a disposable-site spike only;
  do not add `.tf` resources to the critical path until import, plan, drift,
  and destroy behavior are proven.

## Acceptance Criteria

- The supported path names the Atlassian-native owner for every platform
  concern.
- Every custom script has one of three labels: native wrapper, documented API
  gap, or Twin-specific logic.
- No production docs claim native Jira Automation/Rovo proof when the evidence
  came from the Forge webtrigger fallback.
- The portability path can be repeated for many Jira sites/projects without
  depending on private Atlassian endpoints.
