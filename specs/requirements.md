# MVP Requirements

## Purpose

The MVP turns this repository into a working, portable Forge/Rovo Jira agent
system for AI Growth Ops. A Jira user should be able to open a configured
project, see the Rovo agents, run them on real seeded issues, and use Jira
Automation to post AI-labeled analysis comments without giving agents authority
to take unsafe actions. A new Jira site/project should be reproducible from an
instance config plus a golden template project when available.

## Current State

- Forge/Rovo is the only supported integration path. MCP/Cowork is out of scope.
- The Forge app is registered, deployed to the `development` environment, and
  installed on `myhealthcaresite.atlassian.net`.
- The `AIGO` Jira project exists and has 15 seeded `aigo-seed` issues.
- Local checks pass: `npm run build`, `npm test`, `npm run test:integration`,
  and `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`.
- The repo now includes instance-config scripts for rendering seeds and running
  provision/check commands against any target site/project.
- The repo now includes an initial 10-outcome roadmap for expanding the MVP into
  a Jira-native AI Growth Ops control plane.
- The remaining MVP work is mostly product configuration and validation inside
  Jira: issue types, statuses, workflow, Automation rule import, Rovo manual
  checks, and runbook polish.

## MVP Success Criteria

1. Rovo agent visibility
   - All 19 agents from `manifest.yml` are visible in Jira/Rovo on
     `myhealthcaresite.atlassian.net`.
   - At least these agents can be run manually on seeded issues:
     AI Growth Triage Agent, AI Creative Claims Agent, AI Experiment Design
     Agent, AI Employer Launch Agent, AI Duplicate Detector Agent, and
     AI Weekly Readout Agent.

2. Jira project readiness
   - Project `AIGO` is the default MVP project.
   - The project has the intended AIGO issue types:
     Growth Task, Experiment, Creative Request, Claims Review, Dashboard
     Request, Automation Request, Employer Launch, Segmentation Request,
     Signup Funnel Issue, Insight / Research Brief, Bug / Tracking Issue, and
     Decision Memo.
   - The project workflow supports the MVP statuses:
     To Do, AI Triage, Needs Info, Needs Human Review, Ready, Claims Review,
     In Progress, Blocked, Experiment Running, Readout Needed, Decision Needed,
     and Done.

3. Agent behavior
   - Agents read Jira issue context through Forge and return structured,
     reviewable recommendations.
   - Agent output is useful on the seeded AIGO issues and matches the domain
     checks covered by unit tests.
   - Agents do not approve claims, send campaigns, mutate audiences, change
     suppression, launch experiments, or modify production signup flows.

4. Automation behavior
   - Jira Automation rules are imported or rebuilt for:
     Intake Triage, Creative Claims Review, Experiment Spec, Employer Launch,
     and Weekly Readout.
   - Automation rules use "Use Rovo agent" plus explicit Jira Automation
     actions, not hidden autonomous mutation.
   - Automation comments include the AI analysis marker or equivalent text that
     makes the output clearly machine-generated and review-only.

5. Verification and operations
   - `forge install list` shows the Jira development installation as
     `Up-to-date`.
   - `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` passes.
   - A human can follow `docs/INTEGRATION.md` from a clean clone and reproduce
     the app install, seed import, and first Rovo agent run.
   - A human can follow `docs/PORTABILITY.md` to create another instance config,
     render seed data for a different project key, and dry-run the repeatable
     provisioning flow.

## Functional Requirements

### REQ-001: Forge/Rovo Deployment

The app must deploy through Forge and install to Jira with the scopes required
for Jira reads, Jira comments, and Rovo runtime.

Acceptance:
- `forge lint` has no errors.
- `forge deploy -e development` succeeds.
- `forge install -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes`
  succeeds or upgrades the existing installation.
- `forge install list` shows Jira on `myhealthcaresite.atlassian.net` as
  `Up-to-date`.

### REQ-002: Rovo Agent Catalog

The app must expose the 19 agents declared in `manifest.yml`.

Acceptance:
- Jira/Rovo UI lists the agents after deploy/install.
- Every agent prompt resource exists in `prompts/`.
- Every agent action reference resolves to a Forge action.
- Every action resolves to a short Forge function key and a real handler export.

### REQ-003: Jira Context Retrieval

Read-style actions must fetch the issue summary, description, issue type,
priority, components, labels, status, assignee, reporter, dates, project,
parent, subtasks, and recent comments.

Acceptance:
- `getIssueContext` returns a normalized `IssueContext`.
- Comments are included when visible to the app.
- Jira API errors return clear failures for 401, 403, or 404.

