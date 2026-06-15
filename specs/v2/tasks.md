# Refactor Task Plan (v2)

Date: 2026-06-15
Status: Proposal. The executable plan to move the codebase to the
Atlassian-native target architecture. Supersedes: `specs/tasks.md`.

This is a **re-alignment, not a scope cut**: every real task from `specs/tasks.md`
is preserved here, re-tagged with its Atlassian-native owner, the scripts/`src`
modules it touches, and acceptance. NIH-reduction work is sequenced in
[nih-roadmap.md](nih-roadmap.md); this file orders the *whole* refactor and points
into that board. Canonical entity counts/names live only in
[issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md), and
[workflows.md](workflows.md) — referenced here, never restated.

## Status key

- `[x]` Done / validated in this repo.
- `[ ]` Remaining work.
- `[~]` Partially done; needs live Jira or Atlassian product validation.
- **GATE** = behavior-changing or policy/manifest-touching; requires lead-approved
  plan + safety-reviewer sign-off before implementation
  ([_CONVENTIONS.md](_CONVENTIONS.md) §5). Destructive CLI calls additionally
  require human operator approval.

## How to read a task

Each task names: **Native owner** (Fit Matrix row), **Touches** (scripts/`src`
modules), and **Acceptance**. The decision rule ([_CONVENTIONS.md](_CONVENTIONS.md)
§1) governs every "keep custom" call.

---

## Phase A — Repo baseline (done; carry forward)

Native owner: Forge `rovo:agent`/`action`/`function` runtime.
Touches: `manifest.yml`, `index.ts`, `src/**`, `tests/**`, `tsconfig.json`.

- `[x]` Forge/Rovo-only repo scope (MCP/Cowork removed; app id registered; root
  `index.ts`; unique function keys; action input descriptions; stable Rovo action
  keys; dual-target tsconfig).
- `[x]` CI-safe contract tests for manifest/action/function; live Jira smoke
  script for install + seed verification; clean Forge/Rovo MVP baseline commit.

Acceptance: `npm run build`, `npm test`, `npm run test:integration`, `forge lint`
pass; the only Forge lint warning is the intentional standalone `addAnalysisComment`
action.

## Phase B — Live install & agent visibility (native validation)

Native owner: Forge install + Rovo (Agent runtime row). Per T-NIH-01, keep
"manifest/install check" and "Jira UI visibility" as **separate** evidence rows.
Touches: `scripts/check-rovo-visibility.cjs`, `docs/MVP_RUNBOOK.md`,
`evidence/rovo/visibility.md`.

- `[x]` Deploy to Forge `development`; install to `myhealthcaresite.atlassian.net`;
  `forge install list` shows Jira `Up-to-date`; `AIGO_REQUIRE_FORGE_INSTALL=1
  npm run test:smoke:jira`.
- `[ ]` Open Jira/Rovo and confirm the declared AI Growth Ops agents are visible;
  capture the exact navigation path. (UI/product-gated; not provable by repo
  script — keep visible in setup/readiness docs.)
- `[ ]` If agents do not appear, confirm Rovo enabled for site+user; reinstall with
  confirmed scopes.

Acceptance: a human can see the agents in Jira/Rovo; docs name agent visibility as
the primary install success criterion and never claim native Automation/Rovo proof
from webtrigger fallback evidence.

## Phase C — Jira project configuration → golden template path

This phase replaces "hand-build a configured Jira project" with the golden-template
source-of-truth direction. The canonical entity set is defined in
[issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md), and
[workflows.md](workflows.md).

Native owner: Golden company-managed template project + ACLI
`jira project/workitem/field/filter/dashboard` + documented Jira REST for gaps
(Jira admin configuration + Project/work item operations rows).
Touches: `scripts/provision-jira.cjs`, `scripts/provision-instance.cjs`,
`scripts/provision-seeds.cjs`, `scripts/render-seed.cjs`,
`scripts/aigo-project-readiness.cjs`, `instances/*.json`.

