# MVP Requirements (v2 — native-first)

Date: 2026-06-15
Status: Proposal. Re-aligns the MVP requirements to the Atlassian-native /
NIH-reduction direction. Not authoritative until accepted by the architect +
safety reviewer.
Supersedes: `specs/requirements.md`

## Purpose

The MVP turns this repo into a working, portable Jira-native AI Growth Ops
control plane. A Jira user opens a configured project, sees the Rovo agents,
runs them on seeded issues, and uses Jira Automation's "Use Rovo agent" action
to post AI-labeled analysis comments — without giving agents authority to take
unsafe actions. A new site/project is reproducible from a **golden
company-managed template project** plus a thin instance config.

The decision rule (`[_CONVENTIONS.md](_CONVENTIONS.md)` §1) governs every
requirement below: **use Atlassian-native capabilities first; keep custom code
only for Twin-specific policy, agent logic, safety rules, evidence generation,
or a documented platform gap.** Each requirement names its native owner per the
[Native Tool Fit Matrix](atlassian-native-tools.md).

## Current State

- Forge/Rovo is the only supported integration path. MCP/Cowork is out of scope.
- The Forge app is deployed to `development` and installed on
  `myhealthcaresite.atlassian.net`.
- The `AIGO` Jira project exists with the canonical issue types, seeded
  `aigo-seed` issues, MVP custom fields, the MVP status set, filters,
  dashboards, and imported (disabled) Automation rules. Canonical counts and
  names live in [issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md),
  and [workflows.md](workflows.md) — this doc references them and never restates
  counts.
- Local checks pass: `npm run build`, `npm test`, `npm run test:integration`,
  `forge lint`, `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`, and
  `npm run provision:all -- --dry-run`.
- Native-product spike (T-NIH-05) and ACLI inventory (T-NIH-03) are complete;
  golden-template validation (T-NIH-04) is blocked because the current AIGO
  project is team-managed/next-gen and cannot be the company-managed clone
  source.
- The remaining operator-gated MVP work is enabling Rovo "Use agent" steps in
  Jira Automation and capturing native audit-log proof; blocked until the site
  has Rovo/AI active for the org.

## MVP Success Criteria

1. **Rovo agent catalog (native owner: Forge `rovo:agent`).**
   - All agents declared in `manifest.yml` are present after deploy/install.
     "Visibility" in the Jira/Rovo UI is a **manifest/install check plus a
     manual UI confirmation**, not a guaranteed-visible assertion (T-NIH-01).
   - At least the Growth Triage, Creative Claims, Experiment Design, Employer
     Launch, Duplicate Detector, and Weekly Readout agents run manually on
     seeded issues.

2. **Jira project readiness (native owner: golden company-managed template +
   ACLI/REST; Jira Automation labels for queues).**
   - `AIGO` is the default MVP project; its issue types, status set, and
     label-backed queues match [issue-types.md](issue-types.md) and
     [workflows.md](workflows.md).
   - Blocked and readout-needed work is represented by labels/filters, not
     dedicated statuses.
   - The golden template is the scale path (REQ-008); provisioning scripts are
     clone-diff fallbacks, not a parallel control plane.

3. **Agent behavior (native owner: Forge actions/functions; custom: Twin domain
   logic).**
   - Agents read Jira context through Forge and return structured, reviewable
     recommendations whose quality matches the unit tests.
   - Agents do **not** approve claims, send campaigns, mutate audiences, change
     suppression, launch experiments, or modify production signup flows.

4. **Automation behavior (native owner: Jira Automation "Use Rovo agent").**
   - The MVP rules route work through the native "Use Rovo agent" action plus
     explicit Jira Automation actions — no hidden autonomous mutation, no
     private/internal automation endpoint (T-NIH-02, T-NIH-08).
   - Automation comments carry the AI-analysis marker so output is clearly
     machine-generated and review-only.
   - Rules stay disabled until an operator enables the Rovo step on a Rovo/AI
     site and a native audit-log run is captured.

5. **Verification and operations (native owner: Forge CLI / ACLI; custom:
   evidence harness).**
   - `forge install list` shows the Jira `development` install `Up-to-date`.
   - `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` passes.
   - A human can follow `docs/INTEGRATION.md` from a clean clone to reproduce
     install, seed import, and a first Rovo run; and `docs/PORTABILITY.md` to
     stand up another instance and dry-run provisioning.

## Functional Requirements

Each requirement lists its **native owner** and any **custom-code
justification** (one of the four allowed reasons, or a documented gap).

### REQ-001: Forge/Rovo deployment

Native owner: Forge platform (app runtime, deploy, install, scopes).
Custom: none — pure native CLI flow.

