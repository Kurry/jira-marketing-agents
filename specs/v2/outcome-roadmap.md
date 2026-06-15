# Outcome Roadmap (v2 — native-first)

Date: 2026-06-15
Status: Proposal. Re-aligns the outcome roadmap to the Atlassian-native /
NIH-reduction direction. Not authoritative until accepted by the architect +
safety reviewer.
Supersedes: `specs/outcome-roadmap.md`

## Purpose

Extend the Forge/Rovo MVP into a Jira-native AI Growth Ops operating system by
building the control plane on **native Atlassian surfaces first** and limiting
custom code to Twin-specific policy, agent logic, safety rules, evidence, or a
documented platform gap (`[_CONVENTIONS.md](_CONVENTIONS.md)` §1). The system
never directly operates external campaign, audience, warehouse, or production
signup systems.

This roadmap keeps the v1 outcome / field / issue-type catalog **structure** but
defers canonical data-model details to [issue-types.md](issue-types.md),
[custom-fields.md](custom-fields.md), and [workflows.md](workflows.md). It
**references** those files and never restates counts (§4, T-NIH-14).

## Product-adoption framing (native owners)

Per the [Native Tool Fit Matrix](atlassian-native-tools.md) and the completed
[adoption spike](atlassian-product-adoption-spike.md), each Growth Ops surface
has a native owner; custom Jira issue types/fields exist only where a true
execution workflow is needed:

- **Jira Product Discovery (JPD)** — ideas, insights, and prioritization
  (confidence / expected-lift / discovery scoring as JPD formula/rating fields),
  with delivery links to execution issues.
- **JSM Assets** — reusable business entities: employer, partner, segment, and
  service objects (replacing Segment-type custom fields where licensed).
- **Confluence** — claims rules, SOPs, approved messaging, research synthesis,
  and prompt-source references (knowledge sources for Rovo).
- **Atlassian Analytics / Data Lake** — weekly readouts, dashboard metrics, and
  decision evidence, with Jira dashboards/filters as the fallback.
- **Atlassian Goals / Projects** — growth outcome alignment and rollups, with
  Jira issue links/labels as the fallback until Goals is adopted.
- **Jira Automation ("Use Rovo agent")** — event/schedule orchestration of
  agents; native audit-log is the proof of invocation.
- **Forge** — agent runtime, actions, prompt resources, and (post-MVP) workflow
  validator/condition/post-function modules for human gates.

Adoption is gated on tenant licensing, admin path, and a documented
rollback/manual fallback. Jira issue/field/dashboard surfaces remain the
fallback until each product path is proven.

## Status Key

- `[x]` Implemented or validated in this repo.
- `[~]` Partially implemented; needs deeper work or live Jira proof.
- `[ ]` Remaining work.

## Safety Contract

Unchanged from `[_CONVENTIONS.md](_CONVENTIONS.md)` §5 — never weakened:

- `[x]` AI may classify, draft, summarize, recommend, create specs, and add
  clearly labeled review comments.
- `[x]` AI may not approve clinical/health claims, launch campaigns, send
  messages, alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets without human review.
- `[ ]` Any future issue creation, field write, transition, subtask creation, or
  Automation enablement is gated behind the explicit allowlist in
  `policies/safe-mutations.md` with separate tests.

## Jira Control Plane Tasks

Canonical issue types, fields, statuses, screens, queues, and dashboards are
defined in [issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md),
and [workflows.md](workflows.md). This section tracks the **work**, not the
counts.

- `[x]` Canonical issue-type catalog decided — see [issue-types.md](issue-types.md).
  Native owner: golden company-managed template + ACLI/REST. JPD owns
  discovery-only idea/insight types; only types needing an execution workflow
  stay as Jira issue types (Fit Matrix "Ideas & product discovery" row).
- `[x]` `Research Brief` / `AI Growth Request` naming resolved — see
  [issue-types.md](issue-types.md).
- `[x]` Field catalog defined — see [custom-fields.md](custom-fields.md).
  **Native re-homing:** Segment-type fields → JSM Assets objects;
  confidence / expected-lift / discovery fields → JPD formula/rating fields
  (T-NIH-11, theme 2). Minimal Jira custom fields only where Assets/JPD are
  unavailable.
- `[x]` Per-outcome workflow spec (statuses, transitions, human gates, allowed
  Automation comments) defined — see [workflows.md](workflows.md).
