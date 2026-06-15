# MVP Design

## System Overview

The MVP is a Forge app that exposes Rovo agents inside Jira. Each agent has a
prompt resource and a set of read-style actions. Actions invoke Forge functions,
which call thin TypeScript handlers. Handlers fetch Jira context, call pure
domain modules, and return structured output to Rovo or Jira Automation.

High-level flow:

```text
Jira/Rovo user or Automation
  -> rovo:agent in manifest.yml
  -> action module
  -> short Forge function key
  -> index.ts Forge entrypoint
  -> src/index.ts handler
  -> src/jira.ts Jira API read/comment helper
  -> pure domain module
  -> structured JSON or Markdown-ready analysis
```

## Current Deployment Shape

- App runtime: Forge `nodejs22.x`.
- Default environment: `development`.
- Target site: supplied by instance config or `JIRA_SITE`.
- Product: Jira.
- Default project key: `AIGO`, overridden by instance config or
  `AIGO_PROJECT_KEY`.
- Registered app id lives in `manifest.yml`.
- Rovo prompt resources are served from the shared `agent-prompts` resource.

The manifest intentionally keeps public Rovo action keys descriptive, while
Forge function module keys are short internal keys to satisfy Forge's function
key length limits and uniqueness rules.

## Initial Outcome Architecture

The expanded AI Growth Ops system has three layers:

1. Jira control plane
   - Issue types, custom fields, workflows, screens, queues, filters,
     dashboards, Automation rules, and human approval gates.
   - This layer decides whether work is ready, blocked, under review, running,
     waiting for readout, or done.

2. Forge/Rovo agent layer
   - Rovo agents classify, draft, summarize, recommend, create specs, and return
     reviewable analysis.
   - Forge actions read Jira context, call pure TypeScript modules, and return
     structured output.
   - The default write surface remains AI-labeled comments only.

3. Portable provisioning layer
   - Instance configs, seed rendering, Forge install, project create/clone,
     readiness checks, and Automation template rendering.
   - Golden company-managed Jira projects remain the default scale path until a
     Terraform provider is proven in a sandbox.

The 10 initial outcome workflows are tracked in
[`outcome-roadmap.md`](./outcome-roadmap.md). Current code implements several
agent capabilities, but the complete operating system still requires Jira admin
configuration, missing agents/modules, Automation validation, and documentation.

## Core Components

### Forge Manifest

`manifest.yml` is the source of truth for:

- 19 `rovo:agent` modules.
- 22 `action` modules.
- Short `function` modules that point to `index.<handlerName>`.
- Classic scopes:
  - `read:jira-work`
  - `write:jira-work`
  - `read:chat:rovo`
- Prompt resource mapping:
  - `resource:agent-prompts;<prompt-file>.md`

Design constraints:
- Rovo agent names must satisfy Forge length limits.
- Function module keys must be unique across all module types and no longer
  than 23 characters.
- Action inputs must include descriptions.
- `addAnalysisComment` remains standalone and is not referenced directly by
  Rovo agents.

### Handler Entry Points

`index.ts` re-exports handlers from `src/index.ts` so Forge can resolve handler
paths as `index.<functionName>`.

`src/index.ts` owns:
- Payload normalization.
- Required `issueKey` validation.
- Calls to Jira read helpers.
- Delegation to pure domain modules.
- Default weekly-readout JQL handling.
- The single mutating action wrapper for comments.

### Jira API Access

`src/jira.ts` owns Forge Jira API calls:
- `getIssue`
- `getIssueComments`
- `searchIssues`
- `addComment`
- `mapIssueToContext`

The normalized `IssueContext` is the contract between Jira and the domain
modules. It should remain stable unless a new agent capability needs additional
read-only context.

### Domain Logic

Domain modules in `src/` are pure logic. They should not call Forge APIs
directly. This keeps behavior testable with Vitest and makes Jira/Rovo failures
easier to isolate to handler or platform layers.

### Jira Project Configuration

The default development instance uses a Jira project named `AI Growth Ops` with
key `AIGO`. Portable installs use an instance config under `instances/` or
environment variables to supply site, project key, project name, seed label, and
optional template project key.

The live AIGO development project has the 14 canonical issue types, 15 retyped
seed issues, six MVP custom fields, the MVP status set, seven saved filters, six
dashboards, and five imported Automation rules. Team-managed project limitations
still matter: some status/board mapping and Rovo Automation setup is UI- or
plan-gated.

The repo provides a seed template that renders to a project-specific CSV before
import. For scalable Jira configuration, create a golden company-managed
template project with the intended issue types, screens, board, statuses, and
workflow; ACLI can then create customer/project instances from that template.
Fresh team-managed projects remain useful for smoke tests, but they may require
manual issue-type, board/status, and Automation steps before full readiness
passes.