Acceptance:
- `forge lint` has no errors; `forge deploy -e development` succeeds.
- `forge install -e development -p jira --site myhealthcaresite.atlassian.net
  --confirm-scopes` succeeds or upgrades the existing install.
- `forge install list` shows Jira on the site as `Up-to-date`.

### REQ-002: Rovo agent catalog

Native owner: Forge `rovo:agent`, `action`, `function`, prompt `resource`
modules. Custom: Twin-specific prompts, handlers, and the safety output schema.

Acceptance:
- The Jira/Rovo UI lists the agents after deploy/install (manual confirmation —
  no public listing API; see T-NIH-01).
- Every agent prompt resource exists in `prompts/`; every action reference
  resolves to a Forge action, a short function key, and a real handler export.

### REQ-003: Jira context retrieval

Native owner: Forge `@forge/api requestJira` against documented Jira Cloud REST
v3. Custom: the normalized `IssueContext` shape consumed by Twin domain logic.

Acceptance:
- `getIssueContext` returns a normalized `IssueContext` (summary, description,
  type, priority, components, labels, status, assignee, reporter, dates,
  project, parent, subtasks, recent comments).
- Comments are included when visible to the app.
- Jira API errors return clear failures for 401, 403, 404.

### REQ-004: Safe comment mutation

Native owner: Forge comment API; ADF built via `@atlaskit/adf-utils` (T-NIH-12),
not a hand-rolled node schema. Custom: the AI-label/analysis-only policy
(safety rule).

Acceptance:
- `addAnalysisComment` is the **only** mutating Forge action; no Rovo agent
  references it directly.
- Comments are AI-labeled and analysis-only.
- Field writes, transitions, sends, audience updates, and production changes
  stay out of scope unless added later behind the allowlist in
  `policies/safe-mutations.md`.

### REQ-005: Seeded smoke dataset

Native owner: ACLI/CSV import into the golden-template project; seeds live in
`automation/seed/`. Custom: instance-binding renderer (instance config gap).

Acceptance:
- The seed CSV covers every canonical issue type ([issue-types.md](issue-types.md))
  on a configured project.
- On a minimally configured fresh project, the import path falls back to `Task`
  while preserving intended type text.
- Imported issues are labeled `aigo-seed` and preserve intended types and
  target statuses.

### REQ-006: Jira Automation MVP

Native owner: Jira Automation import/export UI or documented API, with the
native "Use Rovo agent" action. Custom: disabled JSON rendering + placeholder
validation only — **no internal API as a supported path** (T-NIH-02, T-NIH-08).

Acceptance:
- The MVP rules are importable via the native path or manually reproducible from
  docs; the supported path names no private endpoint.
- Placeholders (project, actor, agent keys) are replaced; rules fail validation
  if placeholders remain.
- Each rule is enabled only after its first **native audit-log** validation
  succeeds (webtrigger evidence is tracked separately and never counts as the
  Automation/Rovo proof — T-NIH-01, finding #4).
- The Creative Claims rule may route risky work to Claims Review but never
  approves claims.

### REQ-007: Documentation and runbook

Native owner: GitHub-hosted repo docs; Confluence for claims/SOP knowledge once
adopted ([adoption spike](atlassian-product-adoption-spike.md)). Custom: none.

Acceptance:
- Docs state that agent presence in Jira/Rovo is the primary install check and
  that UI visibility still needs manual confirmation.
- Docs distinguish Forge/Rovo install from Jira seed import.
- Docs explain how to verify deployment, install, seed data, Automation, and
  Rovo manual flows, keeping native audit-log proof distinct from the webtrigger
  fallback.

### REQ-008: Portable instance provisioning

Native owner: golden company-managed template project (clone path) + ACLI
`jira project/workitem/field/filter/dashboard`; documented Jira REST for ACLI
gaps. Custom: thin instance config + clone-diff readiness (documented gap until
T-NIH-04 clears).

Acceptance:
- `instances/aigo.example.json` documents the per-instance contract.
- `npm run seed:render` renders a project-specific seed CSV from instance
  config.
- `npm run provision:instance -- --help` documents install, project, seed,
  smoke, readiness, and dry-run steps.
- Scripts accept `AIGO_INSTANCE_CONFIG` and env overrides for site, Forge env,
  project key/name, seed label, and template project.
- Docs make golden-template cloning the scale path and state that general Jira
  project configuration is **not** covered by a first-party Terraform provider
  (the official `atlassian/atlassian-operations` provider is JSM/Compass
  Operations only — Fit Matrix Terraform row).

### REQ-009: Outcome control plane

Native owner: see per-outcome owners in [outcome-roadmap.md](outcome-roadmap.md)
(JPD for ideas/insights/prioritization; Assets for employer/partner/segment/
service objects; Confluence for claims/SOP knowledge; Analytics/Data Lake for
readouts; Goals for outcome rollups). Custom: Twin agent logic, claims/safety
policy, evidence.

Acceptance:
- [outcome-roadmap.md](outcome-roadmap.md) lists, per outcome, the native owner
  plus the Jira/Forge entities, agents, Automation, safety gates, tests, and
  docs needed.
- The roadmap distinguishes existing Forge/Rovo functionality from missing
  implementation and manual Jira validation.
- The roadmap keeps Forge/Rovo as the execution platform and treats Terraform
  as a bounded provider spike, never the critical path.
- The roadmap preserves the safe-by-default contract: AI drafts, classifies,
  recommends, and comments; humans approve claims, launches, audiences,
  suppression, and production changes.

### REQ-010: NIH reduction baked into the supported path *(new, folds in the
NIH themes as requirements)*

