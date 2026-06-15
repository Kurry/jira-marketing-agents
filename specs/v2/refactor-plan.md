# Refactor Plan — Code → Atlassian-Native Mapping (PROPOSAL)

Date: 2026-06-15
Status: **Proposal.** This is the bridge from the v2 specs to the actual
codebase refactor. **No code is changed by this document.** It records the
*intended* disposition of every current code area and the sequence in which the
gated tasks would land. Current `specs/`, `src/`, `manifest.yml`, and
`policies/` remain authoritative until the architect + safety reviewer accept
this set.
Supersedes: (new — has no v1 predecessor)

Reads: [_CONVENTIONS.md](_CONVENTIONS.md) (house style §6, decision rule §1, Fit
Matrix §2, five themes §3, safety §5), [nih-roadmap.md](nih-roadmap.md) (the
single ordering authority for T-NIH IDs and waves),
[atlassian-native-tools.md](atlassian-native-tools.md) (Native Tool Fit Matrix
and rationale). Canonical entity definitions are in
[issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md), and
[workflows.md](workflows.md) — this plan references them and never restates
counts.

## How to read this plan

Each row gives a current code area, its **v2 disposition**, the **native owner**
it delegates to (Fit Matrix row from [_CONVENTIONS.md](_CONVENTIONS.md) §2), the
**governing T-NIH task** from [nih-roadmap.md](nih-roadmap.md), a risk rating,
and whether the change is **GATE** (approval-gated and/or behavior-changing per
[_CONVENTIONS.md](_CONVENTIONS.md) §5).

Disposition vocabulary:

- **KEEP** — Twin-specific policy, agent logic, safety rules, evidence
  generation, or a documented platform gap. Allowed to stay custom per the
  decision rule.
- **DELEGATE** — a native owner (golden template / ACLI / JPD / Assets / native
  Automation import/export / `@atlaskit/adf-utils` / JQL + native issue links /
  Atlassian Analytics / Forge) should own this; custom code is demoted to a thin
  binding, a fallback, or removed.
- **RETIRE** — remove from all supported paths (the internal/private-endpoint
  and reverse-engineered-auth surfaces). May survive only as an explicitly
  experimental, non-default, blocker-tagged path.

Risk reflects blast radius if the change is done wrong: **High** = touches the
control plane, live Jira mutation, or safety surface; **Med** = behavior change
behind tests; **Low** = wording/wrapper/no behavior change.

---

## A. `scripts/*` — provisioning, infra, verify, audit, lib

### A.1 Provisioning orchestration (`scripts/provision-*.cjs`, `instance-config.cjs`, `render-*`)

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `provision-all.cjs`, `provision-instance.cjs` | DELEGATE → demote to clone-diff orchestration over a golden template; thin wrapper around ACLI + Forge CLI | Jira admin configuration (golden template); Project/work item ops (ACLI) | T-NIH-09 (after T-NIH-04) | High | GATE (provisioning) |
| `provision-jira.cjs` | DELEGATE → ACLI for project/field/filter/dashboard primitives; **RETIRE** the reverse-engineered macOS-keychain credential blob; thin documented Jira REST only for genuine ACLI gaps | Jira admin configuration; Project/work item ops | T-NIH-08 (auth purge), then T-NIH-09 | High | GATE (scripts behavior) |
| `provision-fields/options/statuses` paths inside `provision-jira.cjs` | DELEGATE → golden company-managed template is the source of truth for the canonical entities in [issue-types.md](issue-types.md) / [custom-fields.md](custom-fields.md) / [workflows.md](workflows.md); script becomes clone-diff fallback | Jira admin configuration | T-NIH-09 (depends T-NIH-04) | High | GATE (provisioning) |
| `provision-filters.cjs`, `provision-dashboards.cjs` | DELEGATE → ACLI `jira filter` / `jira dashboard` where supported; documented Jira REST as named fallback | Project/work item ops; Readouts/dashboards | T-NIH-03 (inventory), then T-NIH-09 | Med | GATE (provisioning) |
| `provision-seeds.cjs`, `render-seed.cjs` | KEEP (Twin seed templates + instance binding) — but seed *issues* clone from the golden template once it exists | Jira admin configuration (template) for the carrier; KEEP the Twin seed content | T-NIH-09 | Med | GATE (provisioning) |
| `provision-automation.cjs` | DELEGATE to native Jira Automation export/import; **RETIRE** the `gateway/api/automation/internal-api` fallback from the supported path (keep JSON validation + "import disabled" stop) | Automation import | T-NIH-08, then T-NIH-09 | High | GATE (scripts behavior) |
| `render-automation-rules.cjs` | KEEP (renders portable Twin Automation JSON from instance config; binds, does not replace, native import) | Automation import (rendering side) | T-NIH-07 (labeled) | Low | no |
| `instance-config.cjs` | KEEP (Twin-specific per-tenant config normalization + env propagation) | (instance binding) | T-NIH-07 (labeled) | Low | no |