- `[x]` Screens per issue type wired in Jira (golden-template owned).
- `[x]` Queue/filter specs (intake, claims review, launch readiness, readout
  needed, decision needed, blocked, experiment running). Native owner: ACLI
  `jira filter`; label-backed where statuses are intentionally not added.
- `[x]` Outcome seed matrix covering every canonical issue type — see
  [issue-types.md](issue-types.md). Native owner: CSV import / ACLI.
- `[x]` Readiness checks verify issue types, statuses, transition paths, required
  fields, screens, seed coverage, Rovo manifest/install, and Automation
  audit-log placeholders. **Reframed:** the readiness/`infra/` layer is a
  read-only audit harness over native output, not a converge engine (theme 3).

## Platform and IaC Tasks

- `[x]` Keep Forge/Rovo as the platform; Terraform stays out of the critical
  path (official `atlassian/atlassian-operations` provider is JSM/Compass
  Operations only — Fit Matrix Terraform row).
- `[x]` Keep the portable provisioning entrypoint based on instance config,
  seed rendering, Forge install, and golden-template clone — demoted to
  clone-diff fallback where the template owns config (T-NIH-09, theme 2).
- `[x]` Per-instance Automation rule rendering with placeholder validation,
  rules disabled by default. **Native path only:** Jira Automation import/export
  UI or documented API; no internal endpoint (T-NIH-02, T-NIH-08).
- `[x]` Automation template contract tests (manifest agent key, AI-analysis
  comment text, disabled by default, never approve/launch).
- `[x]` T-NIH-03 ACLI capability inventory — `docs/PORTABILITY.md`.
- `[ ]` T-NIH-04 golden-template validation. (Blocked: current AIGO is
  team-managed/next-gen; needs a company-managed source — see
  [golden-template-validation.md](golden-template-validation.md).)
- `[x]` Transition-path verification in readiness.
- `[~]` Rovo **manifest/install** check + native Automation audit-log check in
  the manual/admin readiness section. Webtrigger-fallback evidence and native
  audit-log proof are tracked in **separate rows** (T-NIH-01, theme 4).
- `[~]` Repo CI for build, unit/integration tests, automation JSON validation,
  seed rendering, and spec/link checks.
- `[x]` T-NIH-05 product-adoption spike complete —
  [adoption-spike](atlassian-product-adoption-spike.md).
- `[x]` T-NIH-07 custom-script label inventory complete (`docs/script-label-inventory.md`).
- `[ ]` T-NIH-08 purge internal/private endpoints + keychain-blob auth from all
  supported paths; use documented `ATLASSIAN_TOKEN` (theme 1).
- `[ ]` T-NIH-09 make the golden template the source of truth; demote
  provisioning scripts to clone-diff fallbacks (depends on T-NIH-04).
- `[ ]` T-NIH-10 reframe `infra/` plan/apply as a read-only audit harness; no
  per-resource converge engine before T-NIH-03/04 (theme 3).
- `[ ]` T-NIH-12 adopt `@atlaskit/adf-utils`; delegate duplicate detection to
  JQL + native "Duplicate" issue links; persist priority/area to JPD fields
  (theme 5; behavior change — needs tests + review).
- `[ ]` T-NIH-14 reconcile counts via the data-model docs/doc generator, not by
  hand (§4).

Acceptance:
- Native Atlassian ownership is explicit before custom code expands.
- Golden-template, product-adoption, and script-label decisions each carry
  evidence and follow-up gaps.
- No platform task adopts private endpoints as the supported path.

## Atlassian Product Adoption Tasks

All complete in the [adoption spike](atlassian-product-adoption-spike.md);
re-stated here as the native owners this roadmap depends on:

- `[x]` **T-NIH-05A JPD fit** — idea capture, insights, prioritization, delivery
  links.
- `[x]` **T-NIH-05B JSM Assets fit** — employer, partner, segment, service, and
  reusable launch objects.
- `[x]` **T-NIH-05C Confluence fit** — claims rules, SOPs, approved messaging,
  research synthesis, prompt sources.
- `[x]` **T-NIH-05D Analytics/Data Lake fit** — readouts, dashboard metrics,
  decision evidence (Jira dashboards as fallback).
- `[x]` **T-NIH-05E Goals fit** — outcomes and rollups (Jira links/labels as
  fallback).
- `[x]` **T-NIH-05F Adoption decision memo** — prerequisites, custom code
  reduced, migration cost, blockers, rollback per product.