Native owner: per the Fit Matrix. Custom: only the four allowed reasons.

Acceptance:
- No supported path depends on private/internal Atlassian endpoints
  (`gateway/api/automation/internal-api`, `rest/cb-automation`) or
  reverse-engineered ACLI keychain auth; auth uses documented `ATLASSIAN_TOKEN`
  env (T-NIH-08, theme 1).
- Generic platform capabilities (ADF build/traversal, duplicate detection,
  prioritization) delegate to libraries/native surfaces — `@atlaskit/adf-utils`,
  JQL + the native "Duplicate" issue-link type, and JPD prioritization fields
  (T-NIH-12, theme 5). Twin claims/safety/experiment/audience/campaign logic
  stays custom.
- The `infra/` layer is a **read-only audit harness over native output**, not a
  Terraform-equivalent converge engine (theme 3); mutations route through ACLI /
  golden template / Forge.

## Non-Functional Requirements

- **Safety:** high-stakes actions require human approval; the safety contract in
  `[_CONVENTIONS.md](_CONVENTIONS.md)` §5 is never weakened.
- **Portability:** repeatable across many Jira sites/projects via the golden
  template, with no private-endpoint dependency.
- **Scalability:** site/project settings are instance config, not source edits.
- **Testability:** Twin domain logic stays pure and Vitest-covered; tests assert
  no claims approval, no send, no audience/suppression mutation, no production
  signup write.
- **Operability:** live smoke tests verify Forge install and seeded Jira data;
  evidence is script-produced and machine-readable.
- **Maintainability:** Forge manifest constraints are covered by integration
  tests; canonical counts live only in the data-model docs to prevent drift
  (T-NIH-14).

## Out of Scope for MVP

- MCP/Cowork server support.
- Autonomous field updates or transitions from Forge actions.
- Direct campaign sending, audience mutation, suppression changes, experiment
  launches, or production signup-flow writes.
- Custom-field writeback, Slack notifications, or warehouse integration.
- LLM-as-judge evals for prompt quality.
- Full implementation of all outcome workflows — the MVP captures the roadmap
  and current partial state, then promotes outcomes via explicit tasks.
- A bespoke `infra/` reconciler / converge engine before T-NIH-03/04 clear
  (theme 3 — was implicitly in scope in v1, now explicitly deferred).

## Open Risks

- Rovo site availability must be confirmed manually in Jira; CLI smoke tests
  verify install, not UI visibility (T-NIH-01).
- Fresh team-managed projects may need manual issue-type/board/status/Automation
  setup; the golden company-managed template is the durable answer but is
  blocked until a company-managed source project exists (T-NIH-04).
- Jira Automation import format can drift; manual rule rebuild stays documented
  as a fallback, with no internal endpoint substituted in.
- Jira Automation "Use agent" requires Rovo/AI active for the org/site (paid
  Standard/Premium/Enterprise; Free cannot use Rovo; a verified business domain
  is required).
- Native-product adoption (JPD/Assets/Confluence/Analytics/Goals) is gated on
  tenant licensing and admin path per the
  [adoption spike](atlassian-product-adoption-spike.md); Jira issue/field
  surfaces remain the fallback until each product path is proven.
- Local Node may be newer than Forge's supported range; use Node 22/24 for
  deploy/install if Forge behavior is unstable.

## Changes from v1 (re-alignment, not scope cut)

- All REQ-001..009 preserved; each now names a native owner and a custom-code
  justification.
- **Added REQ-010** to make the five NIH themes enforceable requirements rather
  than background notes.
- Removed restated counts (issue types/fields/statuses/filters/dashboards/rules)
  — now referenced from the canonical data-model docs (T-NIH-14, §4).
- Reframed "Rovo agent visibility" success wording to a manifest/install check +
  manual UI confirmation.
- Reframed the `infra/` reconciler from in-scope to an explicit out-of-scope
  audit harness pending T-NIH-03/04.
- No requirement was dropped or merged away.
