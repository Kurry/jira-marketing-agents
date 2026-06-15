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
- `[x]` Add or verify the 14 canonical AIGO issue types.
- `[x]` Add or verify the MVP workflow status set.
- `[~]` Wire workflow/status paths for Intake, Claims Review, Experiment,
  Employer Launch, Decision Needed, Launch Prep, and Done paths.
- `[x]` Re-type or recreate seed issues with canonical issue types after the
  project supports them.
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

- `[x]` Import `automation/rules/aigo-automation-ruleset.json`, or rebuild the
  five MVP rules manually if import schema drifts.
- `[x]` Replace all placeholders:
  project key, project id, actor account id, and agent keys.
- `[ ]` Enable only one rule at a time.
- `[ ]` Validate Intake Triage on a newly created AIGO issue.
- `[ ]` Validate Creative Claims on a Spec Ready creative issue.
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
- `[x]` Review safety policies against live Automation behavior.
- `[x]` Create a final MVP readiness note with blockers, risks, and decisions.

Acceptance:
- No critical blocker remains for the development-site MVP.
- Any post-MVP work is explicitly moved out of the MVP checklist.

## Milestone 8: Initial Outcome Roadmap

- `[x]` Look up current Forge/Rovo and Jira REST documentation before extending
  the roadmap.
- `[x]` Inspect the current manifest, source modules, tests, Automation rules,
  portability scripts, and specs.
- `[x]` Launch six focused subagents to audit:
  Intake/Triage, Segmentation/Personalization, Creative/Experimentation,
  Research/Positioning, Campaign/Funnel/Readouts, and Platform/IaC.