Acceptance: each product has a sample mapping and an adopt/defer/reject call;
licensing, admin prerequisites, migration, and fallback are documented before
adoption; Jira execution workflows remain the fallback until proven.

## Forge Workflow Rule Tasks

Native owner: Forge workflow validator/condition/post-function modules on
company-managed projects. Custom: human-gate logic Atlassian modules cannot
express.

- `[ ]` Decide whether human-gate logic belongs in Forge workflow modules or
  stays Jira workflow/Automation config for MVP.
- `[ ]` If added, implement human-gate validators/conditions first: experiment
  launch requires measurement fields; creative experiment readiness requires
  claims review; employer launch approval requires readiness review; high-risk
  claims cannot transition to approved/done without human review.
- `[ ]` Add tests proving workflow modules do not send campaigns, mutate
  audiences, approve claims, or change production signup flows.
- `[ ]` Document admin-permission and deployment implications before making
  workflow modules part of the default install.

## Outcome 1: AI Growth Intake and Triage

Native owners: Forge agents (runtime) + Jira Automation "Use Rovo agent"
(orchestration) + JPD where intake is discovery rather than execution. Custom:
Twin triage logic.

- `[x]` Expose Growth Triage, Requirements Gap, Acceptance Criteria, Duplicate
  Detector agents in `manifest.yml`.
- `[x]` Normalize Jira issue context via Forge (REQ-003).
- `[x]` Classify workflow area, recommended type, priority, risk, missing info,
  owner group, next status, acceptance criteria, subtasks.
- `[x]` Keep triage output comment-only and reviewable.
- `[x]` Canonical intake types/statuses live in Jira — see
  [issue-types.md](issue-types.md) / [workflows.md](workflows.md).
- `[ ]` **Duplicate detection delegates to JQL + the native "Duplicate"
  issue-link type**, not custom text-relevance scoring (T-NIH-12, theme 5).
- `[~]` Manually run the four intake agents on seed issues; capture expected vs
  actual (domain output captured; live Rovo comment pending Rovo enable).
- `[~]` Import/rebuild the Intake Triage Automation rule via the native path and
  capture **native audit-log** success (rule imported DISABLED; audit-log
  pending operator enable).
- `[x]` Recommended next status stays comment-only for MVP; transition is
  deferred behind the allowlist.

Acceptance: new issues classified into the right area; missing fields
identified; AI suggests owner/priority/acceptance/next status; all output is
auditable comments.

## Outcome 2: AI Segmentation and Targeting Workflow

Native owners: JSM Assets for segment/audience entities; Forge agent for the
spec. Custom: Twin suppression/consent policy.

- `[x]` Expose Audience Builder with read-style `buildAudienceSegment`.
- `[x]` Return include criteria, suppression defaults, signals, required
  sources, measurement, approval notes, `mutatesProductionAudience: false`.
- `[ ]` Add/rename `segmentation-agent` + `targeting-refinement-agent`, or
  document the `audience-builder-agent` compatibility mapping.
- `[ ]` Expand readiness with source-of-truth fields, consent, suppression
  dependencies, unknown-signal handling, owner handoff, `readyForWarehouseCompute`.
- `[ ]` **Model segment objects in JSM Assets** (T-NIH-11) rather than
  Segment-type Jira custom fields, where licensed.
- `[ ]` Tests for unknown signals, missing sources, consent/suppression gaps,
  clinical targeting language, no invented reach.
- `[ ]` Verify `Segmentation Request` type/fields/statuses in Jira.
- `[ ]` Manually run the segmentation agent on a seeded issue; check Forge logs.

Acceptance: every request becomes a structured targeting spec; suppression
required before activation; human approval before lists are used; outcomes feed
refinement tickets.

## Outcome 3: AI Personalization Journey Workflow

Native owners: Forge agent; Confluence for approved-copy/claims knowledge.
Custom: Twin journey logic.

- `[~]` Current logic proposes variables, rules, fallbacks, privacy notes — not
  yet a complete journey artifact.
- `[ ]` Add `Personalization Journey` type, fields, workflow, seed.
- `[ ]` Produce a full journey spec (segment, stage, channels, triggers,
  sequence, timing, dynamic blocks, CTA, claims risk, fallbacks, tracking,
  approvals).
- `[ ]` Add `journey-design-agent`, `personalization-agent`,
  `claims-review-prep-agent`, or document compatibility mappings.
