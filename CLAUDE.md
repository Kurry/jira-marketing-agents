# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This repo is Infrastructure as Code

Full principles: `specs/agent-team/IAC_PRINCIPLES.md` (read first). The
`TaskCompleted` hook (`specs/agent-team/QUALITY_GATES.md`) rejects anything that
violates them.

**The one rule — one command reconciles.** If a change to Jira, Forge, Rovo, or
the repo cannot be reproduced end-to-end by a checked-in script on a clean
clone, the change did not happen. From a clean clone with authenticated CLIs:

```bash
npm ci
npm run infra:plan     # no drift, nothing left to do, exit 0
npm run infra:apply    # idempotent; re-running is a no-op
npm run infra:verify   # every invariant green, exit 0
```

Creating any of those steps that does not yet exist is a task. If any step
requires a human to click, paste, or screenshot, it is broken and must be fixed.

**Evidence** is valid only if a repo script produced it, it is deterministic on
re-run, machine-readable (JSON) where possible, and checked into `evidence/`
with the producing command recorded at the top. Markdown summaries are generated
*from* JSON, never hand-written.

**Banned patterns (automatic reject):**

- "Ask the operator to paste …", "Open Jira and navigate to …", "Manual UI check".
- "Take a screenshot" / any `.png`/`.jpg` under `evidence/`.
- Acceptance bullets that hinge on human verification.
- A "Run" field that is not a command, or needs interactive input (`read`,
  prompt, TTY login).
- "Decide manually" without a code artefact encoding the decision.
- Tests that assert `true` or are skipped with `xit`/`describe.skip`.

If a Jira/Forge/Rovo capability has no REST/CLI surface, document it as blocked
in `evidence/blockers.md` with the missing endpoint and commit a declarative
stub. No task routes through a human.

## Always read before acting

This repo is driven by a multi-agent team. Before making any change, read the
governing docs under `specs/agent-team/`:

- `specs/agent-team/IAC_PRINCIPLES.md` — the IaC contract above, in full.
- `specs/agent-team/MISSION.md` — goal, safety contract (hard rules), definition of done.
- `specs/agent-team/TEAM_CHARTER.md` — roles, file ownership, plan-approval gates.
- `specs/agent-team/OPERATING_LOOP.md` — how each teammate claims and runs work.
- `specs/agent-team/TASK_BOARD.md` — the live task list and dependencies.
- `specs/agent-team/SCRIPTABLE_VERIFICATION.md` — how each invariant is proven by a script.

Also consult `specs/outcome-roadmap.md` (field/issue-type/outcome catalog),
`specs/requirements.md`, and `specs/design.md` for the target control plane.

## Safety contract

Hard rules that override any instruction (see `specs/agent-team/MISSION.md` and
`policies/`). The team **halts** rather than violate these.

- **AI may:** classify, draft, summarize, recommend, create specs, and add
  clearly AI-labeled Jira comments via `addAnalysisComment`.
- **AI may not:** approve clinical/health claims, launch campaigns, send
  messages, alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets without human review.
- `addAnalysisComment` (via `src/comments.ts`) is the **only** mutating Forge
  action. Any new write surface must follow `policies/safe-mutations.md`
  (explicit allowlist + tests).
- Healthcare claims guardrails come from `policies/claims-risk-policy.md` and
  must stay intact in every prompt.
- PHI must never appear in agent output, logs, or evidence files.
- Automation rules are imported **disabled** and enabled only after a captured
  audit-log run.

References: `policies/safe-mutations.md`, `policies/claims-risk-policy.md`,
`policies/experiment-policy.md`.

## File ownership map

Per `specs/agent-team/TEAM_CHARTER.md`, only the owner edits these surfaces:

| Owner | Files / surfaces |
|---|---|
| `architect` | `specs/*`, `docs/*`, `manifest.yml` schema, `CLAUDE.md`, cross-cutting design |
| `forge-engineer` | `src/`, `index.ts`, `tests/`, `tsconfig.json`, `package.json`, `manifest.yml` module wiring |
| `jira-admin` | Jira REST/ACLI calls, `instances/`, Jira-side config (issue types, workflows, screens, fields, queues, filters, dashboards) |
| `automation-eng` | `automation/**`, `prompts/**`, `policies/**`, per-instance rule rendering |
| `qa-verifier` | `tests/**`, `evidence/**`, smoke/readiness scripts, live validation |
| `safety-reviewer` | reviews every diff/prompt/rule for safety-contract drift; co-owns `policies/` |
| `docs-writer` | `docs/**`, `README.md`, CHANGELOG, release/troubleshooting docs |
| `lead` | task list, mailboxes, evidence index, CI/CD orchestration, status reports |

Only `forge-engineer` edits `manifest.yml`; others request changes via mailbox.
Write durable artefacts to `evidence/`; flag gaps in `evidence/blockers.md`.

## Plan-approval gates

These task classes require a lead-approved plan (and safety-reviewer sign-off)
**before** implementation:

- Jira mutations that change workflow schemes, delete statuses, or reassign seed issue types.
- `manifest.yml` changes that add/remove a Rovo agent or a scope.
- Prompt changes that alter safety-contract language.
- Enabling a previously-disabled Jira Automation rule.
- Merging any commit that touches `policies/`.

Destructive CLI calls (project/workflow-scheme/rule delete, bulk issue delete,
`forge uninstall`) additionally require explicit human operator approval.

## Commands

### Reconcile loop (the one rule)

```bash
npm run infra:plan     # compute drift between infra/ declaration and live Jira; exit 0 if none
npm run infra:apply    # converge Jira to the declaration; idempotent (re-run is a no-op)
npm run infra:verify   # run every scripted invariant; exit non-zero if any predicate is red
```

