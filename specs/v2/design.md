# Design

Date: 2026-06-15
Status: **Proposal.** Describes the target post-refactor architecture aligned to
the NIH direction. Does not supersede the current design until the architect +
safety reviewer accept the `specs/v2/` set.
Supersedes: `specs/design.md`

## System Overview

AI Growth Ops is a Forge app that exposes Twin-specific Rovo agents inside Jira.
The target architecture is **native-first**: Atlassian products own every
platform concern named in the Fit Matrix; custom code is limited to Twin
policy, agent logic, safety rules, evidence generation, and documented platform
gaps. The Fit Matrix and the five NIH resolutions in
[atlassian-native-tools.md](atlassian-native-tools.md) are binding on this doc.

Canonical issue types, fields, and statuses are defined ONLY in
[`issue-types.md`](issue-types.md), [`custom-fields.md`](custom-fields.md), and
[`workflows.md`](workflows.md). This doc references them and never restates
counts.

## Request Flow

A Rovo agent or a native Jira Automation rule invokes an action; the action runs
a Forge function; the function calls a thin handler that reads Jira context via
documented APIs and delegates to a pure Twin-specific domain module.

```text
Jira/Rovo user OR native Jira Automation "Use Rovo agent" action
  -> rovo:agent in manifest.yml (prompt resource = Twin policy)
  -> action module
  -> short Forge function key
  -> index.ts (re-export shim)
  -> src/index.ts handler  (normalize payload, validate issueKey, delegate)
  -> src/jira.ts           (@forge/api requestJira, documented v3 incl. /search/jql)
  -> pure domain module    (Twin-specific logic; no Forge calls)
  -> structured JSON / ADF-ready analysis
  -> AI-labeled comment via src/comments.ts (ADF built with @atlaskit/adf-utils)
```

The single write surface remains `addAnalysisComment`. The webtrigger
(`src/webtrigger.ts`) is a **controlled operator fallback only** — it is never
the primary proof that native Automation invoked Rovo (NIH resolution 4). The
primary proof is Jira Automation audit-log evidence from the native "Use Rovo
agent" action.

## Two-Layer Architecture

The system is split into an Atlassian-native layer (owns platform concerns) and a
repo-owned layer (owns Twin-specific code). The boundary is the Fit Matrix.

### Atlassian-native layer (owns platform concerns)

| Concern | Native owner |
| --- | --- |
| App runtime, agents, actions, functions, workflow modules | Forge |
| Event/schedule orchestration, agent invocation | Jira Automation / Studio "Use Rovo agent" |
| Project/work item/field/filter/dashboard operations | ACLI (documented REST fallback) |
| Admin configuration at scale | Golden company-managed template project + documented Jira REST |
| Ideas, insights, prioritization, discovery fields | Jira Product Discovery |
| Employer/partner/segment/service entities | JSM Assets (if licensed) |
| Claims rules, SOPs, approved messaging, research | Confluence |
| Readouts/dashboards | Atlassian Analytics/Data Lake; Jira dashboards/filters otherwise |
| Outcome rollups | Atlassian Goals/Projects (links/labels until adopted) |
| ADF build/traversal, duplicate retrieval, prioritization | `@atlaskit/adf-utils`; JQL + native "Duplicate" link; JPD rank |

No parallel "configured Jira project" product is hand-built (NIH resolution 2):
the golden template is the source of truth; provisioning scripts are clone-diff
fallbacks.

### Repo-owned layer (custom — justified by the four allowed reasons)

- Twin prompts and policy files (claims-risk, experiment, safe-mutations).
- Pure TypeScript Twin-specific domain modules in `src/`.
- AI-labeled comment rendering (`src/comments.ts`).
- Safety tests and manifest contract tests.
- Instance config and a read-only evidence/audit harness.
- Small fallback scripts for documented platform gaps.

## Where Each `src/` Module Sits

Handlers and platform glue stay thin; Twin-specific domain logic stays custom;
generic platform logic is delegated to libraries/native surfaces (NIH
resolution 5).