- `[x]` Confirm `AIGO` exists; import/verify the `aigo-seed` issues; add portable
  instance config + seed rendering for non-`AIGO` keys; add a repeatable
  provision/check entrypoint; add/verify the canonical issue types and MVP workflow
  status set; re-type seeds to canonical issue types; document live differences.
- `[~]` Transition supported seed issues to available statuses; wire workflow/status
  paths for Intake, Claims Review, Experiment, Employer Launch, Decision Needed,
  Launch Prep, Done (per [workflows.md](workflows.md)).
- `[x]` **T-NIH-03 ACLI capability inventory** (done in `docs/PORTABILITY.md`) is the
  precondition for any further portable provisioning — do not expand provisioning
  beyond current supported surfaces until it is referenced.
- `[ ]` **T-NIH-04 golden-template clone validation** — see
  [golden-template-validation.md](golden-template-validation.md). Currently blocked:
  AIGO is team-managed/next-gen and cannot be the company-managed clone source.
- `[ ]` **GATE — T-NIH-09**: once T-NIH-04 passes, make the golden template the
  source of truth and demote `provision-*` scripts to clone-diff fallbacks. Must
  not re-introduce private endpoints (see T-NIH-08).

Acceptance: the create dialog shows the canonical issue types; the workflow supports
statuses referenced by Automation; seeds cover one example per primary agent flow;
cloning a fresh site requires fewer custom REST mutations than fresh provisioning.

## Phase D — Internal-endpoint & auth purge (precedes automation cleanup)

Native owner: Native Jira Automation import/export + documented `ATLASSIAN_TOKEN`
env auth (Automation import row).
Touches: `scripts/provision-automation.cjs`, `scripts/fix-automation-triggers.cjs`,
`scripts/verify/automation-audit.mjs`, `scripts/audit/jira-snapshot.mjs`,
`scripts/provision-jira.cjs`, `scripts/lib/jira.mjs`.

- `[x]` **T-NIH-02**: retire the Forge importer; remove `fn-import-automation` and
  `manage:jira-configuration`; mark the internal import fallback experimental/
  non-default. **GATE (manifest).**
- `[ ]` **GATE — T-NIH-08**: purge `gateway/api/automation/internal-api` /
  `rest/cb-automation` from all four supported scripts; replace reverse-engineered
  ACLI macOS-keychain credential parsing with documented `ATLASSIAN_TOKEN` env auth
  in `provision-jira.cjs` and `scripts/lib/jira.mjs`. Any residual internal path is
  labeled experimental with a platform-blocker note + native manual alternative.

Acceptance: no supported path depends on private Atlassian endpoints or keychain
reverse-engineering; `tsc --noEmit` exits 0; affected scripts pass `node --check`;
`evidence/nih/endpoint-purge.json` records the before/after surface. This phase
must complete (or its native replacement be proven in-flight) before the automation
cleanup folded into Phases E and F.

## Phase E — `infra/` reconciler → read-only audit harness

Native owner: ACLI / golden template / Forge own mutations; `infra/` only diffs
(Jira admin configuration + Readouts/dashboards rows). Defensible custom pieces:
read-only diff and the staging additive-only safety gate.
Touches: `scripts/infra/plan.mjs`, `scripts/infra/apply.mjs`, `infra/**`.

- `[ ]` **GATE — T-NIH-10**: reframe `infra:plan/apply/verify` as a read-only audit
  harness over native output; route every mutation through ACLI / golden template /
  Forge. **No per-resource converge engine** is built before T-NIH-03 and T-NIH-04
  both complete. Remove "Terraform-equivalent behaviour for Jira" framing from
  `plan.ts`/docs.

Acceptance: `infra:plan` reports drift read-only and never mutates; `infra:apply`
either no-ops or delegates to a named native primitive; staging additive-only gate
preserved; `evidence/nih/audit-harness.json` records the harness scope.

## Phase F — Automation rules: import, validate, audit-log proof