### Instance Provisioning

`instances/aigo.example.json` defines the instance contract. Scripts load it via
`AIGO_INSTANCE_CONFIG` and support environment overrides. The core flow is:

```text
instance config
  -> render seed CSV for project key/label
  -> optionally deploy/install Forge to site
  -> create or clone Jira project
  -> import seed issues
  -> run smoke/readiness checks
  -> manual Rovo and Automation validation
```

The provision script intentionally does not pretend to Terraform-manage every
Jira admin object. It automates the supported CLI surfaces and documents the
remaining UI/template-project gates.

### Terraform Provider Strategy

Terraform is a post-MVP option, not the MVP foundation.

The official Atlassian Operations Terraform provider is useful for JSM/Compass
operations resources such as teams, schedules, escalations, services, alert
policies, notification rules, and routing rules. It does not cover the general
Jira project, workflow, board, screen, field, Automation, or Rovo surfaces this
system needs.

The most relevant Jira Cloud provider candidates are third-party:

- [`gothub97/terraform-provider-atlassian`](https://github.com/gothub97/terraform-provider-atlassian)
- [`lbajsarowicz/terraform-provider-atlassian`](https://github.com/lbajsarowicz/terraform-provider-atlassian)
- [`alc0der/terraform-provider-jira-automation`](https://github.com/alc0der/terraform-provider-jira-automation)
- [`fourplusone/terraform-provider-jira`](https://github.com/fourplusone/terraform-provider-jira)
- [`Vestmark/terraform-provider-jira`](https://github.com/Vestmark/terraform-provider-jira)

The spike must prove create, import, plan, drift, and destroy behavior against a
disposable Jira site before any `.tf` resources become the supported path. If
coverage is incomplete, keep the portable implementation on Forge CLI, ACLI,
Jira REST scripts, Automation JSON templates, and golden-project cloning.

### Jira Automation

Automation is the bridge from Jira events to Rovo agent runs.

MVP rule shape:
- Trigger or schedule.
- Project/issue-type condition.
- "Use Rovo agent" action.
- Explicit Jira Automation action to add `{{agentResponse}}` as a comment.
- Optional Creative Claims route to Claims Review.

Automation is allowed to post configured comments and route risky Creative
Requests to Claims Review. It must not approve claims or launch work.

## Data and Safety Model

Data read by agents:
- Jira issue fields and comments visible to the app.
- JQL search results for similar issues and weekly readouts.
- Seed issue content for smoke tests.

Data written by the app:
- Only AI-labeled Jira comments through `addAnalysisComment`.

Data written by Jira Automation:
- AI response comments configured by the human administrator.
- Optional Claims Review routing for Creative Claims only.

Explicitly disallowed in MVP:
- Claims approval.
- Campaign sends.
- Audience or suppression mutation.
- Experiment launch.
- Production signup-flow changes.
- Unallowlisted field writes.

## Verification Design

Local verification:
- `npm run build`
- `npm test`
- `npm run test:integration`
- `forge lint`

Live verification:
- `forge install list`
- `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`
- `npm run seed:render`
- `npm run provision:instance -- --all --dry-run`
- Manual Rovo UI check for agent visibility.
- Manual Rovo run on seeded issues.
- Jira Automation audit-log validation after importing or rebuilding rules.

Integration tests protect deployability by checking:
- Prompt resources exist.
- Agent action references resolve.
- Action function references resolve.
- Function keys satisfy Forge constraints.
- Action inputs include descriptions.
- Only the comment mutation is non-GET.

## Remaining Design Gaps Before MVP

1. Jira Automation rules are imported disabled, but live Rovo "Use agent" steps
   require Atlassian Intelligence/Premium support before they can be enabled and
   audit-log validated.
2. Live Rovo comments from Automation are pending the same Automation/Rovo plan
   blocker.
3. Field writes, issue transitions, subtask creation, and linked-ticket creation
   remain deliberately deferred behind a future allowlisted write design.
4. Each new Jira tenant/project needs an instance config and either a golden
   template project clone or manual Jira project setup.

## Post-MVP Design Options

- Add custom-field read/write mapping behind an explicit allowlist.
- Add a dedicated issue transition action behind an admin allowlist.
- Add prompt-quality evals for regression scoring.
- Add dashboards or reporting around agent usage and decision outcomes.
- Add production/staging environment promotion docs after the development flow
  is stable.
- Evaluate third-party Terraform providers only after validating they cover the
  exact Jira project, workflow, board, Automation, import/drift, and destroy
  surfaces needed.