### REQ-004: Safe Comment Mutation

The only mutating Forge action in the MVP is `addAnalysisComment`.

Acceptance:
- No Rovo agent directly references `addAnalysisComment`.
- Comments are AI-labeled and analysis-only.
- Field writes, transitions, campaign sends, audience updates, and production
  changes remain out of scope unless explicitly added later behind an allowlist.

### REQ-005: Seeded Smoke Dataset

The repo must include portable seed data that exercises the primary agent paths.

Acceptance:
- `automation/seed/aigo-seed-issues.csv` imports into a fresh team-managed
  `AIGO` project as `Task` issues.
- Imported issues are labeled `aigo-seed`.
- The descriptions preserve intended AIGO types and target statuses for testing.

### REQ-006: Jira Automation MVP

Automation must route work through Rovo agents and post reviewable comments.

Acceptance:
- All five MVP rules are importable or manually reproducible from docs.
- Placeholders are replaced with the real project, actor, and agent values.
- Each rule is enabled only after its first audit-log validation succeeds.
- The Creative Claims rule may route risky creative work to Claims Review, but
  it must never approve claims.

### REQ-007: Documentation and Runbook

The install and operations docs must make the real success criteria obvious.

Acceptance:
- Docs state that agent visibility in Jira/Rovo is the primary install check.
- Docs distinguish Forge/Rovo install from Jira seed import.
- Docs explain how to verify deployment, install, seed data, Automation, and
  Rovo manual flows.

### REQ-008: Portable Instance Provisioning

The repo must support repeatable setup for many Jira Cloud sites/projects without
editing source files or committing tenant-specific generated data.

Acceptance:
- `instances/aigo.example.json` documents the per-instance contract.
- `npm run seed:render` renders a project-specific seed CSV from an instance
  config.
- `npm run provision:instance -- --help` documents install, project, seed,
  smoke, readiness, and dry-run steps.
- Scripts accept `AIGO_INSTANCE_CONFIG` and environment-variable overrides for
  site, Forge environment, project key/name, seed label, and template project.
- Docs recommend golden project cloning for scalable Jira configuration and
  clearly state that general Jira project configuration is not fully covered by
  a first-party Terraform provider.

### REQ-009: Initial Outcome Control Plane

The post-MVP roadmap must define the control plane required to support the first
10 AI Growth Ops outcomes:
intake and triage, segmentation and targeting, personalization journeys,
creative production, experimentation, research and objection mining, campaign
and employer-launch orchestration, signup funnel optimization, weekly decision
support, and product positioning.

Acceptance:
- `specs/outcome-roadmap.md` lists the Jira issue types, fields, workflows,
  agents, Automation, safety gates, tests, and documentation tasks needed for
  each outcome.
- The roadmap distinguishes existing Forge/Rovo functionality from missing
  implementation and manual Jira validation.
- The roadmap keeps Forge/Rovo as the primary execution platform and treats
  Terraform as a bounded provider spike until coverage is proven.
- The roadmap preserves the safe-by-default contract: AI drafts, classifies,
  recommends, and comments; humans approve claims, launches, audiences,
  suppression, and production changes.

## Non-Functional Requirements

- Safety: High-stakes actions require human approval.
- Portability: Skills and seed data remain in-repo where possible.
- Scalability: Site/project-specific settings are instance config, not source
  edits.
- Testability: Core domain logic stays pure and covered by Vitest.
- Operability: Live smoke tests verify Forge install and seeded Jira data.
- Maintainability: Forge manifest schema constraints are covered by integration
  tests so future changes do not break deployability.

## Out of Scope for MVP

- MCP/Cowork server support.
- Autonomous issue field updates or transitions from Forge actions.
- Direct campaign sending, audience mutation, suppression changes, or experiment
  launches.
- Production signup-flow writes.
- Custom-field writeback, dashboards, Slack notifications, or analytics
  warehouse integration.
- LLM-as-judge evals for prompt quality. These are post-MVP.
- Full implementation of all 10 outcome workflows. The MVP captures the roadmap
  and current partial implementation, then promotes individual outcome work
  through explicit tasks.

## Open Risks

- Rovo site availability must be confirmed manually in Jira; CLI smoke tests
  verify installation but not UI visibility.
- Team-managed Jira projects may require manual issue-type and workflow setup.
- Jira Automation import format can drift; manual rule rebuild must remain
  documented as a fallback.
- Current local Node is newer than Forge's supported range. Use Node 22 or 24
  for deploy/install work if Forge behavior becomes unstable.
