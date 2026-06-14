# Jira Integration Guide

End-to-end instructions for deploying the AI Growth Ops Forge/Rovo app into a
Jira Cloud site and wiring it into a working ticketing system. Follow the
sections in order; each ends with a verification step.

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
 └─ Automation rules ───► "Use Rovo agent" ► {{agentResponse}} ► Add comment
```

- **Agents** are how humans (and Automation) talk to the app — in Rovo chat or
  via the *Use Rovo agent* Automation action.
- **Actions** are the callable tools each agent uses; they run **Forge
  functions** that call the Jira REST API as the app.
- **Automation** drives the agents on triggers/schedules and writes the result
  back as a comment (the only mutation).

Full module list: [`../manifest.yml`](../manifest.yml). Capability catalog:
[`../skills/README.md`](../skills/README.md).

---

## 1. Install tooling & dependencies

```bash
# In the repo root
npm install
npm install -g @forge/cli   # Forge CLI

# Verify the project is healthy before deploying
npm run build               # tsc --noEmit
npm test                    # vitest (should report all tests passing)
```

If `build` or `test` fails, stop and fix it first — the CI workflow
([`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)) enforces both.

**Verify:** `forge --version` prints a version; `npm test` is green.

---

## 2. Authenticate & register the Forge app

```bash
forge login           # use an Atlassian API token for your admin account
forge register        # creates a NEW app id and rewrites manifest.yml app.id
```

`manifest.yml` ships with a **placeholder** `app.id`
(`ari:cloud:ecosystem::app/00000000-…`). `forge register` replaces it with a
real id tied to your account. Commit the rewritten id only if your team wants a
shared app identity; otherwise each developer registers their own dev app.

**Verify:** `manifest.yml` `app.id` is now a real UUID.

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
forge deploy          # deploys to the default (development) environment
forge install         # installs onto your Jira site
#   ? Select product: Jira
#   ? Enter site URL:  your-site.atlassian.net
```

Environments: `forge deploy -e development|staging|production`. Promote with the
same command per environment. Re-run `forge deploy` after any code/manifest
change; `forge install --upgrade` if scopes changed.

**Verify:** `forge install --list` shows the app on your site.

---

## 5. Create the AIGO project

1. **Projects → Create project** → team-managed or company-managed (either
   works; company-managed gives shared workflows/fields).
2. Name it **AI Growth Ops**, key **`AIGO`** (the app defaults to this key — see
   `AIGO_PROJECT_KEY` in [`../src/config.ts`](../src/config.ts); override via env
   if you use a different key).

**Verify:** issues create as `AIGO-1`, `AIGO-2`, …

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

1. Open an `AIGO` issue → the **Rovo** chat panel (or the global Rovo chat).
2. Confirm the app's agents are listed, e.g. **AI Growth Triage Agent**,
   **AI Creative Claims Agent**, **AI Experiment Design Agent**, etc.
3. Try a conversation starter on a real issue: *"Triage this issue."*
   The agent calls `getIssueContext` → `classifyGrowthIssue` and returns the
   structured triage.

Agent ↔ action wiring lives in [`../manifest.yml`](../manifest.yml) under
`modules.rovo:agent[*].actions`. Prompts are in
[`../prompts/`](../prompts/).

**Verify:** at least one agent returns a structured response on a real issue.

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

## 13. Operating model & governance

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

## 14. Upgrades & CI

- Code/manifest change → `npm test` → `forge deploy` → (if scopes changed)
  `forge install --upgrade`.
- GitHub Actions ([`../.github/workflows/`](../.github/workflows/)) runs
  `build` + `test` on Node 20/22 for every push and PR, plus a non-blocking
  `forge lint`. Keep the PR green before deploying.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Agents don't appear in Rovo | App not installed, or Rovo not enabled on the site | `forge install --list`; confirm Rovo/Atlassian Intelligence subscription |
| Action returns `Jira API failed: 401/403` | Missing scope consent or wrong site | Re-`forge install`; ensure admin consented to all three scopes |
| `Jira API failed: 404` on `getIssueContext` | Bad issue key or app lacks project access | Confirm the key; ensure the app is installed where the project lives |
| No comment after a rule runs | Rule disabled, condition didn't match, or actor lacks comment permission | Check the rule **audit log**; verify the actor account can comment |
| Weekly readout empty | JQL matched nothing / wrong project key | Test the JQL in search; set `AIGO_PROJECT_KEY` if your key isn't `AIGO` |
| Imported rule errors on the Rovo action | Site uses a different internal action type | Import the rule, then re-select the agent in the builder (see rules README) |
| Triage misclassifies area | Sparse summary/description | Add detail; the classifier is most-matches-wins over the text/labels |
| Field write expected but didn't happen | By design — MVP writes comments only | Configure `FIELD_IDS` + allowlist (future work) if you need field writes |

---

## 16. Reference map

| Need | File |
| --- | --- |
| Modules (agents/actions/functions) | [`../manifest.yml`](../manifest.yml) |
| Agent behavior | [`../prompts/`](../prompts/) |
| Shared capabilities | [`../skills/README.md`](../skills/README.md) |
| Automation (docs) | [`../automation/jira-automation-rules.md`](../automation/jira-automation-rules.md) |
| Automation (importable JSON) | [`../automation/rules/`](../automation/rules/) |
| JQL | [`../automation/jql-filters.md`](../automation/jql-filters.md) |
| Safety/governance | [`../policies/`](../policies/) |
| Field-ID config | [`../src/config.ts`](../src/config.ts) |
| Project overview | [`../README.md`](../README.md) |
