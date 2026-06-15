# Atlassian-Native Tools and NIH Reduction Plan

Date: 2026-06-15
Status: **Proposal.** Aligns the architecture to the Atlassian-native / NIH-reduction
direction. Does not supersede the current spec until the architect + safety
reviewer accept the `specs/v2/` set.
Supersedes: `specs/atlassian-native-tools.md`

## Purpose

This repo builds a Jira-native AI Growth Ops control plane **without
re-implementing Atlassian products**. It is the architecture spine of v2,
paired with [design](design.md). The decision rule, carried verbatim from
[`_CONVENTIONS.md`](_CONVENTIONS.md) §1, governs every other v2 doc:

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

Every spec must name the **Atlassian-native owner** for each platform concern it
touches and justify any remaining custom code against those reasons. "We already
built it" is not a reason. This file carries the authoritative **Native Tool Fit
Matrix** (below) and the **five NIH resolutions**; all other v2 docs must be
consistent with both or route a deviation to the architect.

Canonical counts, names, and per-entity native owners live ONLY in
[`issue-types.md`](issue-types.md), [`custom-fields.md`](custom-fields.md), and
[`workflows.md`](workflows.md). This doc references them and never restates
counts.

## Target Direction

Keep the core platform native-first:

- **Forge** for app runtime, Rovo agents, actions, functions, workflow modules,
  storage, and scheduled triggers. Webtriggers survive only as a controlled
  operator fallback, never as the primary proof of native wiring.
- **Jira Automation or Studio automation** for event and schedule orchestration,
  including the native "Use Rovo agent" action.
- **ACLI** for supported Jira project, field, filter, dashboard, and work item
  primitives.
- **Jira REST APIs** for documented admin surfaces ACLI does not cover.
- **Golden company-managed Jira template project** as the source of truth for
  configuration that is hard to express through public APIs. Provisioning
  scripts demote to clone-diff fallbacks.

Do not build a general Atlassian Terraform replacement, nor a bespoke
per-resource converge engine, before the ACLI inventory (T-NIH-03) and
golden-template validation (T-NIH-04) prove the native surfaces' gaps. The
`infra/` reconciler is reframed as a **read-only audit harness** over native
output (resolution 3 below).

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
- Atlassian Analytics / Data Lake:
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
- ADF utilities for build/traversal (replacing hand-rolled ADF):
  `@atlaskit/adf-utils`

## Native Tool Fit Matrix (authoritative)

This is the LAW for all v2 docs ([`_CONVENTIONS.md`](_CONVENTIONS.md) §2). A doc
that must deviate states so explicitly and routes the deviation to the architect.

| Need | Use first | Keep custom only for |
| --- | --- | --- |
| Agent runtime | Forge `rovo:agent`, `action`, `function`, prompt resources | Twin-specific prompts, handlers, safety output schema |
| Agent event triggers | Jira Automation or Studio "Use Rovo agent" action | Temporary webtrigger fallback and audit harness |
| Workflow gates | Forge workflow validator/condition/post-function modules on company-managed projects | Human-gate logic Atlassian modules cannot express |
| Project/work item operations | ACLI `jira project/workitem/field/filter/dashboard` | Documented REST fallback for ACLI gaps |
| Jira admin configuration | Golden company-managed template project + documented Jira REST | Thin scripts for issue types, fields, statuses, options, checks |
| Automation import | Native Jira Automation UI/export/import or documented API | Disabled JSON rendering + validation; **no internal API as a supported path** |
| Ideas & product discovery | Jira Product Discovery (JPD) | Only growth issue types that truly need execution workflow |
| Employers/partners/segments/services | JSM Assets (if licensed) | Minimal custom fields when Assets unavailable |
| Knowledge & SOPs | Confluence pages/databases/knowledge sources | Prompt pack + claims policy files that version with code |
| Readouts & dashboards | Atlassian Analytics/Data Lake where available; Jira dashboards/filters otherwise | Agent decision-memo comments + evidence files |
| Outcome alignment | Atlassian Goals/Projects if in tenant | Jira issue links/labels until Goals adopted |
| Component catalog | Compass (if software ops grows) | Repo-local status files for MVP only |
| Source/CI | GitHub unless team moves to Bitbucket | Bitbucket Pipelines only after source migration |
| Async context | Loom for walkthroughs/readouts | Repo docs/evidence for machine-verifiable state |
| Terraform | **Official `atlassian/atlassian-operations` provider, JSM/Compass Operations resources only** | Third-party provider spike only; never the Jira control-plane critical path |

