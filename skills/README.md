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