- `[ ]` Tests for missing variables, consent/frequency caps, no PHI,
  claims-safe copy, tracking, fallback behavior, not-ready output.
- `[ ]` Decide whether the journey needs an Automation rule or stays manual-only
  for MVP.

Acceptance: each segment gets a complete journey spec from one ticket; logic has
behavior-based branches; copy references claims rules before approval; output is
implementation-ready.

## Outcome 4: AI Creative Production Pipeline

Native owners: Forge agents; Confluence for winning-creative SOP/playbook
knowledge; Jira Automation routing to Claims Review. Custom: Twin claims-risk
logic.

- `[x]` Expose creative generation + creative claims review agents.
- `[x]` Generate draft variants with channel detection, claims risk, flagged
  phrases, SMS opt-out text, human-review flags.
- `[x]` Keep creative/claims review draft-only; no send or approve action.
- `[ ]` Add coded Variant IDs and Hook Type tags.
- `[ ]` Add/rename `creative-factory-agent`, `claims-review-prep-agent`,
  `variant-id-agent`, or document mappings.
- `[ ]` Tighten Creative Claims Automation so Risky/Prohibited/Requires-Review
  routes to Claims Review without approving anything.
- `[ ]` Tests that winning creative promotes only as a reusable SOP/playbook
  recommendation (Confluence), never an automatic campaign action.
- `[ ]` Manually validate Creative Generation + Creative Claims on seed issues.

Acceptance: variants traceable by ID; medium/high-risk claims route to review;
winners become SOP/playbook only after human review; AI drafts, humans approve.

## Outcome 5: AI Experimentation Engine

Native owners: Forge agent + Forge workflow validator (launch gate); JPD
prioritization fields for backlog rank (T-NIH-12). Custom: Twin experiment
readiness/decision logic.

- `[x]` Expose Experiment Design + backlog behavior.
- `[x]` Generate hypothesis, audience, segment, channel, variants, primary
  metric, guardrails, sample/runtime notes, tracking, decision rule, readout
  template, approvals, readiness.
- `[ ]` Tighten readiness so missing audience/segment/metric/channel/tracking/
  variants/decision-rule blocks `Ready to Launch`.
- `[ ]` Add evidence-based readout action (Scale/Kill/Iterate/Extend/Needs
  Review only when result data is supplied).
- `[ ]` Add/rename `experiment-readout-agent`, `backlog-prioritization-agent`,
  or document mappings. **Backlog prioritization delegates to JPD
  prioritization/board rank**, not a custom re-implementation (T-NIH-12).
- `[ ]` Add a **Forge workflow validator** requiring measurement, guardrails,
  tracking, and decision rule before launch (human-gate — Fit Matrix Workflow
  gates row).
- `[ ]` Tests for inconclusive tests, guardrail failures, missing data,
  sample/runtime caveats, no invented significance.
- `[ ]` Manually validate Experiment Design + Readout on seed issues.

Acceptance: no launch without metric/guardrails/tracking; readouts give
scale/kill/iterate/extend only from evidence; inconclusive tests labeled;
learnings create/recommend follow-up tickets.

## Outcome 6: AI Research and Objection Mining Workflow

Native owners: JPD for insights capture/scoring; Confluence for research
synthesis; Forge agent for clustering. Custom: Twin objection-mining logic.

- `[~]` Triage recognizes research/insight work and readouts summarize issues,
  but there is no dedicated objection-mining action.
- `[ ]` Add `Research Brief` type, fields, workflow, seeds (cost, time, privacy,
  trust, eligibility, AI skepticism). **Capture insights as JPD insights** where
  the work is discovery (Fit Matrix row).
- `[ ]` Add `src/objections.ts` (theme clustering, frequency, segment, employer,
  funnel step, de-identified quotes, conversion impact, recommended tests,
  claims-risk routing).
- `[ ]` Add `objection-mining-agent`, `competitor-research-agent`,
  `messaging-opportunity-agent`.
- `[ ]` Support JQL or issue-key-list input for multi-issue synthesis.
- `[ ]` Tests for clustering, evidence quotes, PHI redaction, competitor
  hypotheses, claims-risk routing, follow-up recommendations.
- `[ ]` Extend weekly readout with top objection themes.

Acceptance: research outputs produce creative/experiment/product tickets; themes
mapped to segments; messaging vs product/funnel problems distinguished;
competitor insights become testable hypotheses.