### A.2 Infra reconciler (`scripts/infra/*`, `scripts/lib/{plan,apply}-jira.mjs`)

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `infra/plan.mjs` + `lib/plan-jira.mjs` (drift compute) | DELEGATE/REFRAME → keep ONLY the **read-only diff** as an audit harness over native output; drop the "Terraform-equivalent" framing | Jira admin configuration (read-only audit) | T-NIH-10 (after T-NIH-03 + T-NIH-04) | High | GATE (control-plane) |
| `infra/apply.mjs` + `lib/apply-jira.mjs` (converge engine) | RETIRE as a converge engine — **no per-resource Jira mutation engine is built before T-NIH-03 + T-NIH-04**; mutations route through ACLI / golden template / Forge | Jira admin configuration (golden template); Project/work item ops (ACLI) | T-NIH-10 (blocked on T-NIH-03/04) | High | GATE (control-plane) |
| `infra/jira-backfill.mjs` | DELEGATE → documented Jira REST read; retained only to backfill IDs into declarative YAML, not to mutate Jira | Project/work item ops | T-NIH-10 | Med | GATE (control-plane) |
| `infra/render-all.mjs`, `render-infra-tree.mjs`, `cleanup-v1-evidence.mjs` | KEEP (local render of declarative state + v1 evidence quarantine; no Jira mutation) | (evidence/render) | T-NIH-07 (labeled) | Low | no |
| `lib/staging.mjs` (additive-only staging gate) | KEEP — defensible custom safety gate; survives the reframe as the guard on any remaining write path | (staging safety policy) | T-NIH-10 | Low | no |

### A.3 Verify + audit harness (`scripts/verify/*`, `scripts/audit/*`, `scripts/invoke/*`, `scripts/lib/*`)

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `verify/jira-{fields,filters,issue-types,seeds,workflow}.mjs` | KEEP (read-only Twin readiness assertions against the canonical model); evidence-generation reason | Jira admin configuration (read-only verify) | T-NIH-07 (labeled) | Low | no |
| `verify/rovo-agents.mjs` | DELEGATE/REFRAME → emit "manifest/install check," NOT "guaranteed visible"; track webtrigger-fallback evidence separately from native Automation/Rovo audit-log proof | Agent runtime; Agent event triggers | T-NIH-01 (`[x]`); discipline carried in [tasks.md](tasks.md) | Low | no |
| `verify/automation-audit.mjs` | DELEGATE/RETIRE the internal path → consume native Jira Automation **audit-log** evidence only; **RETIRE** `rest/cb-automation`-style internal reads | Automation import (audit-log proof) | T-NIH-08 | Med | GATE (scripts behavior) |
| `verify/forge-install.mjs`, `lib/forge.mjs` | KEEP, but DELEGATE parsing → use Forge CLI `--json` instead of box-drawing-table parsing; de-dup the parser onto `lib/forge.mjs` | Project/work item ops (Forge CLI) | T-NIH-13 | Low | no |
| `audit/jira-snapshot.mjs` | DELEGATE/RETIRE → documented Jira REST read APIs only; **RETIRE** the internal `gateway/api/automation/internal-api` read | Jira admin configuration (read-only audit) | T-NIH-08 | Med | GATE (scripts behavior) |
| `audit/{forge,repo,safety,v1-attempt}-snapshot.mjs`, `audit/summarize.mjs`, `audit/run-all.mjs` | KEEP (Twin evidence capture/aggregation; no Jira mutation) | (evidence) | T-NIH-07 (labeled) | Low | no |
| `invoke/run-all.mjs`, `live-jira-smoke.sh` | KEEP (Twin agent-invocation smoke + live readiness via Forge CLI / supported REST actions) | Agent runtime | T-NIH-07 (labeled) | Low | no |
| `lib/jira.mjs` (Node CLI Jira client) | DELEGATE → documented Jira REST + `ATLASSIAN_TOKEN` env auth; **RETIRE** the reverse-engineered keychain-blob OAuth path | Project/work item ops; Jira admin configuration | T-NIH-08 | High | GATE (scripts behavior) |
| `lib/{apply-jira,evidence,runner,verify}.mjs` | KEEP (shared helpers; evidence schema, runner, verifier framework) — `apply-jira.mjs` only as a documented-REST gap helper | Project/work item ops (documented REST); (evidence/runner) | T-NIH-07 (labeled) | Low | no |
| `aigo-project-readiness.cjs` | DELEGATE the hard-coded field/status-ID-range scanning → clone-diff against the golden template; KEEP the Twin readiness contract | Jira admin configuration | T-NIH-09 (depends T-NIH-04) | Med | GATE (provisioning) |
| `fix-automation-triggers.cjs` | RETIRE from supported path (internal rule-edit brute force); survives only as experimental/blocker-tagged with a native manual alternative | Automation import | T-NIH-08 | Med | GATE (scripts behavior) |
| `check-rovo-visibility.cjs` | DELEGATE/REFRAME → "manifest/install check" wording (already shipped); KEEP as Twin evidence | Agent runtime | T-NIH-01 (`[x]`) | Low | no |
| `docs/generate.mjs`, `render-*` doc generators | KEEP, and DELEGATE count authorship → regenerate issue-type/field/status counts from the canonical data model, never by hand | (canonical data model) | T-NIH-14 | Low | no |

