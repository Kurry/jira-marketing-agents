# Initial Outcome Roadmap

## Purpose

This roadmap extends the current Forge/Rovo MVP into a Jira-native AI Growth Ops
operating system. The first version should build the control plane: issue
types, fields, workflows, agents, comments, approvals, dashboards, and reusable
playbooks. It should not directly operate external campaign, audience, warehouse,
or production signup systems.

## Source Checks

- Current repo code exposes 19 Rovo agents and 22 Forge actions from
  `manifest.yml`.
- Current repo code already covers intake triage, requirements gaps, acceptance
  criteria, duplicate detection, creative claims review, experiment spec,
  employer launch planning, funnel friction analysis, dashboard specs, weekly
  readouts, creative generation, audience segment proposals, campaign plans,
  landing-page specs, referral loops, and activation plans.
- Context7 Forge documentation confirms this repo's Rovo shape should stay based
  on `rovo:agent`, `action`, `function`, and prompt `resource` modules.
- Context7 Jira REST documentation confirms Jira Cloud has admin APIs for
  resources such as issue types and workflows, but workflow creation support has
  important transition-rule limitations and requires admin permissions.
- Provider code/docs checked from GitHub:
  - [`atlassian/terraform-provider-atlassian-operations`](https://github.com/atlassian/terraform-provider-atlassian-operations)
    is official but operations-focused, not general Jira project/workflow
    configuration.
  - [`gothub97/terraform-provider-atlassian`](https://github.com/gothub97/terraform-provider-atlassian)
    claims Jira project, issue type, field, screen, status, workflow, workflow
    scheme, permission, notification, and security resources, but is very new
    and should be treated as experimental until proven against a sandbox.
  - [`lbajsarowicz/terraform-provider-atlassian`](https://github.com/lbajsarowicz/terraform-provider-atlassian)
    claims Jira/Confluence config as code with project, issue type, custom
    field, status, workflow, workflow scheme, screen, and scheme resources, but
    it is still a small third-party provider and needs a bounded spike before
    adoption.
  - [`fourplusone/terraform-provider-jira`](https://github.com/fourplusone/terraform-provider-jira)
    and [`Vestmark/terraform-provider-jira`](https://github.com/Vestmark/terraform-provider-jira)
    cover older Jira resources such as projects, issue types, filters, groups,
    users, roles, comments, issues, and webhooks, but not the full workflow and
    screen surface this system needs.
  - [`alc0der/terraform-provider-jira-automation`](https://github.com/alc0der/terraform-provider-jira-automation)
    exposes a Jira Automation rule resource and raw JSON fallback; it should be
    evaluated separately from Jira project/workflow Terraform.

## Status Key

- `[x]` Already implemented or validated in this repo.
- `[~]` Partially implemented; needs deeper implementation or live Jira proof.
- `[ ]` Remaining work.

## Safety Contract

- `[x]` AI may classify, draft, summarize, recommend, create specs, and add
  clearly labeled review comments.
- `[x]` AI may not approve clinical or health claims.
- `[x]` AI may not launch campaigns or send messages.
- `[x]` AI may not alter audiences or suppression rules.
- `[x]` AI may not mutate production signup flows.
- `[x]` AI may not close or approve high-risk tickets without human approval.
- `[ ]` Any future issue creation, field write, transition, subtask creation, or
  Automation enablement must be behind an explicit allowlist and separate tests.

## Jira Control Plane Tasks

- `[ ]` Decide the canonical issue-type catalog for the initial outcome system.
  It should include the current MVP types plus the new outcome types:
  AI Growth Request, Creative Request, Experiment, Segmentation Request,
  Personalization Journey, Employer Launch, Campaign, Dashboard Request,
  Signup Funnel Issue, Research Brief, Claims Review, Decision Memo,
  Positioning Update, Automation Request, Growth Task, Bug / Tracking Issue,
  and Insight / Research Brief if retained as a legacy alias.
- `[ ]` Decide whether current `Insight / Research Brief` becomes `Research
  Brief`, stays as-is, or remains a compatibility alias.
- `[ ]` Add a field catalog for all outcome fields:
  Target Population, Signal Sources, Segment, Suppression Rules, Primary Metric,
  Targeting Confidence, Journey Stage, Channels, Behavior Trigger, Proof Point,
  Claims Risk, Creative Type, Hook Type, Variant ID, Experiment ID, Hypothesis,
  Guardrail Metrics, Sample Feasibility, Decision Date, Decision Needed,
  Confidence, Research Source, Theme, Frequency, Conversion Impact,
  Recommended Test, Campaign Goal, Launch Date, Assets Required,
  Readiness Score, Blockers, Funnel Step, Issue Type, Affected Segment,
  Drop-off Impact, Evidence, Expected Lift, and QA Required.
- `[ ]` Define one workflow spec per outcome area, including statuses,
  transitions, required human approval gates, and allowed Automation comments.
- `[ ]` Define screens per issue type so required fields are visible during
  create, edit, and transition flows.
- `[ ]` Add queue/filter specs for intake, claims review, launch readiness,
  readout needed, decision needed, blocked, and experiment running.
- `[ ]` Add dashboard specs for weekly growth state, claims bottlenecks,
  experiments, employer launches, signup funnel issues, and research insights.
- `[ ]` Convert the current seed CSV into an outcome seed matrix with at least
  one issue for every canonical issue type.
- `[ ]` Extend readiness checks to verify issue types, statuses, transition
  paths, required fields, screens, seed coverage, Rovo visibility, and
  Automation audit logs.

## Platform and IaC Tasks

- `[x]` Keep Forge/Rovo as the MVP platform and keep Terraform out of the
  critical path until provider coverage is proven.
- `[~]` Keep the portable provisioning entrypoint based on instance config,
  seed rendering, Forge install, project create/clone, smoke, and readiness
  checks.
- `[ ]` Add per-instance Automation rule rendering. Replace project key/id,
  actor account id, and agent keys; fail if placeholders remain; keep imported
  rules disabled by default.
- `[ ]` Add Automation template contract tests. Each rule must reference a
  manifest agent key, add AI-analysis comment text, stay disabled by default,
  and never approve claims or launch work.
- `[ ]` Complete the golden template project validation. A clone should pass
  readiness with the canonical issue types, statuses, screens, fields, board,
  queues, filters, and Automation placeholders.
- `[ ]` Add transition-path verification to `scripts/aigo-project-readiness.cjs`.
- `[ ]` Add Rovo UI visibility and Jira Automation audit-log checks to the
  manual/admin section of readiness output.
- `[ ]` Add repo CI for build, unit tests, integration tests, automation JSON
  validation, seed rendering, and spec/link checks.
- `[ ]` Run a bounded Terraform/provider spike after the control plane spec is
  stable. Compare:
  [`gothub97/terraform-provider-atlassian`](https://github.com/gothub97/terraform-provider-atlassian),
  [`lbajsarowicz/terraform-provider-atlassian`](https://github.com/lbajsarowicz/terraform-provider-atlassian),
  [`alc0der/terraform-provider-jira-automation`](https://github.com/alc0der/terraform-provider-jira-automation),
  [`fourplusone/terraform-provider-jira`](https://github.com/fourplusone/terraform-provider-jira),
  [`Vestmark/terraform-provider-jira`](https://github.com/Vestmark/terraform-provider-jira),
  and
  [`atlassian/terraform-provider-atlassian-operations`](https://github.com/atlassian/terraform-provider-atlassian-operations).
- `[ ]` Do not add production `.tf` resources until the spike proves coverage
  for projects, issue types, custom fields, screens, workflows, workflow
  schemes, boards/filters, Automation, import/drift behavior, and destroy
  safety.
- `[ ]` If Terraform remains incomplete, keep Jira REST and ACLI fallback scripts
  as the portable implementation path.

## Forge Workflow Rule Tasks

- `[ ]` Decide whether Forge workflow validators, conditions, and post-functions
  belong in this app or remain Jira workflow/Automation configuration for the
  MVP.
- `[ ]` If added, implement only human-gate validators and conditions first:
  experiment launch requires measurement fields, creative experiment readiness
  requires claims review, employer launch approval requires readiness review,
  and high-risk claims cannot transition to approved/done without human review.
- `[ ]` Add tests proving Forge workflow modules do not send campaigns, mutate
  audiences, approve claims, or change production signup flows.
- `[ ]` Document the admin permission and deployment implications before making
  workflow modules part of the default install path.

## Outcome 1: AI Growth Intake and Triage

- `[x]` Expose Growth Triage, Requirements Gap, Acceptance Criteria, and
  Duplicate Detector agents in `manifest.yml`.
- `[x]` Normalize Jira issue context for summary, description, labels, issue
  type, status, comments, project, parent, subtasks, assignee, reporter, and
  dates.
- `[x]` Classify workflow area, recommended issue type, priority, risk, missing
  information, owner group, next status, acceptance criteria, and subtasks.
- `[x]` Keep triage output comment-only and reviewable.
- `[ ]` Add or verify canonical intake issue types and statuses in Jira:
  New Intake, AI Triage, Needs Human Review, Ready, In Progress,
  Decision Needed, and Done.
- `[ ]` Manually run the four intake agents on seed issues and capture expected
  vs actual output.
- `[ ]` Import or rebuild the Intake Triage Automation rule and capture audit-log
  success.
- `[ ]` Decide whether recommended next status remains comment-only for MVP or
  becomes an allowlisted Automation transition later.

Acceptance:
- New Jira issues are classified into the correct workflow area.
- Missing fields are identified.
- AI suggests owner, priority, acceptance criteria, and next status.
- All AI output is added as auditable Jira comments.

## Outcome 2: AI Segmentation and Targeting Workflow

- `[x]` Expose Audience Builder with a read-style `buildAudienceSegment` action.
- `[x]` Return include criteria, suppression defaults, detected signals,
  required sources, measurement, approval notes, and
  `mutatesProductionAudience: false`.
- `[ ]` Add or rename a dedicated `segmentation-agent` and
  `targeting-refinement-agent`, or document the current `audience-builder-agent`
  compatibility mapping.
- `[ ]` Expand segmentation readiness with source-of-truth fields, consent,
  suppression dependencies, unknown-signal handling, owner handoff, and
  `readyForWarehouseCompute`.
- `[ ]` Add tests for unknown signals, missing source systems,
  consent/suppression gaps, clinical targeting language, and no invented reach.
- `[ ]` Verify `Segmentation Request` issue type, fields, and workflow statuses
  in Jira.
- `[ ]` Manually run the segmentation agent on a seeded issue and check Forge
  logs.

Acceptance:
- Every audience request becomes a structured targeting spec.
- Suppression logic is required before activation.
- Human approval is required before audience lists are used.
- Targeting outcomes can feed future refinement tickets.

## Outcome 3: AI Personalization Journey Workflow

- `[~]` Current personalization logic proposes variables, rules, fallbacks, and
  privacy notes, but it is not yet a complete journey artifact.
- `[ ]` Add `Personalization Journey` issue type, fields, workflow, and seed
  issue.
- `[ ]` Add a dedicated journey module or expand `src/audience.ts` to produce a
  full journey spec: segment, journey stage, channels, behavior triggers,
  sequence, timing, dynamic blocks, CTA, claims risk, fallbacks, tracking, and
  approvals.
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

## Outcome 4: AI Creative Production Pipeline

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

## Outcome 5: AI Experimentation Engine

- `[x]` Expose Experiment Design and Backlog-related behavior through existing
  modules.
- `[x]` Generate hypothesis, audience, segment, channel, variants, primary
  metric, guardrails, sample/runtime notes, tracking requirements, decision
  rule, readout template, approvals, and readiness.
- `[ ]` Tighten readiness so missing audience, segment, primary metric, channel,
  tracking, variants, or decision rule blocks `Ready to Launch`.
- `[ ]` Add evidence-based experiment readout action. It should return
  Scale, Kill, Iterate, Extend, or Needs Review only when result data is
  supplied.
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

## Outcome 6: AI Research and Objection Mining Workflow

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

## Outcome 7: AI Campaign and Employer Launch Orchestration

- `[x]` Expose Employer Launch Agent and Campaign Orchestration Agent with
  read-style actions.
- `[x]` Implement employer launch readiness scoring, blockers, phases, QA
  checklist, and suggested subtasks.
- `[x]` Implement draft-only campaign plan with channels, cadence, suppression
  checks, tracking, and approvals.
- `[x]` Add disabled Employer Launch Automation that comments analysis only.
- `[ ]` Add or verify `Campaign` issue type and campaign-specific fields.
- `[ ]` Manually validate Employer Launch on the Acme launch seed issue.
- `[ ]` Manually validate Campaign Planner on the re-engagement campaign seed
  issue.
- `[ ]` Decide whether Campaign Planner needs an Automation rule or remains
  manual-only.
- `[ ]` Design optional post-MVP writeback for readiness score and subtasks
  behind an explicit allowlist.
- `[ ]` Add `launch-readiness-agent` if readiness remains separate from the
  employer launch agent.

Acceptance:
- Every launch has a workback plan.
- Missing assets and blockers are visible.
- Human approval is required before execution.
- Post-launch readout is generated or recommended.

## Outcome 8: AI Conversion Optimization Workflow

- `[x]` Expose Funnel Friction Agent with `analyzeFunnelFriction`.
- `[x]` Implement affected-step detection, work-type classification, evidence
  extraction, expected impact, QA, and acceptance criteria.
- `[x]` Add Signup Funnel dashboard category and triage/QA support for funnel
  issues.
- `[ ]` Add or rename `product-ticket-agent` and `regression-check-agent`, or
  document compatibility mappings to current modules.
- `[ ]` Manually validate Funnel Friction on the mobile Safari signup seed
  issue.
- `[ ]` Add or explicitly defer a Funnel Friction Automation rule for new or
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

## Outcome 9: AI Analytics and Decision Support Workflow

- `[x]` Expose Weekly Readout Agent with default weekly JQL.
- `[x]` Implement weekly buckets for completed, blocked, decisions, claims
  bottlenecks, experiments, employer launch risks, funnel issues, and top three
  actions.
- `[x]` Add disabled scheduled Weekly Readout Automation that creates a Decision
  Memo.
- `[x]` Add dashboard spec category for weekly growth decision support.
- `[ ]` Add or rename `anomaly-summary-agent` and
  `decision-recommendation-agent`, or document compatibility mappings.
- `[ ]` Manually validate Weekly Readout over recent AIGO issues.
- `[ ]` Import or enable Weekly Readout Automation and capture audit-log
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

## Outcome 10: AI Product Positioning and Messaging System

- `[~]` Creative, campaign, landing-page, audience, and claims modules support
  parts of positioning, but there is no dedicated positioning system.
- `[ ]` Add `Positioning Update` issue type, fields, workflow, and seed issue.
- `[ ]` Add `src/positioning.ts` with AI capability, member value proposition,
  employer value proposition, proof requirements, differentiators, objection
  matrix, channel examples, CTAs, claims risk, and missing-evidence warnings.
- `[ ]` Add `positioning-agent` and connect it to claims review prep and
  creative generation.
- `[ ]` Define reusable knowledge assets: `twin-context`, `twin-claims-rules`,
  `twin-segments`, `twin-experiments`, `employer-launch`, and
  `growth-readout`.
- `[ ]` Add tests proving no invented outcomes/proof, all copy is claims-scanned,
  missing proof is flagged, and output varies by segment/channel.
- `[ ]` Document how approved positioning feeds creative and campaign agents
  without bypassing human approval.

Acceptance:
- Positioning updates are reviewed before reuse.
- Approved language feeds creative and campaign agents.
- Risky claims route to human review.
- The AI Digital Twin story stays consistent.

## Minimum Initial Outcome Gates

- `[ ]` AI intake converts vague requests into executable Jira ticket plans with
  recommended linked work; automatic issue creation is deferred until an
  allowlisted write path exists.
- `[ ]` AI creative is generated but cannot bypass claims review.
- `[ ]` Experiments cannot move to launch without measurement, guardrails,
  variants, tracking, and a decision rule.
- `[ ]` Employer launches produce repeatable workback plans with readiness,
  owners, due dates, QA, and post-launch readout.
- `[ ]` Weekly AI readout creates the operating cadence with shipped, blocked,
  won, lost, approval-needed, and next-action sections.

## Documentation Tasks

- `[ ]` Update `docs/PORTABILITY.md` with the Terraform provider shortlist,
  spike criteria, and fallback strategy.
- `[ ]` Update `docs/INTEGRATION.md` with the expanded issue-type catalog and
  outcome validation checklist.
- `[ ]` Update `docs/MVP_RUNBOOK.md` with the 10-outcome manual validation
  sequence.
- `[ ]` Add `docs/operating-model.md` for the Jira-native AI Growth Ops control
  plane.
- `[ ]` Add `docs/safe-mutations.md` or expand the current policy docs with
  allowlist rules for any future write actions.
- `[ ]` Add `docs/workflow-map.md`, `docs/claims-governance.md`, and
  `docs/agent-skill-map.md` once the canonical issue types and agent names are
  finalized.