Native owner: Native Jira Automation UI/export/import (Automation import row);
"Use Rovo agent" action (Agent event triggers row).
Touches: `automation/rules/*.json`, `scripts/render-automation-rules.cjs`,
`scripts/provision-automation.cjs`, `scripts/verify/automation-audit.mjs`.

- `[x]` Import/rebuild the MVP rules; per-instance placeholder replacement (project
  key/id, actor account id, agent keys) with fail-on-placeholder; Automation
  template contract tests (manifest agent references, AI-analysis comments,
  disabled-by-default, claims safety, no launch behavior).
- `[ ]` Enable one rule at a time; validate Intake Triage, Creative Claims (route to
  Claims Review as review only, **never approval**), Experiment Spec, Employer
  Launch, Weekly Readout; capture Jira Automation **audit-log** results per rule.
  (Rules imported disabled; enabled only after a captured native audit-log run.)

Acceptance: each rule runs without audit-log errors and posts the expected AI
analysis comment; webtrigger-fallback evidence and native Automation/Rovo audit-log
proof stay in separate evidence rows (T-NIH-01).

## Phase G — `src/` generic-capability delegation

Native owner: libraries + native surfaces (`@atlaskit/adf-utils`; JQL + native
"Duplicate" issue links; JPD prioritization/board rank). Twin-specific
claims/safety/experiment/audience/campaign logic **stays custom**.
Touches: `src/utils/adf.ts`, `src/utils/text.ts`, `src/duplicates.ts`,
`src/backlog.ts`, `scripts/lib/forge.mjs`, `scripts/check-rovo-visibility.cjs`,
`scripts/verify/forge-install.mjs`.

- `[ ]` **GATE — T-NIH-12** (behavior change; needs tests + review): adopt
  `@atlaskit/adf-utils` for ADF build+traversal (replaces hand-built node schema +
  regex Markdown parser in `utils/adf.ts` and hand-rolled traversal in `utils/text.ts`
  that drop mentions/tables); delegate duplicate retrieval to JQL and record
  confirmed dupes as native "Duplicate" issue links; persist priority/area into JPD
  fields and sort there (JPD half waits on T-NIH-05/T-NIH-11).
- `[ ]` **T-NIH-13**: replace Forge-CLI box-drawing-table parsing with `--json`
  output; de-duplicate the parser onto `scripts/lib/forge.mjs`.
- `[ ]` **T-NIH-14**: reconcile issue-type/field/status count drift by regenerating
  tables from the canonical data model via the doc generator, not by hand.

Acceptance: no silent ADF flattening (bold/links/code/tables/mentions preserved);
duplicate detection uses JQL + native links; counts derive from one source
([issue-types.md](issue-types.md)/[custom-fields.md](custom-fields.md)/[workflows.md](workflows.md));
all safety tests still pass.

## Phase H — Product adoption (gated, non-critical-path)

Native owner: JPD / JSM Assets / Confluence / Analytics-Data Lake / Goals (see
matrix). No product enters the critical path without licensing, admin path, and
rollback documented.
Touches: `specs/custom-fields.md`, `specs/issue-types.md`, `src/audience.ts`,
prompt/policy files.

- `[x]` **T-NIH-05 spike** — see [atlassian-product-adoption-spike.md](atlassian-product-adoption-spike.md);
  product subtasks T-NIH-05A..F in `specs/outcome-roadmap.md`.
- `[ ]` **GATE — T-NIH-11**: after T-NIH-05 follow-up criteria are met, move
  Segment/partner/service fields to **JSM Assets** and Confidence/Expected-Lift/
  discovery fields to **JPD** formula/rating fields. Rollback returns to Jira fields.
- `[ ]` Confluence: adopt opportunistically as the reviewed knowledge owner (claims
  rules, SOPs, approved messaging) without making it a blocking install dependency.

Acceptance: each adopted product has a sample object/page/dashboard/goal linked from
a Jira issue, removes a specific custom field/issue-type/dashboard/script, and gives
agents a read-only lookup path with no sensitive mutation absent human approval.