## Outcome 7: AI Campaign and Employer Launch Orchestration

Native owners: JSM Assets for employer/partner objects; Forge agents; Jira
Automation. Custom: Twin launch-readiness/campaign logic.

- `[x]` Expose Employer Launch + Campaign Orchestration agents (read-style).
- `[x]` Employer launch readiness scoring, blockers, phases, QA checklist,
  suggested subtasks.
- `[x]` Draft-only campaign plan (channels, cadence, suppression checks,
  tracking, approvals).
- `[x]` Disabled Employer Launch Automation that comments analysis only.
- `[~]` Verify `Campaign` type + campaign fields (type exists; campaign-specific
  fields deferred — see [custom-fields.md](custom-fields.md)).
- `[ ]` **Model employer/partner entities in JSM Assets** (T-NIH-11) instead of
  bespoke fields, where licensed.
- `[~]` Manually validate Employer Launch on the Acme launch seed (domain output
  captured; live Rovo comment pending enable).
- `[ ]` Manually validate Campaign Planner on the re-engagement campaign seed.
- `[x]` Campaign Planner stays manual-only for MVP (no Automation rule).
- `[ ]` Design optional post-MVP writeback for readiness score/subtasks behind
  the allowlist.
- `[x]` Readiness integrated into employer-launch-agent (no separate agent).

Acceptance: every launch has a workback plan; missing assets/blockers visible;
human approval before execution; post-launch readout generated or recommended.

## Outcome 8: AI Conversion Optimization Workflow

Native owners: Forge agent; Analytics/Data Lake (or linked evidence fields) for
impact sizing. Custom: Twin funnel-friction logic.

- `[x]` Expose Funnel Friction Agent with `analyzeFunnelFriction`.
- `[x]` Affected-step detection, work-type classification, evidence extraction,
  expected impact, QA, acceptance criteria.
- `[x]` Signup Funnel dashboard category + triage/QA support.
- `[ ]` Add/rename `product-ticket-agent`, `regression-check-agent`, or document
  mappings.
- `[~]` Manually validate Funnel Friction on the mobile Safari signup seed
  (domain output + trace captured; live Rovo comment pending enable).
- `[x]` Funnel Friction Automation deferred for MVP (manual invocation only).
- `[ ]` Add analytics/session-replay source integration **via Atlassian
  Analytics/Data Lake** or require linked evidence fields before impact sizing.
- `[ ]` Acceptance coverage for high-priority funnel issues producing
  product-ready remediation tickets.

Acceptance: funnel issues become product-ready tickets; tracking issues
separated from real friction; each ticket has expected impact + QA; completed
changes trigger impact review.

## Outcome 9: AI Analytics and Decision Support Workflow

Native owners: Atlassian Analytics/Data Lake for metrics/readouts (Jira
dashboards as fallback); Atlassian Goals for outcome rollups; Jira Automation
(scheduled) for the cadence. Custom: Twin readout/decision-memo logic.

- `[x]` Expose Weekly Readout Agent with default weekly JQL.
- `[x]` Weekly buckets (completed, blocked, decisions, claims bottlenecks,
  experiments, employer launch risks, funnel issues, top three actions).
- `[x]` Disabled scheduled Weekly Readout Automation that creates a Decision
  Memo.
- `[x]` Dashboard spec category for weekly growth decision support.
- `[x]` `weekly-readout-agent` covers decision support (no separate anomaly
  agent for MVP).
- `[~]` Manually validate Weekly Readout over recent AIGO issues (domain output
  + trace captured; live Rovo pending enable).
- `[~]` Enable Weekly Readout Automation and capture **native audit-log** success
  (rule imported DISABLED; CRON trigger is UI-only; audit-log pending operator
  enable; webtrigger evidence tracked separately — theme 4).
- `[ ]` Add evidence-aware decision support **via Atlassian Analytics/Data Lake
  or linked custom fields** instead of only status/type/label buckets.
- `[ ]` Add dashboard URL linking, notification path, decision-metrics reporting
  if needed.

Acceptance: weekly memo generated after Automation is validated; decisions
linked to tickets; follow-up work created/recommended; leadership sees system
state (Analytics/dashboards; rollups in Goals).

## Outcome 10: AI Product Positioning and Messaging System

Native owners: Confluence for positioning knowledge/approved language; Forge
agent. Custom: Twin positioning logic + claims scanning.