| Module(s) | Role | Target placement |
| --- | --- | --- |
| `index.ts`, `src/index.ts` | Forge entrypoints / handlers: payload normalization, `issueKey` validation, delegation, the single comment mutation wrapper | **Keep — platform glue.** Thin; no domain logic. |
| `src/jira.ts` | `@forge/api requestJira` against documented v3 (incl. `/search/jql`); `getIssue`, `getIssueComments`, `searchIssues`, `addComment`, `mapIssueToContext` | **Keep — correct native binding** (explicitly not a finding). `IssueContext` is the Jira→domain contract. |
| `src/types.ts`, `src/config.ts` | Shared types (`IssueContext`, enums) and instance-specific field-ID config via env | **Keep — platform glue / instance binding.** |
| `src/comments.ts` | The only mutating action: AI-labeled ADF analysis comments | **Keep — safety/evidence**, but build ADF via `@atlaskit/adf-utils` (T-NIH-12). |
| `triage.ts`, `requirements.ts`, `experiments.ts`, `creativeClaims.ts`, `creativeGen.ts`, `employerLaunch.ts`, `funnel.ts`, `readout.ts`, `audience.ts`, `campaign.ts`, `landingPage.ts`, `referral.ts`, `activation.ts` | Twin-specific growth, claims, safety, experiment, audience, campaign logic | **Keep custom — Twin-specific policy/agent logic/safety.** Pure functions, no Forge calls. |
| `dashboards.ts` | Analytics dashboard spec | **Keep custom for the spec**, but readouts/dashboards data is owned by Atlassian Analytics/Data Lake or Jira dashboards. |
| `duplicates.ts` | Text-relevance duplicate detection | **Delegate (T-NIH-12):** retrieve candidates via JQL/Lucene; record confirmed dupes via the native "Duplicate" issue link. Keep only Twin-specific scoring if any. |
| `backlog.ts` | Sprint risk, epic breakdown, QA cases, `prioritizeBacklog` | **Split:** keep Twin-specific breakdown/QA logic; **delegate** prioritization to JPD fields/board rank. |
| `src/utils/adf.ts`, `src/utils/text.ts` | Hand-rolled ADF node schema, regex Markdown parser, ADF traversal | **Delegate (T-NIH-12):** replace with `@atlaskit/adf-utils` for build + traversal. Keep only Twin tokenization that no library owns. |
| `src/utils/scoring.ts`, `src/utils/risk.ts` | Priority/readiness scoring, risk classification | **Keep custom — Twin-specific policy/safety.** |
| `src/webtrigger.ts` | Operator fallback for agent invocation | **Keep as controlled fallback only** (NIH resolution 4); never primary native proof. |

## Where Each Script Category Sits

Every supported `scripts/*` entrypoint carries exactly one label — native
wrapper, documented API gap, or Twin-specific logic (T-NIH-07). Categories in the
target:

| Category | Files (current) | Target role |
| --- | --- | --- |
| **Provisioning** | `provision-jira.cjs`, `provision-instance.cjs`, `provision-all.cjs`, `provision-filters.cjs`, `provision-dashboards.cjs`, `provision-seeds.cjs`, `provision-automation.cjs`, `render-seed.cjs`, `render-automation-rules.cjs`, `instance-config.cjs`, `aigo-project-readiness.cjs` | **Native wrappers / clone-diff fallbacks.** Demoted under the golden template (T-NIH-09); wrap ACLI/REST/Automation import. Internal endpoints and keychain-blob auth removed (T-NIH-08); use `ATLASSIAN_TOKEN`. |
| **Infra reconciler** | `scripts/infra/{plan,apply,render-all,render-infra-tree,jira-backfill,cleanup-v1-evidence}.mjs`, `scripts/lib/{plan-jira,apply-jira,staging}.mjs` | **Reframed as a read-only audit harness** (NIH resolution 3). No per-resource converge engine before T-NIH-03/04; mutations route through ACLI / golden template / Forge. Defensible pieces: read-only diff + staging additive-only gate. |
| **Verify** | `scripts/verify/*` (`rovo-agents`, `automation-audit`, `jira-fields`, `jira-filters`, `jira-issue-types`, `jira-seeds`, `jira-workflow`, `forge-install`, `run-all`) | **Evidence harness.** `rovo-agents` reports "manifest/install check," not visibility; webtrigger vs native audit-log evidence in separate rows (T-NIH-01). `automation-audit` drops internal endpoints (T-NIH-08). |
| **Audit** | `scripts/audit/*` (`jira-snapshot`, `forge-snapshot`, `repo-snapshot`, `safety-snapshot`, `summarize`, `run-all`, `v1-attempt`) | **Read-only evidence/audit.** `jira-snapshot` drops internal endpoints (T-NIH-08). Deterministic, machine-readable output to `evidence/`. |
| **Docs/render + lib** | `scripts/docs/generate.mjs`, `scripts/lib/{forge,jira,evidence,runner,verify}.mjs`, `scripts/invoke/run-all.mjs` | **Generators / shared libs.** `generate.mjs` is the single source for any count surfaced in docs (T-NIH-14). `lib/forge.mjs` uses `--json`, not box-table parsing (T-NIH-13). |

## Manifest

`manifest.yml` is the source of truth for Rovo agents, actions, functions, and
scopes — see [`issue-types.md`](issue-types.md) and the requirements spec for the
canonical agent/action inventory (no counts restated here). Design constraints:

- Rovo agent names satisfy Forge length limits.
- Function module keys are unique across module types and ≤ 23 characters.
- Action inputs include descriptions.
- `addAnalysisComment` is standalone and not referenced directly by Rovo agents.
- The Forge Automation importer (`fn-import-automation`,
  `manage:jira-configuration`) is **removed** from the supported manifest
  (T-NIH-02).

Public Rovo action keys stay descriptive; Forge function keys are short internal
keys to satisfy Forge constraints.

## Jira Configuration

The default development project is `AI Growth Ops` (key `AIGO`). The current AIGO
project holds the canonical issue types, retyped seed issues, MVP custom fields,
status set, saved filters, dashboards, and imported Automation rules per
[`issue-types.md`](issue-types.md), [`custom-fields.md`](custom-fields.md), and
[`workflows.md`](workflows.md).

