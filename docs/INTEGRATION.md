# Jira Integration Guide

End-to-end instructions for deploying the AI Growth Ops Forge/Rovo app into a
Jira Cloud site and wiring it into a working ticketing system. Follow the
sections in order; each ends with a verification step.

For many Jira sites/projects, use the instance-based flow in
[`PORTABILITY.md`](PORTABILITY.md) rather than copying these commands by hand.

> **Audience:** a Jira site admin + a developer with Node.js installed.
> **Time:** ~60–90 minutes for a first install.
> **Prerequisites recap:** a Jira Cloud site with **Rovo enabled** (Atlassian
> Intelligence / Rovo subscription), admin rights, Node.js ≥ 20, and the
> Atlassian Forge CLI.

---

## 0. How the pieces fit

```
 Jira Cloud site
 ├─ Project: AIGO (issue types, fields, statuses, workflow)
 ├─ Rovo  ──────────────► invokes ► Forge app (this repo)
 │                                   ├─ rovo:agent  (13 + 6 agents)
 │                                   ├─ action       (22 actions)
 │                                   └─ function     (TS handlers → Jira REST)
 └─ Automation rules ───► "Use Rovo agent" ► {{agentResponse}} ► Add comment / route
```

- **Agents** are how humans (and Automation) talk to the app — in Rovo chat or
  via the *Use Rovo agent* Automation action.
- **Actions** are the callable tools each agent uses; they run **Forge
  functions** that call the Jira REST API as the app.
- **Automation** drives the agents on triggers/schedules, writes the result back
  as a comment, and may route risky Creative Requests to Claims Review.

Full module list: [`../manifest.yml`](../manifest.yml). Capability catalog:
[`../skills/README.md`](../skills/README.md).

---

## 1. Install tooling & dependencies

```bash
# In the repo root
npm install
npm install -g @forge/cli@latest   # Forge CLI
forge --version
forge settings set usage-analytics false
brew tap atlassian/homebrew-acli   # Atlassian CLI for Jira seed import
brew trust atlassian/acli
brew install acli
acli --version

# Verify the project is healthy before deploying
npm run build               # tsc --noEmit
npm test                    # vitest (should report all tests passing)
```

Forge CLI currently supports Node.js 22.x or 24.x. If you see warnings on a
newer Node version, switch to Node 22 or 24 before deploy/install work.