## Phase I — Documentation & MVP exit (carry forward)

Native owner: repo docs + Confluence (Knowledge & SOPs row).
Touches: `docs/INTEGRATION.md`, `docs/MVP_RUNBOOK.md`, `docs/PORTABILITY.md`,
`docs/script-label-inventory.md`, `README.md`.

- `[x]` Registered-app install docs; smoke docs requiring Forge install visibility;
  MVP runbook (deploy/install/seed/Rovo UI check/Automation validation/logs/
  rollback); release checklist; Rovo-UI-vs-Forge-install troubleshooting note;
  known-limitations section (no field writes, no autonomous transitions, no prompt
  evals, no production promotion); portability + golden-template cloning guidance.
- `[x]` **T-NIH-07** script-label inventory (`docs/script-label-inventory.md` +
  test): every supported `scripts/*` entrypoint labeled native wrapper /
  documented API gap / Twin-specific logic.
- `[x]` Run automated checks; review safety policies against live Automation behavior;
  final MVP readiness note with blockers/risks/decisions.
- `[ ]` Run the manual Rovo checks (Phase B) and Automation checks (Phase F) for exit.

Acceptance: a new engineer reproduces the MVP without guessing; docs separate
completed repo work from remaining Jira/Atlassian product setup; no critical blocker
remains for the development-site MVP.

---

## Outcome workstreams (1–10)

These carry forward from `specs/tasks.md` unchanged in scope; native owners and the
canonical data model apply. They proceed in parallel with the phases above. Behavior
that mutates Jira fields/transitions or product audiences stays **GATE**ed and
draft/comment-only for MVP.

- **O1 Intake & Triage** — `[x]` triage/requirements/acceptance/duplicate agents,
  comment-only output, canonical intake types/statuses. `[~]` manual seed runs +
  Intake Triage Automation audit-log. `src/triage.ts`, `requirements.ts`,
  `duplicates.ts` (duplicates → T-NIH-12 JQL/native-link delegation).
- **O2 Segmentation & Targeting** — `[x]` Audience Builder read-style action,
  `mutatesProductionAudience:false`. `[ ]` dedicated segmentation/targeting agents
  or documented compatibility mapping; expanded readiness; tests (unknown signals,
  missing sources, consent/suppression, clinical-targeting language, no invented
  reach); manual run. `src/audience.ts`. Segment fields → Assets (T-NIH-11).
- **O3 Personalization Journey** — `[~]` partial journey logic + draft issue
  type/fields. `[ ]` full journey module/spec; journey/personalization/claims-prep
  agents or mappings; tests (missing variables, consent/frequency caps, no PHI,
  claims-safe copy, tracking, fallback, not-ready); Automation decision.
  `src/audience.ts` (or new journey module). See [issue-types.md](issue-types.md).
- **O4 Creative Production** — `[x]` creative-gen + claims-review agents, draft-only,
  no send/approve. `[ ]` coded Variant IDs + Hook Type tags; factory/claims-prep/
  variant-id agents or mappings; tighten Creative Claims routing (Risky/Prohibited/
  Requires-Human-Review → Claims Review, **no approval**); winning-creative→SOP only
  (test); manual validation. `src/creativeGen.ts`, `creativeClaims.ts`.
- **O5 Experimentation** — `[x]` Experiment Design + backlog behavior. `[ ]` tighten
  readiness gate; evidence-based readout (Scale/Kill/Iterate/Extend/Needs-Review
  only with data); readout/backlog-prioritization agents or mappings; Forge workflow
  validator requiring measurement/guardrails/tracking/decision-rule before launch;
  tests (inconclusive, guardrail failure, missing data, no invented significance);
  manual validation. `src/experiments.ts`, `backlog.ts` (prioritization → JPD,
  T-NIH-12). **GATE** for the workflow validator (manifest).
