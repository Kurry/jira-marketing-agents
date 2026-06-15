# Setup Reference

## Prerequisites

- Node.js 22.x or 24.x for Forge CLI work. Newer versions may warn or behave
  unexpectedly.
- Atlassian Forge CLI on `PATH`.
- Atlassian CLI (`acli`) on `PATH` when importing seed issues from CSV.
- Jira Cloud site with Rovo enabled.
- Jira site admin rights for app install, project setup, Automation import, and
  scope consent.

## Local Health

Run from the repo root:

```bash
npm ci
npm install -g @forge/cli@latest
forge --version
forge settings set usage-analytics false
brew tap atlassian/homebrew-acli
brew trust atlassian/acli
brew install acli
acli --version
npm run build
npm test
```

`npm run build` and `npm test` are required before any deploy. `forge lint` must
pass with no errors before deploy. A warning for the intentionally standalone
`addAnalysisComment` action is acceptable.

## Forge App Install

```bash
forge login
forge whoami
forge lint
forge deploy -e development
forge install -e development -p jira --site "$JIRA_SITE" --confirm-scopes
forge install list
AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
```

Use `forge register` only when `manifest.yml` still has the placeholder app id
or you intentionally want a different app identity. The main success criterion is
that the Rovo panel in Jira lists the AI Growth Ops agents.

The manifest uses these classic scopes:

- `read:jira-work`
- `write:jira-work`
- `read:chat:rovo`

## Jira Project Setup

Default development project:

- Name: `AI Growth Ops`
- Key: `AIGO`

For repeatable setup across many sites/projects, copy
`instances/aigo.example.json` to `instances/<name>.json`, set `site`,
`projectKey`, `projectName`, and optionally `templateProjectKey`, then run:

```bash
AIGO_INSTANCE_CONFIG=instances/<name>.json npm run provision:instance -- --all --dry-run
```

Verify or create it with ACLI:

```bash
acli jira auth login --web
acli jira auth status
acli jira project list --paginate --json
acli jira project view --key AIGO --json
```

If the project does not exist and you have a company-managed source project to
clone, create it with:

```bash
acli jira project create --from-project "<SOURCE_KEY>" --key AIGO --name "AI Growth Ops"
```

If you use a team-managed project, create the project in Jira first, then use
ACLI for verification and seed import.

Issue types:

- Growth Task
- Experiment
- Creative Request
- Claims Review
- Dashboard Request
- Automation Request
- Employer Launch
- Segmentation Request
- Signup Funnel Issue
- Insight / Research Brief
- Bug / Tracking Issue
- Decision Memo

Statuses:

- To Do
- AI Triage
- Needs Info
- Needs Human Review
- Ready
- Claims Review
- In Progress
- Blocked
- Experiment Running
- Readout Needed
- Decision Needed
- Done

Minimum workflow for first smoke tests: To Do, AI Triage, Ready, Claims Review,
In Progress, Blocked, Decision Needed, Done.

## Seed Import

The portable CSV seed file is
`automation/seed/aigo-seed-issues.csv`.

```bash
AIGO_INSTANCE_CONFIG=instances/<name>.json npm run seed:render
acli jira workitem create-bulk --from-csv automation/seed/generated/<PROJECT>-seed-issues.csv --yes
acli jira workitem search --jql "project = <PROJECT> AND labels = aigo-seed ORDER BY created DESC" --fields "key,summary,status" --csv
```

The CSV uses `Task` for compatibility with a fresh team-managed `AIGO` project.
After configuring the custom AIGO issue types above, you can copy the CSV and
replace `issueType` values with the intended type names from each description.
Bulk import does not set arbitrary workflow statuses; transition imported issues
after creation if the target workflow supports those statuses.

For scale, prefer cloning a company-managed golden template project with ACLI
via `--from-project`; it carries more Jira configuration than a fresh project.

## Automation Import

Import `automation/rules/aigo-automation-ruleset.json` in Jira project
Automation. Replace:

- `__PROJECT_KEY__`
- `__PROJECT_ID__`
- `__ACTOR_ACCOUNT_ID__`
- `__TRIAGE_AGENT_KEY__`
- `__CREATIVE_CLAIMS_AGENT_KEY__`
- `__EXPERIMENT_AGENT_KEY__`
- `__EMPLOYER_LAUNCH_AGENT_KEY__`
- `__WEEKLY_READOUT_AGENT_KEY__`

Agent keys live in `manifest.yml`. If Jira rejects the imported Rovo action
type, reselect "Use Rovo agent" in the UI and preserve the trigger, conditions,
and comment/transition actions.
