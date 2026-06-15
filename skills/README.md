# Agent Skills

Reusable capabilities shared across the AI Growth Ops Rovo agents. Each skill is
a contract: **what it does, which agents use it, how it's implemented in code,
its inputs/outputs, and its safety boundary.** Agents compose skills; they don't
re-implement them.

Every skill is grounded in the repo: the **Implementation** line points to the
`src/` module and the `manifest.yml` action that realizes it, or marks the skill
as *prompt-driven* (behavior lives in the agent prompt, no dedicated action yet).

## Forge/Rovo operations

Use [`forge-rovo-jira-ops/`](forge-rovo-jira-ops/) when connecting this app to
Jira, deploying through Forge, configuring the AIGO project, importing
Automation rules, creating seed issues, or running live Rovo smoke tests.

## Jira Automation operator skills

Two skills cover the automation rule lifecycle:

- [`jira-automation-rovo-setup/`](jira-automation-rovo-setup/) — full operator
  runbook for connecting Rovo to Automation (requires Rovo/AI active), replacing
  placeholder comment actions with Rovo agent calls in all 5 rules, fixing
  triggers for rules 4 and 5, enabling rules one at a time, and capturing
  audit-log evidence. **This is the T-M3-03 operator guide.**

- [`jira-automation-browser-edit/`](jira-automation-browser-edit/) — browser
  automation skill (Claude in Chrome) for inspecting and editing Jira
  Automation flow builder rules: adding JQL scope conditions, diagnosing
  "Error loading step" (BLK-02 / eligibility limitation), verifying rule structure, and
  navigating the SPA correctly.

## Portable TWG skill bundle

The repo also carries a portable copy of the local TWG agent skills:

- [`twg/`](twg/) - root TWG CLI operating skill
- [`twg-status-rollups/`](twg-status-rollups/) - status and leadership readouts
- [`twg-context-discovery/`](twg-context-discovery/) - context and dependency discovery
- [`twg-engineering-work/`](twg-engineering-work/) - PR and engineering work analysis
- [`twg-operational-health/`](twg-operational-health/) - on-call, reliability, and operational health workflows

The copied wrapper scripts can use `TWG_BIN`, a bundled
`skills/twg/bin/twg-bin`, a repo-root `bin/twg-bin`, `twg-bin` on `PATH`, or the
original local `/Users/kurrytran/.local/bin/twg-bin` fallback.

## Atlassian product reference skills

Portable, product-agnostic references covering the full Atlassian surface. Each
is grounded in current official docs (developer.atlassian.com /
support.atlassian.com) and defaults to read/draft/recommend — destructive or
bulk/org-level mutations require explicit human approval.

Jira family:

- [`jira-cloud-rest/`](jira-cloud-rest/) — Jira Cloud platform REST API v3 (issues, JQL `POST /search/jql`, transitions, ADF comments, links, webhooks).
- [`jira-acli/`](jira-acli/) — Atlassian CLI (`acli jira workitem` create/search/transition/bulk).
- [`jira-service-management/`](jira-service-management/) — JSM REST (`/rest/servicedeskapi`): requests, queues, SLAs, approvals, organizations.
- [`jsm-assets/`](jsm-assets/) — Assets (Insight): object schemas, AQL, the workspace Assets API.
- [`jira-product-discovery/`](jira-product-discovery/) — JPD ideas, insights, fields, views, delivery links.

Confluence & collaboration:

- [`confluence-cloud-rest/`](confluence-cloud-rest/) — Confluence v2 REST (pages/spaces/comments) + v1 CQL search.
- [`atlassian-goals-atlas/`](atlassian-goals-atlas/) — Goals & projects (Atlas / Atlassian Home); programmatic access via Teamwork Graph/Rovo.
- [`trello/`](trello/) — Trello REST API (boards, lists, cards, webhooks).

Forge / Rovo developer platform:

- [`forge-platform/`](forge-platform/) — manifest, CLI, `@forge/api`, storage, scopes, lifecycle.
- [`forge-rovo-agents/`](forge-rovo-agents/) — `rovo:agent` + `action` modules in code.
- [`forge-workflow-modules/`](forge-workflow-modules/) — Jira workflow validators/conditions/post functions (Preview).
- [`forge-webtriggers-events/`](forge-webtriggers-events/) — web/scheduled triggers, product events, `@forge/events` queues.
- [`rovo-studio-agents/`](rovo-studio-agents/) — no-code Rovo Studio agents, Rovo in Automation (`{{agentResponse}}`).

DevOps, data & admin:

- [`compass/`](compass/) — Compass GraphQL, scorecards/metrics, `compass.yml` catalog.
- [`bitbucket-cloud-rest/`](bitbucket-cloud-rest/) — Bitbucket Cloud REST 2.0 (repos, PRs, pipelines); app-password deprecation.
- [`atlassian-analytics-data-lake/`](atlassian-analytics-data-lake/) — Atlassian Analytics + Data Lake SQL.
- [`atlassian-admin-cloud/`](atlassian-admin-cloud/) — org admin REST, users/groups, SCIM, audit-log events.
- [`atlassian-terraform/`](atlassian-terraform/) — official `atlassian/atlassian-operations` Terraform provider.

## Design principle

> Agents can **draft, classify, route, summarize, and recommend**. They cannot
> **approve claims, launch campaigns, change audiences, or mutate production
> workflows** without explicit human approval. See
> [`safe-mutations.md`](safe-mutations.md) and
> [`../policies/safe-mutations.md`](../policies/safe-mutations.md).

## Catalog

| Skill | Implementation | Used by |
| --- | --- | --- |
| [Issue context retrieval](jira-context-retrieval.md) | `src/jira.ts`, `src/utils/text.ts` · `getIssueContext` | All |
| [Safe mutations & commenting](safe-mutations.md) | `src/comments.ts` · `addAnalysisComment` | All |
| [Issue classification](issue-classification.md) | `src/triage.ts` · `classifyGrowthIssue` | Triage |
| [Priority scoring](priority-scoring.md) | `src/utils/scoring.ts` | Triage, Sprint Risk, Backlog |
| [Requirements gap analysis](requirements-gap-analysis.md) | `src/requirements.ts` · `proposeRequirementsGaps` | Requirements Gap |
| [Acceptance criteria generation](acceptance-criteria-generation.md) | `src/requirements.ts` · `proposeAcceptanceCriteria` | Acceptance Criteria |
| [Epic breakdown](epic-breakdown.md) | `src/backlog.ts` · `breakDownEpic` | Epic Breakdown |
| [Duplicate detection](duplicate-detection.md) | `src/duplicates.ts` · `findSimilarIssues` | Duplicate Detector |
| [Sprint risk assessment](sprint-risk-assessment.md) | `src/backlog.ts` · `assessSprintRisk` | Sprint Risk |
| [Experiment design](experiment-design.md) | `src/experiments.ts` · `proposeExperimentSpec` | Experiment Design |
| [Experiment readout & decision](experiment-readout.md) | `src/readout.ts`, `src/experiments.ts` | Experiment, Weekly Readout |
| [Creative generation](creative-generation.md) | `src/creativeGen.ts` · `generateCreativeVariants` | Creative Generation |
| [Claims-risk review](claims-risk-review.md) | `src/utils/risk.ts`, `src/creativeClaims.ts` · `reviewCreativeClaimsRisk` | Claims, Creative, Triage |
| [Employer launch planning](employer-launch-planning.md) | `src/employerLaunch.ts` · `createEmployerLaunchPlan` | Employer Launch |
| [Dashboard specification](dashboard-specification.md) | `src/dashboards.ts` · `createDashboardSpec` | Dashboard |
| [Funnel friction analysis](funnel-friction-analysis.md) | `src/funnel.ts` · `analyzeFunnelFriction` | Funnel Friction |
| [Objection mining](objection-mining.md) | Prompt-driven (no dedicated action yet) | Research, Readout |
| [Backlog prioritization](backlog-prioritization.md) | `src/backlog.ts` · `prioritizeBacklog` | Backlog |
| [Weekly growth readout](weekly-growth-readout.md) | `src/readout.ts` · `generateWeeklyReadout` | Weekly Readout |

Related growth-execution skills also ship as agents/actions: audience/segment
building (`buildAudienceSegment`), personalization (`proposePersonalization`),
campaign orchestration (`buildCampaignPlan`), landing page specs
(`createLandingPageSpec`), referral loop design (`designReferralLoop`), and early
activation (`proposeActivationPlan`).

## MVP skill set (build first)

1. Issue context retrieval
2. Issue classification
3. Priority scoring
4. Requirements gap analysis
5. Acceptance criteria generation
6. Claims-risk review
7. Experiment design
8. Dashboard specification
9. Employer launch planning
10. Safe mutations & commenting

✅ All ten are implemented and unit-tested in this repo.

## Full production skill set (added)

Duplicate detection · Sprint risk · Epic breakdown · QA test cases · Creative
generation · Experiment readout · Funnel friction · Launch readiness scoring ·
Weekly readout · Backlog prioritization · Automation rule generation
([`../automation/`](../automation/)) · Objection mining · JQL generation
([`../automation/jql-filters.md`](../automation/jql-filters.md)) · Approval
boundary enforcement ([`safe-mutations.md`](safe-mutations.md)).

> Status legend used in each file: **✅ Implemented** (code + tests),
> **🟡 Partial** (code exists, sub-features prompt-driven),
> **📝 Prompt-driven** (lives in agent prompt; no dedicated action yet).