If `build` or `test` fails, stop and fix it first — the CI workflow
([`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)) enforces both.

**Verify:** `forge --version` and `acli --version` print versions; `npm test`
is green.

---

## 2. Authenticate & confirm the Forge app identity

```bash
forge login           # use an Atlassian API token for your admin account
forge whoami          # verify the active Atlassian account
```

`manifest.yml` contains the registered app id for the shared development app.
Only run `forge register` if the id is a placeholder or you intentionally want a
different app identity.

Do not run `forge lint`, `forge deploy`, or `forge install` while the placeholder
app id is still present; the Forge CLI rejects it as an invalid app id.

**Verify:** `forge whoami` shows the expected account and `manifest.yml`
`app.id` is a real UUID, not `00000000-0000-0000-0000-000000000000`.

---

## 3. Understand the permission scopes

The app requests **classic** scopes (`manifest.yml` → `permissions.scopes`):

| Scope | Why |
| --- | --- |
| `read:jira-work` | Read issues, comments, JQL search (all read actions) |
| `write:jira-work` | Add the analysis comment (`addAnalysisComment`) only |
| `read:chat:rovo` | Rovo agent runtime |

When you `forge deploy` and `forge install`, the admin is prompted to consent to
these scopes. If you later switch to **granular** scopes, replace them with the
equivalents (e.g. `read:issue:jira`, `read:comment:jira`, `write:comment:jira`,
`read:jql:jira`) and re-deploy. Start classic for the MVP.

**Verify:** `forge deploy` prints the three scopes for consent.

---

## 4. Deploy & install

```bash
forge lint            # validates the manifest
forge deploy -e development
forge install -e development -p jira --site "$JIRA_SITE" --confirm-scopes
forge install list
```

Environments: `forge deploy -e development|staging|production`. Promote with the
same command per environment. Re-run `forge deploy` after any code/manifest
change; `forge install --upgrade` if scopes changed.

**Verify:** `forge install list` shows the Jira installation for
the target Jira site as `Up-to-date`.

---

## 5. Create the AIGO project

1. **Projects → Create project** → team-managed or company-managed (either
   works; company-managed gives shared workflows/fields).
2. Name it **AI Growth Ops**, key **`AIGO`** (the app defaults to this key — see
   `AIGO_PROJECT_KEY` in [`../src/config.ts`](../src/config.ts); override via env
   if you use a different key).

**Verify:** issues create as `AIGO-1`, `AIGO-2`, …

CLI verification:

```bash
acli jira auth login --web
acli jira auth status
acli jira project list --paginate --json
acli jira project view --key AIGO --json
```

If the project does not exist and you have an existing company-managed project
to clone, ACLI can create it:

```bash
acli jira project create --from-project "<SOURCE_KEY>" --key AIGO --name "AI Growth Ops"
```

For a team-managed project, create it in Jira first, then use ACLI to verify and
seed it.

---

## 6. Create issue types

Add these issue types (Project settings → Issue types, or the company-managed
issue-type scheme):

Growth Task · Experiment · Creative Request · Claims Review · Dashboard Request ·
Automation Request · Employer Launch · Segmentation Request · Signup Funnel Issue ·
Insight / Research Brief · Bug / Tracking Issue · Decision Memo

These map to the agents' `recommendedIssueType` outputs (see
[`../skills/issue-classification.md`](../skills/issue-classification.md)).

**Verify:** all 12 types appear in the AIGO create dialog.

---

## 6a. Import seed issues with ACLI

The repo includes a portable seed CSV:
[`../automation/seed/aigo-seed-issues.csv`](../automation/seed/aigo-seed-issues.csv).

```bash
AIGO_INSTANCE_CONFIG=instances/aigo.example.json npm run seed:render
acli jira workitem create-bulk --from-csv automation/seed/generated/AIGO-seed-issues.csv --yes
acli jira workitem search --jql "project = AIGO AND labels = aigo-seed ORDER BY created DESC" --fields "key,summary,status" --csv
```

The CSV imports as `Task` so it works in a fresh team-managed `AIGO` project
before custom issue types are configured. Each description records the intended
AIGO type, target status, and test signals for the agents. After the custom
issue types exist, copy the CSV and replace `issueType` values with the intended
type names.

CSV import creates issues in the workflow's initial status. Transition imported
issues after creation only if your workflow supports the target status:

```bash
acli jira workitem transition --jql "project = AIGO AND labels = aigo-seed AND summary ~ \"Blocked\"" --status "Blocked" --yes
```

**Verify:** the search command returns the imported `AIGO-*` issue keys.

---

## 7. Configure statuses & workflow

The agents recommend these statuses (`recommendedNextStatus` /
`recommendedStatus`). Add any that don't exist and wire them into the AIGO
workflow:

```
To Do ─► AI Triage ─► Needs Info ──┐
                  └─► Needs Human Review ─► Ready ─► In Progress
Ready ─► Claims Review (for Creative/Claims) ─► In Progress
In Progress ─► Experiment Running ─► Readout Needed ─► Decision Needed ─► Done
Any ─► Blocked ─► (back to prior status)
```

Minimum viable set if you want to start small: **To Do, Needs Info, Needs Human
Review, Ready, In Progress, Blocked, Done** — plus **Claims Review** if you use
the creative-claims rule. The agents only *recommend* transitions; a human or an
explicit Automation step performs them.

**Verify:** the AIGO workflow contains the statuses your Automation rules
reference (especially `Ready` and `Claims Review`).

CLI readiness report:

```bash
npm run test:readiness:jira

# During setup, collect the same report without failing on missing configuration
AIGO_READINESS_WARN_ONLY=1 npm run test:readiness:jira
```

The readiness script can prove project issue types and seed data with ACLI. It
cannot prove unobserved team-managed workflow statuses or Rovo UI visibility;
verify those in Jira.

---

## 8. Custom fields (optional for MVP)

**You do not need custom fields to start.** Agent output is delivered as
**comments and labels**, not field writes — field IDs are instance-specific and
the app never guesses them.

When you're ready to map outputs to fields, create the fields you want from this
list and wire their IDs via environment variables in
[`../src/config.ts`](../src/config.ts) (`FIELD_IDS`):

Workflow Area · AI Agent Owner · Segment · Employer / Partner · Channel · Primary
Metric · Guardrail Metric · Experiment ID · Variant ID · Claims Risk · Automation
Level · Decision Needed · Expected Impact · Confidence · Effort · Priority Score ·
Source System · Due / Decision Date.

```bash
# Example: expose a field id to the app (Forge environment variable)
forge variables set WORKFLOW_AREA_FIELD_ID customfield_10234
forge variables set CLAIMS_RISK_FIELD_ID    customfield_10240
forge deploy
```

> Writing custom fields is **future work behind an explicit allowlist** (see
> [`../policies/safe-mutations.md`](../policies/safe-mutations.md)). The MVP only
> reads fields and writes comments.

**Verify:** `forge variables list` shows any IDs you set.

---

## 9. Enable & test the Rovo agents

1. Open Jira on the configured `JIRA_SITE`.
2. Open an `AIGO` issue → the **Rovo** chat panel (or the global Rovo chat).
3. Confirm the app's agents are listed, e.g. **AI Growth Triage Agent**,
   **AI Creative Claims Agent**, **AI Experiment Design Agent**, etc.
4. Try a conversation starter on a real issue: *"Triage this issue."*
   The agent calls `getIssueContext` → `classifyGrowthIssue` and returns the
   structured triage.

Agent ↔ action wiring lives in [`../manifest.yml`](../manifest.yml) under
`modules.rovo:agent[*].actions`. Prompts are in
[`../prompts/`](../prompts/).

**Verify:** the Rovo panel lists the AI Growth Ops agents and at least one agent
returns a structured response on a real issue.

---

## 10. Wire Jira Automation

Two paths — pick one:

### 10a. Import the rules-as-code (fastest)

Importable JSON for all five rules is in
[`../automation/rules/`](../automation/rules/):

1. **Project settings → Automation → ⋯ → Import rules** and upload
   `aigo-automation-ruleset.json`.
2. Open each imported rule and replace placeholders
   (`__PROJECT_KEY__`, `__PROJECT_ID__`, `__ACTOR_ACCOUNT_ID__`,
   `__*_AGENT_KEY__` — agent keys are in `manifest.yml`).
3. Enable each rule.

See [`../automation/rules/README.md`](../automation/rules/README.md) for the
placeholder reference and the Rovo-action type caveat.

### 10b. Build the rules by hand

Follow the step-by-step in
[`../automation/jira-automation-rules.md`](../automation/jira-automation-rules.md).
Each rule: a trigger, a JQL/issue-type condition, a **Use Rovo agent** action,
then an **Add comment** action with `{{agentResponse}}`.

The five rules: Intake Triage (created) · Creative Claims (→ Ready) · Experiment
Spec (created / AI Triage) · Employer Launch (created) · Weekly Readout
(scheduled Mon 8 AM → Decision Memo).

**Verify:** create a test `AIGO` issue → the Intake Triage rule runs → an
`🤖 AI Growth Ops` comment appears within a minute (check the rule's audit log).

---

## 11. Reusable JQL

Boards, queues, and rule conditions can reuse the filters in
[`../automation/jql-filters.md`](../automation/jql-filters.md) — untriaged
intake, needs-human-review, due-soon-not-in-progress, blocked, claims-risk, and
the weekly-readout default:

```
project = AIGO AND updated >= -7d ORDER BY updated DESC
```

**Verify:** the weekly-readout JQL returns recent issues in the Jira search.

---

## 12. End-to-end smoke test

1. Create `AIGO` issue: *"Signup broken — users cannot register on mobile."*
   → Intake Triage comments: workflow area **Signup Funnel**, high priority,
   next status **Needs Human Review**.
2. Create `Creative Request`, transition to **Ready**, body containing
   *"guaranteed reversal of diabetes."* → Creative Claims comments **Prohibited**
   with safer rewrites and **human review required**.
3. Create `Experiment` with a vague body. → Experiment Spec comments
   **not ready** with reasons.
4. Create `Employer Launch` missing assets. → Employer Launch comments a
   readiness score < 70 with blockers.
5. Run the Weekly Readout rule manually. → a **Decision Memo** is created with
   the readout.

These mirror the unit tests in [`../tests/`](../tests/), so behavior in Jira
should match what CI verifies.

**Verify:** all five produce the expected comments/issues.

---

## 13. Automated integration checks

Forge does not replace integration tests with evals. Use three layers:

1. **Local unit tests:** deterministic domain logic with Vitest (`npm test`).
2. **CI-safe integration tests:** manifest, prompt, action, handler, and safety
   contracts (`npm run test:integration`). These do not need Jira credentials.
3. **Live Forge/Jira smoke tests:** after `forge deploy` and `forge install`,
   verify Jira auth, Forge install visibility, and seeded `AIGO` issues:

```bash
npm run test:integration
AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira
npm run test:readiness:jira

# Optional: import seeds first when the target project is empty
AIGO_IMPORT_SEED=1 npm run test:smoke:jira

# Optional: report readiness gaps without failing while Jira setup is incomplete
AIGO_READINESS_WARN_ONLY=1 npm run test:readiness:jira
```

For live Rovo behavior, use product smoke tests plus Forge debugging tools:
`forge tunnel` while exercising Jira/Rovo manually, and `forge logs` after a
deployed run. Evals are still useful for prompt quality, regression scoring, and
agent-output rubric checks, but they should sit on top of these integration
checks rather than replace deployment/Jira validation.

`test:smoke:jira` verifies Forge auth every time. Set
`AIGO_REQUIRE_FORGE_INSTALL=1` when validating agent visibility work so the smoke
test fails unless `forge install list` can see the Jira installation.

**Verify:** `npm run test:integration` passes locally and
`npm run test:smoke:jira` prints the seeded `AIGO-*` issue keys.

---

## 14. MVP runbook and release checklist

Use [`MVP_RUNBOOK.md`](MVP_RUNBOOK.md) as the long-horizon operating checklist.
It captures the current live Jira state, the remaining product-admin gaps,
manual Rovo checks, Automation validation, release checklist, rollback, and
known limitations.

---

## 15. Operating model & governance

- **Safety:** the app never approves claims, sends campaigns, changes audiences/
  suppression, launches experiments, or modifies production signup. The only
  mutation is the analysis comment. Authority model:
  [`../policies/safe-mutations.md`](../policies/safe-mutations.md),
  [`../policies/claims-risk-policy.md`](../policies/claims-risk-policy.md),
  [`../policies/experiment-policy.md`](../policies/experiment-policy.md).
- **Human gates:** Claims Review, experiment go/no-go, launch go/no-go, audience/
  suppression changes, and production signup changes are always human steps.
- **Audit:** every agent comment is marked `🤖 AI Growth Ops (analysis only)`;
  Automation rules keep an audit log; outputs are structured for review.
- **Weekly cadence:** the Weekly Readout rule produces a Decision Memo each
  Monday for the growth standup.

---

## 16. Upgrades & CI

- Code/manifest change → `npm test` → `forge deploy` → (if scopes changed)
  `forge install --upgrade`.
- GitHub Actions ([`../.github/workflows/`](../.github/workflows/)) runs
  `build` + `test` on Node 20/22 for every push and PR, plus a non-blocking
  `forge lint`. Keep the PR green before deploying.

---

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Agents don't appear in Rovo | App not deployed/installed to the Jira site, missing `read:chat:rovo` consent, or Rovo disabled | Run `forge deploy -e development`, `forge install -e development -p jira --site "$JIRA_SITE" --confirm-scopes`, then `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`; confirm Rovo/Atlassian Intelligence is enabled |
| Action returns `Jira API failed: 401/403` | Missing scope consent or wrong site | Re-`forge install`; ensure admin consented to all three scopes |
| `Jira API failed: 404` on `getIssueContext` | Bad issue key or app lacks project access | Confirm the key; ensure the app is installed where the project lives |
| No comment after a rule runs | Rule disabled, condition didn't match, or actor lacks comment permission | Check the rule **audit log**; verify the actor account can comment |
| Weekly readout empty | JQL matched nothing / wrong project key | Test the JQL in search; set `AIGO_PROJECT_KEY` if your key isn't `AIGO` |
| Imported rule errors on the Rovo action | Site uses a different internal action type | Import the rule, then re-select the agent in the builder (see rules README) |
| Triage misclassifies area | Sparse summary/description | Add detail; the classifier is most-matches-wins over the text/labels |
| Field write expected but didn't happen | By design — MVP writes comments only | Configure `FIELD_IDS` + allowlist (future work) if you need field writes |
| `test:readiness:jira` fails on missing issue types | AIGO project still has only default team-managed types | Add the 12 AIGO issue types in Jira project settings, then rerun; use `AIGO_READINESS_WARN_ONLY=1` for a setup report |
| `test:readiness:jira` warns about unobserved statuses | Seed issues do not currently occupy every expected workflow state | Verify the workflow statuses in Jira project settings; ACLI cannot prove team-managed statuses that are not visible on issues |

---

## 18. Reference map

| Need | File |
| --- | --- |
| Modules (agents/actions/functions) | [`../manifest.yml`](../manifest.yml) |
| MVP runbook / release checklist | [`MVP_RUNBOOK.md`](MVP_RUNBOOK.md) |
| MVP readiness evidence | [`MVP_READINESS.md`](MVP_READINESS.md) |
| Portable instance provisioning | [`PORTABILITY.md`](PORTABILITY.md) |
| Agent behavior | [`../prompts/`](../prompts/) |
| Shared capabilities | [`../skills/README.md`](../skills/README.md) |
| Automation (docs) | [`../automation/jira-automation-rules.md`](../automation/jira-automation-rules.md) |
| Automation (importable JSON) | [`../automation/rules/`](../automation/rules/) |
| JQL | [`../automation/jql-filters.md`](../automation/jql-filters.md) |
| Safety/governance | [`../policies/`](../policies/) |
| Field-ID config | [`../src/config.ts`](../src/config.ts) |
| Project overview | [`../README.md`](../README.md) |
