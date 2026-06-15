# Jira AI Growth Ops — Forge/Rovo Agents

A production-ready [Atlassian Forge](https://developer.atlassian.com/platform/forge/)
app that defines Jira/Rovo agents **in code** for an AI Growth Ops (AIGO)
ticketing system. It automates intake triage, requirements analysis, experiment
design, creative claims review, employer-launch workback planning, dashboard
specs, signup-funnel analysis, duplicate detection, backlog prioritization, and
weekly growth readouts.

It is **safe by default**: agents analyze and draft, they never take high-stakes
actions (see [Safety model](#5-safety-model)).

**Forge/Rovo integration.** The growth-ops logic in `src/` powers Atlassian
Forge actions and Rovo agents that run inside Jira
([`docs/INTEGRATION.md`](docs/INTEGRATION.md)).

---

## 1. What this app does

The app exposes 19 Rovo agents and 22 callable actions. Each agent reads a Jira
issue (or a JQL result set), runs deterministic TypeScript logic, and returns
**structured JSON** plus optional Markdown for comments. The only mutating Forge
action is `addAnalysisComment`, which posts an AI-labeled comment.

Coverage spans the full member-acquisition lifecycle: **triage & planning**
(triage, requirements, epics, duplicates, sprint risk, acceptance criteria, QA),
**audience & creative** (audience/segment building, personalization, creative
generation, claims review), **funnel & conversion** (campaign orchestration,
landing page specs, referral loops, signup-funnel analysis, early activation),
and **measurement** (experiment design, dashboard specs, weekly readouts).

It is built for Twin's member-acquisition workflow: identifying high-potential
populations, designing/running experiments, moving registration & CAC, and
keeping a tight weekly operating cadence — all with compliance guardrails for a
regulated healthcare context.

## 2. Architecture (text diagram)

```
                         ┌─────────────────────────────────────────┐
   Jira user / Rovo      │              manifest.yml                │
   chat / Automation ───▶│  rovo:agent  ·  action  ·  function      │
                         │  resources (prompts/*.md)                │
                         └───────────────┬─────────────────────────┘
                                         │ invokes handler
                                         ▼
                         ┌─────────────────────────────────────────┐
                         │              src/index.ts                │
                         │  (thin handlers; normalize inputs)       │
                         └───────────────┬─────────────────────────┘
                  reads issue            │            delegates
                         ▼               │               ▼
       ┌───────────────────────────┐    │   ┌───────────────────────────────┐
       │        src/jira.ts        │    │   │  domain modules (pure logic)  │
       │ api.asApp().requestJira() │◀───┘   │ triage · requirements ·       │
       │ getIssueContext, search,  │        │ experiments · creativeClaims ·│
       │ addComment, toAdf         │        │ employerLaunch · dashboards · │
       └───────────────────────────┘        │ funnel · duplicates · backlog │
                  ▲                          │ · readout                     │
                  │ utils: text, scoring,    └───────────────────────────────┘
                  │ risk, adf                            │ returns structured JSON
                  └──────────────────────────────────────┘
```

Domain modules are **pure functions** over an `IssueContext`, which makes them
fully unit-testable without the Jira API (see `tests/`).

## 3. Agents

| Agent | Purpose |
| --- | --- |
| AI Growth Triage Agent | Classify intake: area, priority, risk, missing info, owner, next status |
| AI Requirements Gap Agent | Missing requirements, clarifying questions, ready-for-work |
| AI Epic Breakdown Agent | Child stories with acceptance criteria, dependencies, owners |
| AI Duplicate Detector Agent | Likely duplicate issues by text/label/component overlap |
| AI Sprint Risk Agent | Execution risk, blockers, mitigation plan |
| AI Acceptance Criteria Agent | Acceptance criteria, definition of done, QA checks |
| AI QA Test Case Agent | QA test cases (happy/edge/tracking/claims/device) |
| AI Experiment Design Agent | Experiment spec with metrics, guardrails, decision rule |
| AI Creative Claims Agent | Claims-risk review and safer rewrites (never approves) |
| AI Employer Launch Agent | Launch workback, readiness score, subtasks |
| AI Dashboard Spec Agent | Dashboard analytics specification |
| AI Funnel Friction Agent | Signup funnel issue analysis |
| AI Weekly Readout Agent | Weekly growth readout over recent AIGO issues |
| AI Creative Generation Agent | Draft compliant creative variants per channel (claims-scanned) |
| AI Audience Builder Agent | Propose candidate segments + personalization (never mutates audiences) |
| AI Campaign Orchestration Agent | Draft multi-touch outreach plan for a human to execute |
| AI Landing Page Agent | Conversion-optimized landing page spec with draft copy |
| AI Referral Loop Agent | Referral mechanic, tracking, fraud guardrails, compliance flags |
| AI Activation Agent | Early-activation plan to get registered members to first value |

## 4. Actions

| Action | Verb | Purpose |
| --- | --- | --- |
| `getIssueContext` | GET | Fetch summary, description, fields, comments, labels, components |
| `classifyGrowthIssue` | GET | Classify type, area, risk, priority, missing info |
| `findSimilarIssues` | GET | Search similar issues by text/JQL |
| `proposeAcceptanceCriteria` | GET | Generate acceptance criteria |
| `proposeRequirementsGaps` | GET | Identify missing requirements |
| `breakDownEpic` | GET | Propose child stories/subtasks |
| `assessSprintRisk` | GET | Assess execution risk |
| `generateQATestCases` | GET | Generate QA test cases |
| `proposeExperimentSpec` | GET | Generate experiment spec |
| `reviewCreativeClaimsRisk` | GET | Claims-risk review + safer rewrites |
| `createEmployerLaunchPlan` | GET | Employer launch workback + subtasks |
| `createDashboardSpec` | GET | Dashboard analytics spec |
| `analyzeFunnelFriction` | GET | Signup funnel analysis |
| `generateWeeklyReadout` | GET | Weekly summary over recent AIGO issues |
| `generateCreativeVariants` | GET | Draft compliant creative variants (claims-scanned) |
| `buildAudienceSegment` | GET | Propose audience/segment definition |
| `proposePersonalization` | GET | Propose personalization variables & rules |
| `buildCampaignPlan` | GET | Draft multi-touch outreach plan (no send) |
| `createLandingPageSpec` | GET | Landing page spec with draft copy |
| `designReferralLoop` | GET | Referral loop design with guardrails |
| `proposeActivationPlan` | GET | Early-activation plan |
| `addAnalysisComment` | UPDATE | **Only** mutation: add an ADF comment |

## 5. Safety model

This app is **safe by default**. See [`policies/safe-mutations.md`](policies/safe-mutations.md),
[`policies/claims-risk-policy.md`](policies/claims-risk-policy.md), and
[`policies/experiment-policy.md`](policies/experiment-policy.md).

- Agents may **analyze, summarize, and draft** — never act.
- The app will **never** autonomously approve claims, send campaigns, change
  audiences, alter suppression rules, launch experiments, or modify production
  signup flows.
- The **only** mutating Forge action is `addAnalysisComment` (a clearly AI-labeled
  comment). Field writes are future work behind an explicit allowlist.
- Rovo actions invoked by Automation are treated as **read-style**; Jira
  Automation may add the configured comment and, for Creative Claims only, route
  risky creative work to **Claims Review** without approving it.

## 6. Required Forge commands

```bash
npm install
npm install -g @forge/cli@latest
forge --version
forge settings set usage-analytics false
forge login
forge whoami
forge lint
forge deploy -e development
forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes
forge install list
```

This repo now has a registered Forge app id in `manifest.yml`. Only run
`forge register` again if you intentionally want a different app identity.
The primary install success check is that the Rovo panel in Jira lists the AI
Growth Ops agents.

> **Full step-by-step install & wiring:** see
> [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — tooling, register/deploy/install,
> scopes, project/issue-type/workflow setup, custom fields, Rovo enablement,
> Automation wiring, an end-to-end smoke test, and troubleshooting.
> The remaining MVP operator checklist lives in
> [`docs/MVP_RUNBOOK.md`](docs/MVP_RUNBOOK.md).
> Multi-site/project provisioning guidance lives in
> [`docs/PORTABILITY.md`](docs/PORTABILITY.md).
> For diagnosing Rovo UI visibility, Forge install/deploy failures, Automation
> audit logs, and log-search recipes, see
> [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).
> Release steps for manifest and prompt changes live in
> [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).

For CLI seed import, install/authenticate ACLI and import the portable seed CSV:

```bash
brew tap atlassian/homebrew-acli
brew trust atlassian/acli
brew install acli
acli jira auth login --web
AIGO_INSTANCE_CONFIG=instances/aigo.example.json npm run seed:render
acli jira workitem create-bulk --from-csv automation/seed/generated/AIGO-seed-issues.csv --yes
```

## 7. Jira Automation setup

See [`automation/jira-automation-rules.md`](automation/jira-automation-rules.md)
and [`automation/jql-filters.md`](automation/jql-filters.md). Importable
**Automation-as-code** JSON for all five rules lives in
[`automation/rules/`](automation/rules/) (bundle:
`aigo-automation-ruleset.json`) — import via **Project settings → Automation →
Import rules**, then replace the documented placeholders. In short:

1. Create the AIGO project and the issue types listed below.
2. Add Automation rules that use the **Use Rovo agent** action and post
   `{{agentResponse}}` via an explicit **Add comment** action:
   - Intake Triage (issue created)
   - Creative Claims (transition to Ready; may route risky work to Claims Review)
   - Experiment Spec (created / AI Triage)
   - Employer Launch (created)
   - Weekly Readout (scheduled Monday 8 AM)

**Saved Jira filters** for all seven operational queues are provisioned by
`scripts/provision-filters.cjs` (idempotent). Filter details and IDs are in
[`evidence/jira-config/queues.md`](evidence/jira-config/queues.md).

**Dashboards** for the six operational views are provisioned by
`scripts/provision-dashboards.cjs` (idempotent — skips existing by name). Uses
filter IDs from `provision-filters.cjs` as gadget data sources.

**Automation rule import (IaC):** Rendered rule JSON in `automation/rules/rendered/`
is imported via the Forge function `fn-import-automation` using
`npm run provision:automation:forge`. All rules are imported **DISABLED**; an
operator enables them one at a time after reviewing the audit log (see T-M3-03).
This requires the `manage:jira-configuration` scope to be accepted at `forge install`.

> **Rovo/AI activation required (BLK-02):** The "Use agent" / "Use Rovo agent"
> step in Automation requires Rovo/AI to be active for the organization. Current
> Atlassian docs say Rovo is included with paid Standard, Premium, and
> Enterprise subscriptions; Free subscriptions cannot use Rovo, and orgs need a
> verified business domain. Confirm billing/domain eligibility, enable Rovo/AI,
> then follow
> [`skills/jira-automation-rovo-setup/SKILL.md`](skills/jira-automation-rovo-setup/SKILL.md)
> to wire Rovo into all five rules and enable them.
> Use [`skills/jira-automation-browser-edit/SKILL.md`](skills/jira-automation-browser-edit/SKILL.md)
> for browser-based flow inspection (Claude in Chrome).

## 8. Custom fields guidance

Custom field IDs are **instance-specific** and are not hard-coded. For the MVP,
agent outputs are surfaced through **comments and labels** rather than custom
field writes.

Supported (optional) fields to configure in your instance: Workflow Area, AI
Agent Owner, Segment, Employer/Partner, Channel, Primary Metric, Guardrail
Metric, Experiment ID, Variant ID, Claims Risk, Automation Level, Decision
Needed, Expected Impact, Confidence, Effort, Priority Score, Source System, Due
Date / Decision Date.

To enable field writes later, set the env vars in [`src/config.ts`](src/config.ts)
(e.g. `WORKFLOW_AREA_FIELD_ID`) and gate writes behind an explicit allowlist
(see [Future extensions](#future-extensions)).

Issue types: Growth Task, Experiment, Creative Request, Claims Review, Dashboard
Request, Automation Request, Employer Launch, Segmentation Request, Signup Funnel
Issue, Insight / Research Brief, Bug / Tracking Issue, Decision Memo.

## 9. Deployment steps

1. `npm install`
2. `npm install -g @forge/cli@latest`
3. `forge --version` and `forge settings set usage-analytics false`
4. `npm run build` and `npm test` (must pass — see below)
5. `forge login` and `forge whoami`
6. `forge lint`
7. `forge deploy -e development`
8. `forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes`
9. `forge install list` and confirm the Jira installation is `Up-to-date`
10. Open Jira/Rovo and confirm the agents are visible before configuring Automation.
11. Configure the Automation rules from section 7.

## 10. Test commands

```bash
npm run build    # tsc --noEmit type check
npm test         # vitest run
npm run test:integration
npm run test:readiness:jira
npm run test:smoke:jira
npm run test:watch
npm run seed:render
npm run provision:instance -- --help
```

## 11. IaC provision commands

All provisioning scripts are idempotent (safe to re-run):

```bash
npm run provision:all               # full single-shot: deploy → jira → seeds → filters → dashboards → automation:forge
npm run provision:jira              # issue types, custom fields, workflow statuses, field options
npm run provision:seeds             # seed issues (15 issues, one per canonical type)
npm run provision:filters           # 7 JQL saved filters
npm run provision:dashboards        # 6 operational dashboards
npm run provision:automation:forge  # import 5 automation rules (DISABLED) via Forge function
```

Dry-run any script before executing:

```bash
node scripts/provision-jira.cjs --dry-run
node scripts/provision-dashboards.cjs --dry-run
node scripts/forge-import-automation.cjs --dry-run
```

Full per-instance guide: [`docs/PORTABILITY.md`](docs/PORTABILITY.md).

The project is developed **test-first (TDD)**: each domain module has a matching
test under `tests/` (triage, requirements, experiments, creative claims,
dashboards, duplicates, employer launch, funnel, backlog/sprint risk, readout,
ADF/comments, and growth execution: creative generation, audience/personalization,
campaign, landing page, referral, activation).

Forge/Rovo integration testing is not the same thing as evals. CI-safe
integration tests assert manifest/prompt/action/handler contracts. Live smoke
tests run after `forge deploy` + `forge install` and verify the Jira project and
seed issues with ACLI. The readiness check reports live AIGO issue-type, seed,
and observed-status gaps; use `AIGO_READINESS_WARN_ONLY=1` while Jira product
setup is still incomplete. Evals can be added later for prompt-quality scoring.

## Future extensions

- Custom field update action behind an allowlist of field IDs.
- Confluence knowledge-source lookup (twin-context, twin-claims-rules,
  twin-segments, twin-experiments).
- Jira Assets integration for Employer / Partner objects.
- Dashboard URL linking; Slack notifications via Automation.
- Forge storage for agent configuration; agent usage / decision metrics.
- Issue-transition action behind an explicit admin allowlist.

## Repository layout

```
manifest.yml          Forge modules: rovo:agent, action, function, resources
src/                  TypeScript handlers + pure domain logic + utils (shared core)
prompts/              One Markdown prompt per agent
skills/               Reusable agent skill modules (grounded in src/ + manifest)
policies/             Safety, claims-risk, and experiment policies
automation/           Jira Automation rules and JQL filters
docs/                 INTEGRATION.md, MVP_RUNBOOK.md, TROUBLESHOOTING.md,
                      PORTABILITY.md, MVP_READINESS.md, RELEASE_CHECKLIST.md
instances/            Per-site/project provisioning config templates
specs/                MVP requirements, design, and task roadmap
specs/agent-team/     Agent team mission, quality gates, task board, and
                      verification matrix (MISSION.md, QUALITY_GATES.md,
                      TASK_BOARD.md, VERIFICATION_MATRIX.md)
tests/                Vitest unit tests (TDD)
evidence/             Verified evidence files (agent runs, automation, gates,
                      rovo visibility, safety, team notes)
```