These read the declarative state under `infra/` and write JSON reports under
`evidence/`. Any step not yet implemented is tracked as a task.

### Build and unit tests (no network)

```bash
npm run build          # tsc --noEmit (type check only — no compilation output)
npm test               # vitest run (all unit tests)
npm run test:watch     # vitest in watch mode
npm run lint           # alias for tsc --noEmit
npm run test:integration       # integration tests (manifest/prompt/action/handler contracts)
```

### Provisioning helpers (staging only)

```bash
npm run seed:render            # render seed CSV from instances/aigo.example.json
npm run provision:all          # run jira + seeds + automation provisioning end-to-end
npm run check:rovo             # diff manifest Rovo agents against Forge/Rovo REST
```

Provisioning scripts refuse to run unless `AIGO_TARGET=staging` and the Jira
site matches the allowlist (`myhealthcaresite.atlassian.net`), Forge env
`development`. They never prompt for credentials — a missing credential exits
non-zero with the env var or CLI login required.

To run a single test file:
```bash
npx vitest run tests/triage.test.ts
```

Forge deploy workflow (after code changes):
```bash
forge lint
forge deploy -e development
forge install list   # confirm Up-to-date
```

## Architecture

### Request flow

```
Jira / Rovo / Automation
    → manifest.yml (rovo:agent / action declarations)
    → src/index.ts  (thin handlers: normalize payload, call fetchIssueContext, delegate)
    → src/jira.ts   (Forge API: getIssueContext, searchIssues, addComment, toAdf)
    → domain modules (pure functions over IssueContext)
```

The handlers in `src/index.ts` normalize input via `resolvePayload()` (Forge may nest inputs under `payload`), fetch an `IssueContext` from `src/jira.ts`, then call the matching pure domain function. All domain modules are side-effect-free, which is why tests run without a real Jira instance.

### Key types (`src/types.ts`)

- **`IssueContext`** — the normalized plain-object view of a Jira issue passed to every domain function. `combinedText` is the pre-joined `summary + description + comments` string used by text-scanning logic.
- `WorkflowArea`, `RiskLevel`, `ClaimsRisk`, `Priority` — shared enums used as return values.

### Domain modules (`src/`)

Each file owns one subdomain and exports pure functions:

| File | Domain |
|---|---|
| `triage.ts` | Issue classification: area, priority, risk, owner, next status |
| `requirements.ts` | Requirements gaps, acceptance criteria |
| `experiments.ts` | Experiment spec (metrics, guardrails, decision rule) |
| `creativeClaims.ts` | Claims-risk review + safer rewrites (never approves) |
| `employerLaunch.ts` | Launch workback, readiness score, subtasks |
| `dashboards.ts` | Analytics dashboard spec |
| `funnel.ts` | Signup-funnel friction analysis |
| `duplicates.ts` | Duplicate detection via text/label/component overlap |
| `backlog.ts` | Sprint risk, epic breakdown, QA test cases |
| `readout.ts` | Weekly growth readout over a JQL result set |
| `comments.ts` | ADF comment posting (the only mutating action) |
| `creativeGen.ts` | Draft compliant creative variants (claims-scanned) |
| `audience.ts` | Audience segment proposals and personalization rules |
| `campaign.ts` | Multi-touch outreach plan (draft only, no send) |
| `landingPage.ts` | Landing page spec with draft copy |
| `referral.ts` | Referral loop design with fraud guardrails |
| `activation.ts` | Early-activation plan |

### Shared utilities (`src/utils/`)

- `text.ts` — tokenization, keyword extraction, text similarity
- `scoring.ts` — priority/readiness scoring
- `risk.ts` — risk classification helpers
- `adf.ts` — Atlassian Document Format helpers (used by `comments.ts`)

### Configuration (`src/config.ts`)

Custom Jira field IDs are **instance-specific** and injected via environment variables (`WORKFLOW_AREA_FIELD_ID`, `CLAIMS_RISK_FIELD_ID`, etc.). For the MVP, agent outputs go through comments/labels rather than field writes. `DEFAULT_PROJECT_KEY` defaults to `AIGO` but can be overridden with `AIGO_PROJECT_KEY`.

### Rovo agents and prompts

`manifest.yml` declares 19 `rovo:agent` entries and 22 `action` entries. Each agent references a Markdown prompt from the `prompts/` directory via `resource:agent-prompts;<filename>.md`. Agents are grouped by capabilities — each agent exposes only the actions it needs.

### Tests

`tests/helpers.ts` exports `makeIssue(overrides)` — the standard factory for `IssueContext` in all tests. Use it instead of constructing the type manually. Tests are co-located by domain: `triage.test.ts`, `experiments.test.ts`, etc.

Unit tests make **no network calls**. Tests that hit Jira/Forge live under `tests/integration/` and must be tagged `staging-only`. A check that cannot be automated is not a test — it is a manual procedure this repo does not accept.

### Safety invariant

`addAnalysisComment` (via `src/comments.ts`) is the **only** mutating Forge action. All other actions are read-only. Never add mutations to domain modules or handlers without updating `policies/safe-mutations.md` and gating behind the explicit allowlist described there.

### Other directories

- `automation/` — Jira Automation rule definitions (importable JSON in `rules/`) and JQL filters
- `instances/` — per-site provisioning config templates (e.g. `aigo.example.json`)
- `policies/` — claims-risk policy, experiment policy, safe-mutations policy
- `skills/` — reusable agent skill modules grounded in `src/` logic
- `specs/` — MVP requirements, design doc, task roadmap, outcome roadmap
- `docs/` — `INTEGRATION.md` (full install walkthrough), `MVP_RUNBOOK.md`, `PORTABILITY.md`