- `[~]` Creative/campaign/landing-page/audience/claims modules support parts of
  positioning; no dedicated positioning system yet.
- `[ ]` Add `Positioning Update` type, fields, workflow, seed.
- `[ ]` Add `src/positioning.ts` (AI capability, member/employer value prop,
  proof requirements, differentiators, objection matrix, channel examples, CTAs,
  claims risk, missing-evidence warnings).
- `[ ]` Add `positioning-agent`; connect to claims-review-prep + creative
  generation.
- `[ ]` Define reusable knowledge assets (`twin-context`, `twin-claims-rules`,
  `twin-segments`, `twin-experiments`, `employer-launch`, `growth-readout`) as
  **Confluence pages / Rovo knowledge sources**, not repeated Jira content
  (Fit Matrix Knowledge row).
- `[ ]` Tests proving no invented outcomes/proof, all copy claims-scanned,
  missing proof flagged, output varies by segment/channel.
- `[ ]` Document how approved positioning feeds creative/campaign agents without
  bypassing human approval.

Acceptance: positioning updates reviewed before reuse; approved language feeds
creative/campaign agents; risky claims route to human review; the AI Digital
Twin story stays consistent.

## Minimum Initial Outcome Gates

- `[~]` AI intake converts vague requests into executable Jira ticket plans with
  recommended linked work; automatic issue creation deferred until an
  allowlisted write path exists.
- `[x]` AI creative is generated but cannot bypass claims review
  (`reviewCreativeClaims` enforces `humanReviewRequired: true`; no approve
  action).
- `[~]` Experiments cannot move to launch without measurement, guardrails,
  variants, tracking, and a decision rule (enforced in code;
  Forge-workflow-validator gate deferred — Outcome 5).
- `[x]` Employer launches produce repeatable workback plans with readiness,
  owners, due dates, QA, post-launch readout.
- `[~]` Weekly AI readout creates the operating cadence (shipped, blocked, won,
  lost, approval-needed, next-action); Automation rule imported DISABLED,
  auto-firing pending operator enable.

## Documentation Tasks

- `[x]` `docs/PORTABILITY.md` — Terraform shortlist, spike criteria, fallback.
- `[x]` `docs/INTEGRATION.md` — issue-type catalog (links to data-model docs) +
  outcome validation checklist.
- `[x]` `docs/MVP_RUNBOOK.md` — 10-outcome manual validation sequence.
- `[ ]` `docs/operating-model.md` — Jira-native AI Growth Ops control plane.
- `[x]` `policies/safe-mutations.md` — allowlist; `addAnalysisComment` is the
  only permitted mutation.
- `[ ]` `docs/workflow-map.md`, `docs/claims-governance.md`,
  `docs/agent-skill-map.md` once canonical types and agent names are finalized.
  **Claims governance / agent-skill knowledge should live in Confluence**
  (Fit Matrix Knowledge row) and be referenced from repo docs.

## Changes from v1 (re-alignment, not scope cut)

- Catalog/outcome structure preserved (10 outcomes, control-plane, IaC, product
  adoption, workflow rules, gates, docs). Every task carried forward.
- **Removed all restated counts** (issue types/fields/statuses/filters/
  dashboards/seeds/agents/actions) — now referenced from
  [issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md),
  [workflows.md](workflows.md) (§4, T-NIH-14).
- **Added per-outcome native owners** and the product-adoption framing section
  (JPD/Assets/Confluence/Analytics/Goals).
- **Re-homed entities natively:** segment fields → JSM Assets; confidence/
  expected-lift/discovery → JPD; duplicate detection → JQL + native links;
  backlog priority → JPD rank; readouts → Analytics/Data Lake; rollups → Goals;
  knowledge → Confluence (T-NIH-11, T-NIH-12).
- **Replaced the archived Terraform-provider shortlist** (the long third-party
  list) with the Fit Matrix Terraform row: official `atlassian/atlassian-operations`
  only, never the Jira control plane. The shortlist remains in `docs/PORTABILITY.md`.
- **Reframed the `infra/`/readiness layer** as a read-only audit harness over
  native output (theme 3); added T-NIH-08/09/10/12/14 as live platform tasks.
- Split Rovo "visibility" into manifest/install check + manual UI confirmation,
  with native audit-log proof tracked separately from webtrigger fallback
  (theme 4).
- No outcome or task was dropped; merges are limited to count restatement
  removal and the Terraform shortlist consolidation noted above.