## B. `src/*` — domain modules, platform glue, utils

Per the second-pass review ([nih-review-2026-06-15.md](../nih-review-2026-06-15.md)
theme 5), the Twin-specific claims/safety/experiment/audience/campaign/employer
modules stay custom. The delegable seams are ADF build/traversal, duplicate
detection, and prioritization — all **behavior-changing** and therefore gated
behind tests + safety review.

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `triage.ts` | KEEP claims-risk routing + human-gate + Twin area taxonomy; DELEGATE one seam → persist `workflowArea` to a Jira/JPD select field so JQL/board own classification instead of re-scanning text | Project/work item ops; Ideas & product discovery (JPD) | T-NIH-12 (JPD half waits on T-NIH-05) | Med | GATE (src behavior) |
| `creativeClaims.ts`, `creativeGen.ts` | KEEP (claims-risk review/rewrite — never approves; core safety logic) | — (Twin safety) | — | Low | no |
| `experiments.ts`, `funnel.ts`, `activation.ts`, `referral.ts`, `campaign.ts`, `landingPage.ts` | KEEP (Twin growth/experiment/outreach logic; draft-only, no send/mutation) | — (Twin agent logic) | — | Low | no |
| `audience.ts` | KEEP (Twin targeting + privacy/suppression policy; never mutates a live audience). If employer/segment ever becomes data, the *entities* go to Assets — the proposal logic stays | Employers/partners/segments/services (entities only) | T-NIH-11 (entities, not logic) | Low | GATE (data model) for entities |
| `employerLaunch.ts`, `requirements.ts` | KEEP (Twin launch workback / requirements-gap logic) | — (Twin agent logic) | — | Low | no |
| `duplicates.ts` | DELEGATE → retrieve candidates via JQL `text ~` / `summary ~` (Lucene relevance); record confirmed dupes as native **"Duplicate" issue links**; KEEP only the Twin label/component weighting + human-review framing | JQL + native issue links | T-NIH-12 | Med | GATE (src behavior) |
| `backlog.ts` (`prioritizeBacklog`) | DELEGATE → persist priority/area to **JPD prioritization/rank fields** and sort there; KEEP sprint-risk/epic-breakdown/QA-case generation | Ideas & product discovery (JPD) | T-NIH-12 (JPD half waits on T-NIH-05) | Med | GATE (src behavior) |
| `dashboards.ts`, `readout.ts` | KEEP the Twin decision-memo/spec generation; DELEGATE the native-adjacent bucketing/rollups → Atlassian Analytics / Data Lake where available, Jira dashboards/filters otherwise | Readouts & dashboards | T-NIH-05 (Analytics fit), then follow-up | Low | GATE if it moves to Analytics |
| `utils/adf.ts` | DELEGATE → adopt `@atlaskit/adf-utils` builders (`doc`/`p`/`h`/`ul`/`li`) / a Markdown→ADF transformer; remove the hand-rolled regex Markdown parser that silently flattens bold/links/code/tables | `@atlaskit/adf-utils` | T-NIH-12 | Med | GATE (src behavior) |
| `utils/text.ts` (`extractPlainTextFromAdf`) | DELEGATE → `@atlaskit/adf-utils` `traverse` (full node schema: mention/table/inlineCard/media); KEEP `tokenize`/`normalizeText`/`jaccardSimilarity` as Twin helpers | `@atlaskit/adf-utils` | T-NIH-12 | Med | GATE (src behavior) |
| `utils/scoring.ts`, `utils/risk.ts` | KEEP (Twin priority/readiness scoring + risk classification; core agent logic) | — (Twin logic) | — | Low | no |
| `comments.ts` | KEEP — `addAnalysisComment` is the **only** mutating Forge action and the safety invariant; never widen without `policies/safe-mutations.md` | Agent runtime (Forge) | — | Low | GATE (any new write) |
| `jira.ts` | KEEP — correct `@forge/api requestJira` binding against documented v3 (incl. `/search/jql`); **not** a hand-rolled REST client. ADF detail moves with `utils/adf.ts` | Agent runtime (Forge); Project/work item ops (REST) | T-NIH-12 (ADF dep only) | Low | no |
| `webtrigger.ts` | KEEP as a controlled operator fallback — but it is **not** native proof. Native "Use Rovo agent" Automation audit-log is the primary evidence; webtrigger evidence stays in its own row | Agent event triggers (fallback) | T-NIH-01 (`[x]`) | Low | no |
| `config.ts`, `index.ts`, `types.ts` | KEEP (instance binding via env field IDs; thin handler normalization; shared types) | (instance binding / runtime) | — | Low | no |