**Target scale path:** a golden company-managed template project carries the
intended issue types, screens, board, statuses, and workflow; ACLI clones
customer/project instances from it (NIH resolution 2, T-NIH-04, T-NIH-09).
Team-managed projects remain useful for smoke tests but may need manual
issue-type/board/status/Automation steps before readiness passes. AIGO is
currently team-managed and cannot be the clone source — a recorded blocker.

Discovery-style entities move native: segment/partner/service objects to **JSM
Assets**; confidence/expected-lift/discovery fields to **JPD** (T-NIH-11). Claims
rules, SOPs, and research synthesis move to **Confluence**.

## Instance Provisioning

`instances/aigo.example.json` defines the instance contract; scripts load it via
`AIGO_INSTANCE_CONFIG` with env overrides. Target flow:

```text
instance config
  -> render seed CSV for project key/label
  -> optionally deploy/install Forge to site
  -> clone Jira project from the golden template (preferred) OR create fresh
  -> import seed issues
  -> run smoke/readiness checks (read-only)
  -> native Jira Automation import + manual Rovo/Automation audit-log validation
```

Provisioning does not Terraform-manage every admin object; it wraps supported
ACLI/REST surfaces and documents UI/template-project gates. Auth is documented
`ATLASSIAN_TOKEN` env — no reverse-engineered keychain blob (T-NIH-08).

## Jira Automation

Automation bridges Jira events to Rovo runs natively. Rule shape:

- Trigger or schedule.
- Project/issue-type condition.
- Native "Use Rovo agent" action.
- Explicit Jira Automation action to add `{{agentResponse}}` as a comment.
- Optional Creative Claims route to Claims Review.

Automation may post configured comments and route risky Creative Requests to
Claims Review. It must not approve claims or launch work. Rules are imported
**disabled** and enabled only after a captured native audit-log run. Import uses
the native UI/export/import or a documented API; no internal endpoint is a
supported path (T-NIH-02, T-NIH-08).

## Data and Safety Model

Read by agents: Jira issue fields and comments visible to the app; JQL results
for similar issues and weekly readouts; seed content for smoke tests.

Written by the app: only AI-labeled Jira comments via `addAnalysisComment`.

Written by Jira Automation: AI-response comments configured by a human admin;
optional Claims Review routing for Creative Claims only.

Disallowed (safety contract, [`_CONVENTIONS.md`](_CONVENTIONS.md) §5 — never
weakened): claims approval, campaign sends, audience/suppression mutation,
experiment launch, production signup-flow changes, unallowlisted field writes.
**PHI must never appear in agent output, logs, or evidence.**

## Verification Design

Local: `npm run build`, `npm test`, `npm run test:integration`, `forge lint`.

Live: `forge install list`; `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`;
`npm run seed:render`; `npm run provision:instance -- --all --dry-run`; manual
Rovo UI visibility check; manual Rovo run on seeded issues; Jira Automation
audit-log validation after importing/rebuilding rules.

The `infra:plan/apply/verify` contract is **read-only audit** in the target, not
a converge engine (NIH resolution 3). Evidence is valid only if a repo script
produced it deterministically and it is machine-readable in `evidence/`.

Integration tests protect deployability: prompt resources exist; agent/action
references resolve; function references resolve; function keys satisfy Forge
constraints; action inputs include descriptions; only the comment mutation is
non-GET.

## Remaining Design Gaps Before MVP

1. Live Rovo "Use agent" steps need Rovo/AI activation for the org/site before
   rules are enabled and audit-log validated.
2. Live Rovo comments from Automation are pending the same plan blocker.
3. Field writes, transitions, subtask/linked-ticket creation remain deferred
   behind a future allowlisted write design.
4. Each new tenant/project needs an instance config plus a golden-template clone
   (preferred) or manual setup. AIGO is team-managed and cannot yet be the clone
   source (T-NIH-04 blocker).

## Post-MVP Design Options

- Custom-field read/write mapping behind an explicit allowlist.
- A dedicated transition action behind an admin allowlist.
- Prompt-quality evals for regression scoring.
- Dashboards/reporting on agent usage and decision outcomes (Atlassian Analytics
  where available).
- Staging→production promotion docs after the development flow is stable.
- Third-party Terraform providers only after validating they cover the exact
  Jira project/workflow/board/Automation/import/drift/destroy surfaces — never
  the Jira control-plane critical path (Fit Matrix).

## Merged / Dropped From The Source

- The legacy "Terraform is out of scope" section is folded into the Post-MVP
  options and the Fit-Matrix Terraform row; nothing dropped.
- The "Initial Outcome Architecture" three-layer model is preserved but
  re-expressed as the native vs repo-owned split; the third "portable
  provisioning layer" is re-aligned to clone-diff-under-golden-template.
- Specific issue-type/field/status/filter/dashboard counts are **removed** and
  replaced with references to the canonical data-model files (NIH resolution /
  T-NIH-14). No requirement is cut.