- **O6 Research & Objection Mining** — `[~]` triage recognizes research; readouts
  summarize. `[ ]` Research Brief type/fields/seeds; `src/objections.ts` (theme
  clustering, frequency, segment/employer/funnel mapping, de-identified quotes,
  conversion impact, recommended tests, claims-risk routing); objection-mining/
  competitor/messaging agents; JQL or key-list multi-issue input; tests (clustering,
  evidence quotes, PHI redaction, competitor hypotheses, claims routing, follow-up
  tickets); extend weekly readout with top objection themes.
- **O7 Campaign & Employer Launch** — `[x]` Employer Launch + Campaign agents,
  readiness scoring/blockers/phases/QA, draft-only campaign plan, disabled Employer
  Launch Automation, launch-readiness agent. `[~]` Campaign issue type/fields;
  manual Employer Launch validation. `[ ]` manual Campaign Planner validation;
  optional post-MVP readiness/subtask writeback behind explicit allowlist (**GATE**).
  `src/employerLaunch.ts`, `campaign.ts`.
- **O8 Conversion Optimization** — `[x]` Funnel Friction agent, step detection,
  evidence extraction, impact/QA, Signup Funnel dashboard category. `[ ]` product-
  ticket/regression-check agents or mappings; analytics/session-replay source or
  required linked-evidence fields before impact sizing; acceptance coverage for
  high-priority funnel issues. `[~]` manual validation. `src/funnel.ts`.
- **O9 Analytics & Decision Support** — `[x]` Weekly Readout agent, weekly buckets,
  disabled scheduled Readout Automation → Decision Memo, dashboard spec, anomaly/
  decision agents or mappings. `[~]` manual Readout validation + enable Automation
  with audit-log. `[ ]` evidence-aware decision support via custom fields / linked
  analytics (not only status/type/label); dashboard URL linking + notification path.
  `src/readout.ts`, `dashboards.ts`. Analytics/Data Lake → T-NIH-05 (deferred).
- **O10 Positioning & Messaging** — `[~]` partial coverage across creative/campaign/
  landing/audience/claims; draft Positioning Update type. `[ ]` `src/positioning.ts`
  (AI capability, member/employer value props, proof requirements, differentiators,
  objection matrix, channel examples, CTAs, claims risk, missing-evidence warnings);
  positioning agent wired to claims-prep + creative-gen; reusable knowledge assets
  (`twin-context`, `twin-claims-rules`, `twin-segments`, `twin-experiments`,
  `employer-launch`, `growth-readout`); tests (no invented outcomes/proof, all copy
  claims-scanned, missing proof flagged, varies by segment/channel); document
  approved-positioning→creative/campaign flow without bypassing human approval.

## Cross-cutting platform tasks

- `[x]` Per-instance Automation rule rendering + contract tests (Phase F).
- `[~]` Extend readiness checks for transition paths, required fields, screens, seed
  coverage, Rovo UI visibility, and Automation audit logs (`scripts/aigo-project-readiness.cjs`,
  `scripts/verify/*`).
- `[ ]` Gating order: T-NIH-03 before expanding portable provisioning; T-NIH-04
  before declaring template the source; T-NIH-05 before replacing Jira surfaces with
  JPD/Assets/Confluence/Analytics/Goals; T-NIH-07 before promoting any custom script
  into the long-term supported path. (All tracked in [nih-roadmap.md](nih-roadmap.md).)

## Post-MVP backlog (deferred, mostly GATE)

- `[ ]` Custom-field read mappings for optional workflow metadata.
- `[ ]` **GATE** Field-write action behind explicit allowlist + tests.
- `[ ]` **GATE** Issue-transition action behind explicit allowlist + tests.
- `[ ]` Prompt-quality evals for key agent outputs.
- `[ ]` Production/staging promotion guidance.
- `[ ]` Usage/decision metrics and dashboards.
- `[ ]` Slack or other notification paths through Jira Automation.

Note on Terraform: out of scope for the MVP/NIH completion path. The official
`atlassian/atlassian-operations` provider is allowed only for JSM/Compass Operations
resources, never the Jira control-plane critical path (matrix Terraform row); the
third-party provider shortlist is archived background only.