## C. `infra/**` — declarative YAML tree + Terraform

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `infra/jira/{issue-types,fields,filters,dashboards,screens}.yaml`, `workflows/`, `seeds/` | DELEGATE → the golden company-managed template project becomes the source of truth for these entities (defined canonically in [issue-types.md](issue-types.md) / [custom-fields.md](custom-fields.md) / [workflows.md](workflows.md)); the YAML becomes a *read-only mirror* the audit harness diffs against, not a converge target | Jira admin configuration (golden template) | T-NIH-09 (after T-NIH-04) | High | GATE (provisioning + control-plane) |
| `infra/jira/automation/*.yaml` | DELEGATE → native Jira Automation export/import; YAML is the rendering input, import is native and **disabled-first** | Automation import | T-NIH-08, T-NIH-09 | Med | GATE (provisioning) |
| `infra/rovo/agents.yaml` | KEEP as a mirror of `manifest.yml` Rovo declarations; the manifest is authoritative (only `forge-engineer` edits it) | Agent runtime | T-NIH-14 (count reconcile) | Low | no |
| `infra/instances/staging.yaml` | KEEP (Twin instance binding; staging allowlist) | (instance binding) | — | Low | no |
| `infra/terraform/atlassian-operations/` | KEEP, scoped — official `atlassian/atlassian-operations` provider for **JSM/Compass Operations resources only**; never the Jira control-plane critical path | Terraform (Operations provider) | — | Low | GATE if scope widens |

## D. `automation/**` — rule JSON + filters + seed CSV

| Code area | Disposition | Native owner | T-NIH | Risk | Gate |
| --- | --- | --- | --- | --- | --- |
| `automation/rules/*.json` + `rules/rendered/*` | DELEGATE → import via native Jira Automation UI/export-import or documented API; imported **disabled**, enabled only after a captured native audit-log run; **RETIRE** any internal-API import path | Automation import | T-NIH-08, T-NIH-09 | Med | GATE (rule JSON; enabling a disabled rule) |
| `automation/jira-automation-rules.md`, `jql-filters.md` | KEEP (Twin SOP/JQL documentation) — could move to a Confluence knowledge source per T-NIH-05 fit | Knowledge & SOPs (Confluence) | T-NIH-05 (Confluence fit) | Low | no |
| `automation/seed/*.csv` + `seed/generated/*` | KEEP (Twin seed content) carried by golden-template clone once it exists | Jira admin configuration (template) | T-NIH-09 | Low | GATE (provisioning) |

## E. `manifest.yml`