- `[x]` Review the Terraform provider shortlist:
  [`atlassian/terraform-provider-atlassian-operations`](https://github.com/atlassian/terraform-provider-atlassian-operations),
  [`gothub97/terraform-provider-atlassian`](https://github.com/gothub97/terraform-provider-atlassian),
  [`lbajsarowicz/terraform-provider-atlassian`](https://github.com/lbajsarowicz/terraform-provider-atlassian),
  [`fourplusone/terraform-provider-jira`](https://github.com/fourplusone/terraform-provider-jira),
  [`Vestmark/terraform-provider-jira`](https://github.com/Vestmark/terraform-provider-jira),
  and
  [`alc0der/terraform-provider-jira-automation`](https://github.com/alc0der/terraform-provider-jira-automation).
- `[x]` Add the detailed 10-outcome roadmap in
  [`outcome-roadmap.md`](./outcome-roadmap.md).
- `[x]` Finalize the canonical issue-type catalog for:
  AI Growth Request, Creative Request, Experiment, Segmentation Request,
  Personalization Journey, Employer Launch, Campaign, Dashboard Request,
  Signup Funnel Issue, Research Brief, Claims Review, Decision Memo,
  Positioning Update, and any retained compatibility types.
- `[x]` Finalize the custom-field catalog for segmentation, personalization,
  creative, experimentation, research, campaigns, conversion optimization,
  analytics, and positioning.
- `[x]` Add or verify the expanded Jira workflows, screens, queues, filters, and
  dashboards described in the outcome roadmap.
- `[ ]` Add missing Forge/Rovo agents and compatibility mappings for requested
  names that differ from the current manifest.
- `[ ]` Add dedicated modules for the missing outcome surfaces:
  personalization journey, objection mining, experiment readout, positioning,
  anomaly summary, decision recommendation, and any separated launch-readiness
  or regression-check logic.
- `[x]` Add per-instance Automation rule rendering and contract tests.
- `[ ]` Run the bounded Terraform/provider spike after the control-plane spec is
  stable; keep Forge, ACLI, Jira REST, and golden-project cloning as the
  supported portable path until a provider is proven.
- `[~]` Update the integration, portability, runbook, workflow, claims,
  operating-model, and agent-skill docs as the roadmap tasks land.

Acceptance:
- The repo has a clear, reviewable path from the current Forge/Rovo MVP to the
  10 initial AI Growth Ops outcomes.
- Tasks distinguish implemented code, manual Jira validation, and post-MVP
  platform/IaC spikes.
- Terraform is treated as an evaluated option, not an assumed MVP dependency.

## Milestone 9: Atlassian-Native NIH Reduction

Do not mark these done only because a worker has touched the related code or
docs elsewhere. Close each task only when the evidence or final doc reference is
linked.

- `[x]` **T-NIH-01: Rovo visibility and evidence wording.** Replace
  "guaranteed visible" wording with "manifest/install verified; UI confirmation
  pending" unless a public Rovo listing API exists. Split webtrigger fallback
  proof from native Jira Automation/Rovo audit-log proof, and keep manual UI
  checks visible in README/runbook/readiness docs.
  (Evidence: `scripts/check-rovo-visibility.cjs`, `docs/MVP_RUNBOOK.md`,
  `evidence/rovo/visibility.md`)
- `[x]` **T-NIH-02: Supported Automation import path cleanup.** Remove the
  private `gateway/api/automation/internal-api/...` path from the supported
  setup flow or label it experimental and non-default. Track removal of
  the retired Forge importer and broad Jira configuration scope.
  (Evidence: `manifest.yml`, `src/index.ts`, `scripts/provision-automation.cjs`,
  `tests/importAutomation.test.ts`)
- `[x]` **T-NIH-03: ACLI capability inventory.** Document ACLI ownership for
  project, workitem, field, filter, and dashboard commands in
  `docs/PORTABILITY.md`, with supported fallback paths for each gap.
- `[ ]` **T-NIH-04: Golden template validation.** Clone a company-managed golden
  template project into a disposable project and prove readiness for canonical
  issue types, statuses, screens, fields, board columns, queues, filters,
  dashboards, seeds, and Automation placeholders with fewer custom REST
  mutations than fresh provisioning.
  (Blocked evidence: `evidence/nih/golden-template-validation.json`; current
  AIGO is team-managed/next-gen, not a valid company-managed clone source.)
- `[x]` **T-NIH-05: Atlassian product adoption spike.** Evaluate Jira Product
  Discovery, JSM Assets, Confluence, Atlassian Analytics/Data Lake, and
  Atlassian Goals as native owners for ideas/insights, employer or segment
  objects, claims/SOP knowledge, readouts, and outcome rollups. Product-level
  subtasks are T-NIH-05A through T-NIH-05F in `specs/outcome-roadmap.md`.
  (Evidence: `specs/atlassian-product-adoption-spike.md`)
- `[x]` **T-NIH-07: Custom script label inventory.** Label every supported
  custom script as exactly one of: native wrapper, documented API gap, or
  Twin-specific logic. (Evidence: `docs/script-label-inventory.md`,
  `tests/script-label-inventory.test.ts`)

Acceptance:
- The supported path names the Atlassian-native owner for every platform
  concern, and every gap has a documented fallback.
- Every custom script has one label and no supported path relies on private
  Atlassian endpoints.
- Golden-template cloning, product adoption, and Terraform provider decisions
  each have evidence, decision criteria, and rollback/manual fallback notes.
- Production docs never claim native Jira Automation/Rovo proof from webtrigger
  fallback evidence.

## Outcome 1 Tasks: AI Growth Intake and Triage

- `[x]` Expose Growth Triage, Requirements Gap, Acceptance Criteria, and
  Duplicate Detector agents in `manifest.yml`.
- `[x]` Normalize Jira issue context for summary, description, labels, issue
  type, status, comments, project, parent, subtasks, assignee, reporter, and
  dates.
- `[x]` Classify workflow area, recommended issue type, priority, risk, missing
  information, owner group, next status, acceptance criteria, and subtasks.
- `[x]` Keep triage output comment-only and reviewable.
- `[x]` Add or verify canonical intake issue types and statuses:
  Intake, Triage, In Review, Spec Ready, In Progress, Decision Needed, and
  Done.
- `[~]` Manually run Growth Triage, Requirements Gap, Acceptance Criteria, and
  Duplicate Detector on seed issues; capture expected vs actual output.
- `[~]` Import or rebuild the Intake Triage Automation rule and capture
  audit-log success.
- `[x]` Decide whether recommended next status remains comment-only for MVP or
  becomes an allowlisted Automation transition later.

Acceptance:
- New Jira issues are classified into the correct workflow area.
- Missing fields are identified automatically.
- AI suggests owner, priority, acceptance criteria, and next status.
- AI output is auditable and does not mutate fields or transitions.

## Outcome 2 Tasks: AI Segmentation and Targeting Workflow

- `[x]` Expose Audience Builder with the read-style `buildAudienceSegment`
  action.
- `[x]` Return include criteria, suppression defaults, detected signals,
  required sources, measurement, approval notes, and
  `mutatesProductionAudience: false`.
- `[ ]` Add or rename a dedicated `segmentation-agent` and
  `targeting-refinement-agent`, or document the current
  `audience-builder-agent` compatibility mapping.
- `[ ]` Expand segmentation readiness with source-of-truth fields, consent,
  suppression dependencies, unknown-signal handling, owner handoff, and
  `readyForWarehouseCompute`.
- `[ ]` Add tests for unknown signals, missing source systems,
  consent/suppression gaps, clinical targeting language, and no invented reach.
- `[~]` Verify `Segmentation Request` issue type, fields, and workflow statuses
  in Jira.
- `[ ]` Manually run the segmentation agent on a seeded issue and check Forge
  logs.

Acceptance:
- Every audience request becomes a structured targeting spec.
- Suppression logic is required before activation.
- Human approval is required before audience lists are used.
- Targeting outcomes can feed future refinement tickets.

## Outcome 3 Tasks: AI Personalization Journey Workflow

- `[~]` Current personalization logic proposes variables, rules, fallbacks, and
  privacy notes, but it is not yet a complete journey artifact.
- `[~]` Add `Personalization Journey` issue type, custom fields, workflow, and
  seed issue.
- `[ ]` Add a dedicated journey module, or expand `src/audience.ts`, to produce
  a full journey spec: segment, stage, channels, triggers, sequence, timing,
  dynamic blocks, CTA, claims risk, fallbacks, tracking, and approvals.
- `[ ]` Add `journey-design-agent`, `personalization-agent`, and
  `claims-review-prep-agent`, or document compatibility mappings to existing
  agents.
- `[ ]` Add tests for missing variables, consent/frequency caps, no PHI,
  claims-safe copy, tracking, fallback behavior, and not-ready output.
- `[ ]` Decide whether Personalization Journey needs an Automation rule or stays
  manual-only for MVP.

Acceptance:
- Each segment can get a complete journey spec from one Jira ticket.
- Journey logic includes behavior-based branches.
- Copy references claims rules before approval.
- Output is structured enough for lifecycle or marketing ops implementation.

## Outcome 4 Tasks: AI Creative Production Pipeline

- `[x]` Expose creative generation and creative claims review agents.
- `[x]` Generate draft creative variants with channel detection, claims risk,
  flagged phrases, SMS opt-out text, and human-review flags.
- `[x]` Keep creative and claims review draft-only; no send or approval action
  exists.
- `[ ]` Add coded Variant IDs and Hook Type tags to generated creative.
- `[ ]` Add or rename `creative-factory-agent`, `claims-review-prep-agent`, and
  `variant-id-agent`, or document compatibility mappings to current agents.
- `[ ]` Tighten Creative Claims Automation so Risky, Prohibited, or Requires
  Human Review routes to Claims Review without approving anything.
- `[ ]` Add tests that winning creative can be promoted only as a reusable
  playbook/SOP recommendation, not an automatic campaign action.
- `[ ]` Manually validate Creative Generation and Creative Claims on seeded
  creative issues.

Acceptance:
- Creative variants are traceable by ID.
- Medium/high-risk claims route to review.
- Winning creative can become a reusable SOP/playbook only after human review.
- AI drafts; humans approve.

## Outcome 5 Tasks: AI Experimentation Engine

- `[x]` Expose Experiment Design and Backlog-related behavior through existing
  modules.
- `[x]` Generate hypothesis, audience, segment, channel, variants, primary
  metric, guardrails, sample/runtime notes, tracking requirements, decision
  rule, readout template, approvals, and readiness.
- `[ ]` Tighten readiness so missing audience, segment, primary metric, channel,
  tracking, variants, or decision rule blocks `Ready to Launch`.
- `[ ]` Add evidence-based experiment readout action. It should return Scale,
  Kill, Iterate, Extend, or Needs Review only when result data is supplied.
- `[ ]` Add or rename `experiment-readout-agent` and
  `backlog-prioritization-agent`, or document compatibility mappings.
- `[ ]` Add workflow validator or Jira workflow gate requiring measurement,
  guardrails, tracking, and decision rule before launch.
- `[ ]` Add tests for inconclusive tests, guardrail failures, missing data,
  sample/runtime caveats, and no invented statistical significance.
- `[ ]` Manually validate Experiment Design and Readout flows on seeded issues.

Acceptance:
- No experiment moves to launch without metric, guardrails, and tracking.
- Readouts produce scale/kill/iterate/extend recommendations only from evidence.
- Inconclusive tests are explicitly labeled.
- Learnings can create or recommend follow-up Jira tickets.

## Outcome 6 Tasks: AI Research and Objection Mining Workflow

- `[~]` Current triage recognizes research/insight work, and weekly readouts can
  summarize recent issues, but there is no dedicated objection-mining action.
- `[ ]` Add `Research Brief` issue type, fields, workflow, and seed issues for
  cost, time, privacy, trust, eligibility, and AI skepticism objections.
- `[ ]` Add `src/objections.ts` with theme clustering, frequency, segment,
  employer, funnel step, de-identified quotes, conversion impact, recommended
  tests, and claims-risk routing.
- `[ ]` Add `objection-mining-agent`, `competitor-research-agent`, and
  `messaging-opportunity-agent`.
- `[ ]` Support JQL or issue-key-list input for multi-issue qualitative
  synthesis.
- `[ ]` Add tests for clustering, evidence quotes, PHI redaction, competitor
  hypotheses, claims-risk routing, and follow-up ticket recommendations.
- `[ ]` Extend weekly readout with top objection themes when research issues are
  available.

Acceptance:
- Weekly research outputs produce creative, experiment, or product tickets.
- Themes are mapped to segments.
- AI distinguishes messaging problems from product/funnel problems.
- Competitor insights become testable hypotheses.

## Outcome 7 Tasks: AI Campaign and Employer Launch Orchestration

- `[x]` Expose Employer Launch Agent and Campaign Orchestration Agent with
  read-style actions.
- `[x]` Implement employer launch readiness scoring, blockers, phases, QA
  checklist, and suggested subtasks.
- `[x]` Implement draft-only campaign plan with channels, cadence, suppression
  checks, tracking, and approvals.
- `[x]` Add disabled Employer Launch Automation that comments analysis only.
- `[~]` Add or verify `Campaign` issue type and campaign-specific fields.
- `[~]` Manually validate Employer Launch on the Acme launch seed issue.
- `[ ]` Manually validate Campaign Planner on the re-engagement campaign seed
  issue.
- `[x]` Decide whether Campaign Planner needs an Automation rule or remains
  manual-only.
- `[ ]` Design optional post-MVP writeback for readiness score and subtasks
  behind an explicit allowlist.
- `[x]` Add `launch-readiness-agent` if readiness remains separate from the
  employer launch agent.

Acceptance:
- Every launch has a workback plan.
- Missing assets and blockers are visible.
- Human approval is required before execution.
- Post-launch readout is generated or recommended.

## Outcome 8 Tasks: AI Conversion Optimization Workflow

- `[x]` Expose Funnel Friction Agent with `analyzeFunnelFriction`.
- `[x]` Implement affected-step detection, work-type classification, evidence
  extraction, expected impact, QA, and acceptance criteria.
- `[x]` Add Signup Funnel dashboard category and triage/QA support for funnel
  issues.
- `[ ]` Add or rename `product-ticket-agent` and `regression-check-agent`, or
  document compatibility mappings to current modules.
- `[~]` Manually validate Funnel Friction on the mobile Safari signup seed
  issue.
- `[x]` Add or explicitly defer a Funnel Friction Automation rule for new or
  blocked Signup Funnel Issue tickets.
- `[ ]` Add analytics/session-replay source integration or require linked
  evidence fields before impact sizing.
- `[ ]` Add acceptance coverage for high-priority funnel issues producing
  product-ready remediation tickets.

Acceptance:
- Funnel issues become product-ready tickets.
- AI separates tracking issues from real user friction.
- Each ticket includes expected impact and QA.
- Completed changes trigger impact review.

## Outcome 9 Tasks: AI Analytics and Decision Support Workflow

- `[x]` Expose Weekly Readout Agent with default weekly JQL.
- `[x]` Implement weekly buckets for completed, blocked, decisions, claims
  bottlenecks, experiments, employer launch risks, funnel issues, and top three
  actions.
- `[x]` Add disabled scheduled Weekly Readout Automation that creates a Decision
  Memo.
- `[x]` Add dashboard spec category for weekly growth decision support.
- `[x]` Add or rename `anomaly-summary-agent` and
  `decision-recommendation-agent`, or document compatibility mappings.
- `[~]` Manually validate Weekly Readout over recent AIGO issues.
- `[~]` Import or enable Weekly Readout Automation and capture audit-log
  success.
- `[ ]` Add evidence-aware decision support using custom fields or linked
  analytics data instead of only status/type/label buckets.
- `[ ]` Add dashboard URL linking, notification path, and decision-metrics
  reporting if needed.

Acceptance:
- Weekly memo is generated automatically after Automation is validated.
- Decisions are linked to Jira tickets.
- Follow-up work is created or recommended.
- Leadership can see growth-system state in Jira.

## Outcome 10 Tasks: AI Product Positioning and Messaging System

- `[~]` Creative, campaign, landing-page, audience, and claims modules support
  parts of positioning, but there is no dedicated positioning system.
- `[~]` Add `Positioning Update` issue type, fields, workflow, and seed issue.
- `[ ]` Add `src/positioning.ts` with AI capability, member value proposition,
  employer value proposition, proof requirements, differentiators, objection
  matrix, channel examples, CTAs, claims risk, and missing-evidence warnings.
- `[ ]` Add `positioning-agent` and connect it to claims review prep and
  creative generation.
- `[ ]` Define reusable knowledge assets: `twin-context`, `twin-claims-rules`,
  `twin-segments`, `twin-experiments`, `employer-launch`, and `growth-readout`.
- `[ ]` Add tests proving no invented outcomes/proof, all copy is claims-scanned,
  missing proof is flagged, and output varies by segment/channel.
- `[ ]` Document how approved positioning feeds creative and campaign agents
  without bypassing human approval.

Acceptance:
- Positioning updates are reviewed before reuse.
- Approved language feeds creative and campaign agents.
- Risky claims route to human review.
- The AI Digital Twin story stays consistent.

## Outcome Platform Tasks

- `[x]` Add per-instance Automation rule rendering for project key/id, actor
  account id, and agent keys; fail if placeholders remain.
- `[x]` Add Automation template contract tests for manifest agent references,
  AI-analysis comments, disabled-by-default rules, claims safety, and no launch
  behavior.
- `[ ]` Complete T-NIH-03 ACLI capability inventory before expanding portable
  provisioning beyond the current supported surfaces.
- `[ ]` Complete T-NIH-04 golden-template validation for canonical issue types,
  statuses, screens, fields, board, queues, filters, dashboards, seeds, and
  Automation placeholders.
- `[ ]` Complete T-NIH-05 Atlassian product adoption spike before replacing Jira
  issue/field/dashboard surfaces with JPD, Assets, Confluence, Analytics/Data
  Lake, or Goals.
- `[~]` Extend readiness checks for transition paths, required fields, screens,
  seed coverage, Rovo UI visibility, and Automation audit logs.
- `[ ]` Complete T-NIH-06 Terraform/provider spike against a disposable Jira
  site before adding production `.tf` resources.
- `[ ]` Complete T-NIH-07 custom-script label inventory before promoting any
  custom script into the long-term supported portability path.

## Post-MVP Backlog

- `[ ]` Add custom-field read mappings for optional workflow metadata.
- `[ ]` Add field-write action behind explicit allowlist and tests.
- `[ ]` Add issue-transition action behind explicit allowlist and tests.
- `[ ]` Add prompt-quality evals for key agent outputs.
- `[ ]` Add production/staging promotion guidance.
- `[ ]` Add usage/decision metrics and dashboards.
- `[ ]` Add Slack or other notification paths through Jira Automation.