## The Five NIH Resolutions

The second-pass review ([`nih-review-2026-06-15.md`](../nih-review-2026-06-15.md))
collapsed ~70 findings (beyond the six prior risk findings) into five
cross-cutting themes. v2 resolves each as follows; every other v2 doc must
reflect these.

1. **Private/internal endpoints removed from all supported paths.** The
   `gateway/api/automation/internal-api` / `rest/cb-automation` surface appeared
   in four places (`provision-automation.cjs`, `fix-automation-triggers.cjs`,
   `verify/automation-audit.mjs`, `audit/jira-snapshot.mjs`), and ACLI's
   undocumented macOS-keychain credential blob was reverse-engineered for OAuth
   tokens (`provision-jira.cjs`, `scripts/lib/jira.mjs`). **Resolution:** route
   all of these to native Jira Automation import/export plus documented
   `ATLASSIAN_TOKEN` env auth. Any remaining internal usage is labeled
   experimental, non-default, and tied to a platform-blocker note. (Prior
   findings #1, #2; tasks T-NIH-02, T-NIH-08.)

2. **A golden company-managed template project is the source of truth**, not a
   hand-built parallel "configured Jira project" product (fields, issue types,
   filters, dashboards, statuses, readiness checks). Provisioning scripts demote
   to clone-diff fallbacks. Segment/partner/service entities move to **JSM
   Assets**; confidence/expected-lift/discovery fields move to **JPD**. Status
   discovery stops scanning a hard-coded ID range and uses a documented
   endpoint or the template. (Tasks T-NIH-04, T-NIH-09, T-NIH-11; canonical
   model in [`issue-types.md`](issue-types.md), [`custom-fields.md`](custom-fields.md),
   [`workflows.md`](workflows.md).)

3. **The `infra/` reconciler is reframed as a read-only audit harness over
   native output.** `scripts/infra/{plan,apply}.mjs` and the
   `infra:plan/apply/verify` contract were a Terraform-equivalent parallel
   control plane duplicating what Forge CLI, ACLI, documented Jira REST, and
   golden-template cloning already own. Its only defensible custom pieces are the
   read-only diff and the staging additive-only safety gate. **Resolution:** no
   per-resource converge engine is built before T-NIH-03 (ACLI inventory) and
   T-NIH-04 (golden-template validation) complete. Mutations route through ACLI /
   golden template / Forge. (Prior finding #4; tasks T-NIH-10.)

4. **Custom inference is no longer presented as native proof.**
   `verify/rovo-agents.mjs` probed one shared webtrigger and emitted "agents
   guaranteed visible / pass:true"; STATUS/RELEASE docs accepted webtrigger
   evidence for a native Automation gate. There is no public Rovo listing API and
   no audit-log was consulted. **Resolution:** webtrigger-fallback evidence and
   native Automation/Rovo audit-log proof are tracked in **separate rows**;
   "visibility" wording becomes "manifest/install check" unless a public Rovo
   listing API exists; manual UI/product-gated steps stay visible in setup and
   readiness docs. (Prior findings #3, #6; task T-NIH-01.)

5. **Generic platform capabilities are delegated, not re-implemented in `src/`.**
   The hand-built ADF node schema + regex Markdown parser (`utils/adf.ts`),
   hand-rolled ADF traversal (`utils/text.ts`), text-relevance duplicate
   detection (`duplicates.ts`), and `backlog.prioritizeBacklog` all duplicate
   library or native surfaces. **Resolution:** adopt `@atlaskit/adf-utils` for
   ADF build + traversal; delegate duplicate retrieval to JQL/Lucene and record
   confirmed dupes via the native "Duplicate" issue link; persist priority/area
   into JPD fields and sort there. `src/jira.ts` (documented v3 `requestJira`
   incl. `/search/jql`) is correct and stays. The Twin-specific
   claims/safety/experiment/audience/campaign modules **stay custom**. (Task
   T-NIH-12, behavior-changing, approval-gated.)

## What Stays Custom

Custom code is justified only by the four allowed reasons. In scope:

- Pure TypeScript Twin-specific domain modules in `src/` — triage, creative
  claims, experiments, employer launch, readouts, funnel, audience, campaign,
  referral, activation, landing page, requirements. (Per-module placement is in
  [design](design.md).)
- Prompt files and policy files that encode Twin-specific growth, claims, and
  safety behavior and must version with code.
- `src/comments.ts` and AI-labeled ADF analysis comment rendering (delegating
  ADF construction to `@atlaskit/adf-utils`).
- Safety tests and manifest contract tests: no claims approval, no campaign
  send, no audience/suppression mutation, no production signup-flow mutation, the
  comment mutation is the only non-GET action.
- Instance config and the evidence harness, as long as they bind native tools
  rather than replacing them.

## What Moves Native Or Is Reduced

1. **Automation import** — keep JSON templates + validation; remove internal API
   reliance from the supported path; prefer Jira Automation UI/Studio/documented
   APIs. No public API → mark as platform blocker, do not hide behind an internal
   fallback. The Forge Automation importer (`fn-import-automation`,
   `manage:jira-configuration`) is retired from the supported path.
2. **Rovo visibility** — `check:rovo` reports "manifest/install check," not
   "visibility," unless it performs a UI/API listing. Manual/browser
   confirmation or native Atlassian UI evidence remains required for actual
   visibility.
3. **IaC hard reset** — `infra/` is an audit proposal, not the authoritative
   control plane; no full reconciler before native surfaces are evaluated and
   gaps documented.
4. **Jira project configuration** — golden template is the scale path; ACLI
   project/work item/field/filter/dashboard where available; REST scripts thin
   and tied to documented endpoints.
5. **Product/workflow modeling** — JPD for discovery ideas/insights/
   prioritization/delivery links; JSM Assets for reusable business entities;
   Confluence for claims rules, SOPs, approved messaging, research synthesis.

## Recommended Architecture Boundary

```text
Atlassian-native layer
  Forge app install/deploy
  Rovo agents/actions
  Jira Automation/Studio rules (native "Use Rovo agent")
  ACLI project/work item/field/filter/dashboard commands
  Jira REST documented admin APIs
  Golden template Jira projects
  Optional JPD / Assets / Confluence / Analytics / Goals

Repo-owned layer (custom — justified by the four reasons)
  Twin prompts and policies
  Pure TypeScript Twin-specific domain logic
  AI-labeled comment rendering (ADF via @atlaskit/adf-utils)
  Safety tests and manifest contract tests
  Instance config and read-only evidence/audit harness
  Small fallback scripts for documented platform gaps
```

The full request flow and the per-module / per-script placement across these two
layers are specified in [design](design.md). Refactor tasks and spikes are owned
by [`tasks.md`](tasks.md) and [`nih-roadmap.md`](nih-roadmap.md).

## NIH Reduction Task Board (status carried forward)

These track remaining NIH-reduction work. A task is not marked complete from this
document alone — each needs linked evidence, and behavior-changing tasks remain
approval-gated. Full task definitions and the second-pass candidates
(T-NIH-08..T-NIH-14) live in [`tasks.md`](tasks.md) /
[`nih-roadmap.md`](nih-roadmap.md); summarized here for the architecture record.

- `[x]` **T-NIH-01** Rovo visibility/evidence wording: Forge manifest/install
  checks distinguished from Jira UI visibility; webtrigger and native
  Automation/Rovo audit-log evidence in separate rows; manual product-gated steps
  stay visible. Evidence: `scripts/check-rovo-visibility.cjs`,
  `tests/check-rovo-visibility.test.ts`, `docs/MVP_RUNBOOK.md`,
  `evidence/rovo/visibility.md`.
- `[x]` **T-NIH-02** Supported Automation import path cleanup: no dependency on
  private endpoints; remaining internal fallback labeled experimental with a
  platform-blocker note; Forge importer removed from manifest/app. Evidence:
  `manifest.yml`, `src/index.ts`, `scripts/provision-automation.cjs`,
  `docs/INTEGRATION.md`, `tests/importAutomation.test.ts`,
  `tests/integration/manifest.integration.test.ts`.
- `[x]` **T-NIH-03** ACLI capability inventory: `docs/PORTABILITY.md` names the
  native owner per resource; every ACLI gap has a documented (non-private)
  fallback. Evidence: `docs/PORTABILITY.md`.
- `[ ]` **T-NIH-04** Golden template validation: clone a company-managed golden
  template into a disposable target and pass readiness with fewer custom REST
  mutations than a fresh provisioning run. Current evidence
  (`evidence/nih/golden-template-validation.json`) records that AIGO is
  team-managed/next-gen and cannot be the clone source — blocking.
- `[x]` **T-NIH-05** Atlassian product adoption spike (JPD, Assets, Confluence,
  Analytics/Data Lake, Goals) with a decision matrix; no product enters the
  critical path without licensing, admin path, and rollback documented. Evidence:
  `specs/atlassian-product-adoption-spike.md` (v2 successor:
  [`atlassian-product-adoption-spike.md`](atlassian-product-adoption-spike.md)).
- `[x]` **T-NIH-07** Custom script label inventory: every supported `scripts/*`
  entrypoint labeled native wrapper, documented API gap, or Twin-specific logic.
  Evidence: `docs/script-label-inventory.md`,
  `tests/script-label-inventory.test.ts`.
- `[ ]` **T-NIH-08** Purge internal/private endpoints from all supported paths
  and replace ACLI keychain-blob auth with documented `ATLASSIAN_TOKEN`
  (resolution 1).
- `[ ]` **T-NIH-09** Golden template as source of truth; demote provisioning
  scripts to clone-diff fallbacks (depends on T-NIH-04; resolution 2).
- `[ ]` **T-NIH-10** Reframe `infra/` plan/apply as a read-only audit harness; no
  converge engines before T-NIH-03/04 (resolution 3).
- `[ ]` **T-NIH-11** Move Segment/partner/service fields to JSM Assets and
  confidence/expected-lift/discovery fields to JPD (depends on T-NIH-05;
  resolution 2).
- `[ ]` **T-NIH-12** Adopt `@atlaskit/adf-utils`; delegate duplicate detection to
  JQL + native issue links; persist priority/area to JPD (behavior change, needs
  tests + review; resolution 5).
- `[ ]` **T-NIH-13** Replace Forge-CLI box-drawing-table parsing with `--json`;
  de-duplicate the parser onto `scripts/lib/forge.mjs`.
- `[ ]` **T-NIH-14** Reconcile issue-type/field/status counts via the doc
  generator, not by hand. v2 fixes this at the source: counts live ONLY in
  [`issue-types.md`](issue-types.md), [`custom-fields.md`](custom-fields.md),
  [`workflows.md`](workflows.md).

## Acceptance Criteria

- The supported path names the Atlassian-native owner for every platform concern.
- Every custom script carries exactly one label: native wrapper, documented API
  gap, or Twin-specific logic.
- No production doc claims native Jira Automation/Rovo proof when the evidence
  came from the Forge webtrigger fallback.
- No supported path depends on private/internal Atlassian endpoints or
  reverse-engineered keychain auth.
- The portability path repeats across many Jira sites/projects from the golden
  template without a parallel configured-project product.

## Merged / Dropped From The Source

- The prior "NIH Risk Findings" list (6 items) and the standalone "Second-Pass
  Review" summary are **merged** into the five resolutions above; nothing is
  dropped — each prior finding is cited in its resolution.
- "What Should Stay Custom" / "What Should Move Native Or Be Reduced" are
  preserved and re-aligned (Loom added to the matrix; `@atlaskit/adf-utils`
  added to source checks).
- Detailed task acceptance prose is moved to [`tasks.md`](tasks.md) /
  [`nih-roadmap.md`](nih-roadmap.md) per the v2 ownership split; this doc keeps
  status pointers only.