KEEP — the Forge manifest is the authoritative Rovo agent / action / function /
prompt-resource declaration and the agent runtime owner. Only `forge-engineer`
edits it. Any module add/remove or scope change is GATE per
[_CONVENTIONS.md](_CONVENTIONS.md) §5 and the safety contract. This plan proposes
**no** manifest edits.

---

## Phased sequence (proposal)

Consistent with the dependency graph and waves in
[nih-roadmap.md](nih-roadmap.md). Hard ordering constraints are restated below;
the roadmap remains the single ordering authority.

### Phase 0 — Wave 0: unblocked, low-risk (no Jira mutation)
- **T-NIH-13** Forge CLI `--json` output; de-dup parser onto `lib/forge.mjs`
  (`verify/forge-install.mjs`, `check-rovo-visibility.cjs`).
- **T-NIH-12 (non-JPD half, once approved)** Adopt `@atlaskit/adf-utils` for ADF
  build + traversal (`utils/adf.ts`, `utils/text.ts`); delegate duplicate
  retrieval to JQL + native issue links (`duplicates.ts`). Behavior-changing →
  gated behind new behavior tests + safety review.
- **T-NIH-14** Re-derive counts from the canonical model via `docs/generate.mjs`
  if the data model is already stable.

### Phase 1 — Wave 1: remove internal endpoints early (foundational, gated)
- **T-NIH-08** Purge internal/private endpoints and reverse-engineered keychain
  auth from all supported paths: `provision-automation.cjs`,
  `fix-automation-triggers.cjs`, `verify/automation-audit.mjs`,
  `audit/jira-snapshot.mjs`, `provision-jira.cjs`, `lib/jira.mjs`. Replace with
  native Automation import/export + documented `ATLASSIAN_TOKEN` env auth. Any
  residue is experimental, non-default, blocker-tagged.
- **In parallel:** stand up a company-managed **golden template project** — the
  precondition that currently blocks T-NIH-04 (live AIGO is team-managed/next-gen
  per [golden-template-validation.md](golden-template-validation.md)).

### Phase 2 — inventory + template validation BEFORE any converge engine
- **T-NIH-03** ACLI capability inventory (`[x]` — `docs/PORTABILITY.md`).
- **T-NIH-04** Golden-template clone validation into a disposable target.
- **No per-resource Jira converge engine is built until T-NIH-03 + T-NIH-04 both
  complete.** Then:
  - **T-NIH-09** Make the golden template the source of truth; demote
    `provision-*`/`aigo-project-readiness.cjs` and `infra/jira/*.yaml` to
    clone-diff fallbacks.
  - **T-NIH-10** Reframe `infra/plan|apply` as a **read-only audit harness** over
    native output; route mutations through ACLI / golden template / Forge.
  - T-NIH-08 must be done (or its native replacement proven) before the
    automation cleanup folded into 09/10 — these must not re-introduce internal
    endpoints.

### Phase 3 — Wave 3: product-gated `src/` + data-model delegations
- **T-NIH-11** Move Segment/partner/service entities to **JSM Assets** and
  Confidence/Expected-Lift/discovery fields to **JPD** — only after **T-NIH-05**
  confirms licensing, admin path, and rollback (per
  [atlassian-product-adoption-spike.md](atlassian-product-adoption-spike.md)).
- **T-NIH-12 (JPD half)** Persist priority/area into JPD fields and sort there
  (`backlog.ts`, `triage.ts` workflow-area seam) — waits on T-NIH-05/T-NIH-11.

### Phase 4 — Wave 4: cleanup
- **T-NIH-14** Final count reconciliation via the doc generator if T-NIH-09 /
  T-NIH-11 moved the canonical model.

## Gate summary

The following are **GATE** (lead-approved plan + safety-reviewer sign-off before
implementation, per [_CONVENTIONS.md](_CONVENTIONS.md) §5):

- Any `manifest.yml` module/scope change (E).
- Any provisioning/control-plane mutation: T-NIH-08, T-NIH-09, T-NIH-10 (A.1,
  A.2, A.3 write paths, C).
- All behavior-changing `src/` delegations — ADF, duplicates, prioritization,
  workflow-area persistence: T-NIH-12 (B), each behind new behavior tests.
- Importing/enabling Automation rules: imported disabled, enabled only after a
  captured native audit-log run (D).
- Any change touching `policies/` or the safety contract.

The safety invariant is unchanged: `addAnalysisComment` (`src/comments.ts`) stays
the only mutating Forge action; no delegation in this plan widens it.
