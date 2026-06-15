# NIH Second-Pass Review — Consolidated Findings

Date: 2026-06-15
Method: 10 parallel review agents (S1–S10), each scanning a disjoint repo scope
against `specs/atlassian-native-tools.md` (the decision rule, the 6 prior risk
findings, the Native Tool Fit Matrix, and tasks T-NIH-01..07). Goal: surface NIH
problems *beyond* the six already logged, and apply plan-sanctioned safe
reductions.

All reductions applied in this pass were **comment/label/wording only** — no
logic, signature, or behavior changes. Verified: `tsc --noEmit` exits 0; all 19
edited scripts pass `node --check`. Per-scope detail tables live in
`outputs/nih-review/s1..s10-*.md`.

## Headline result

~70 new findings across 10 scopes. They collapse into **five cross-cutting NIH
themes**, each with a strategic reduction that is larger than any single file
fix:

1. **Private/internal Atlassian endpoints are relied on in four places**, not
   just the one in prior finding #1. The same `gateway/api/automation/internal-api`
   / `rest/cb-automation` surface appears in `provision-automation.cjs` (prior),
   `fix-automation-triggers.cjs` (rule-edit brute force), `verify/automation-audit.mjs`,
   and `audit/jira-snapshot.mjs`. Plus ACLI's **undocumented macOS-keychain
   credential blob** is reverse-engineered (base64→gunzip→JSON) for OAuth tokens
   in `provision-jira.cjs` and `scripts/lib/jira.mjs`.
   → Reduction: route all of these to native Jira Automation import/export +
   documented `ATLASSIAN_TOKEN` env auth; mark every internal path experimental
   and non-default (done in comments this pass).

2. **A parallel "configured Jira project" product is being hand-built** from
   fields + issue types + filters + dashboards + statuses + readiness checks
   (S1, S2, S8). The custom field catalog (37 fields in `specs/custom-fields.md`,
   6 hard-coded in `aigo-project-readiness.cjs`) includes Segment-type fields
   that are really **JSM Assets** objects and Confidence/Expected-Lift fields
   that are really **JPD formula/rating** fields. Status discovery scans a
   hard-coded ID range 10000–10100 as a stand-in for a missing list endpoint.
   → Reduction: make a **golden company-managed template project** the source of
   truth (T-NIH-04); demote these scripts to clone-diff fallbacks; run the
   product-fit spike (T-NIH-05) to move discovery/segment fields native.

3. **The `infra/` reconciler is a Terraform-equivalent parallel control plane**
   (S2, S10). `scripts/infra/{plan,apply}.mjs` + the `infra:plan/apply/verify`
   contract + the `infra/**` YAML mirror re-implement what Forge CLI, ACLI,
   documented Jira REST, and golden-template cloning already own; `plan.ts` is
   even described as "Terraform-equivalent behaviour for Jira." Its only
   defensible custom pieces are the read-only diff and the staging additive-only
   safety gate.
   → Reduction: reframe the reconciler as a **read-only audit harness over native
   output**; route mutations through ACLI / golden template / Forge; run
   T-NIH-03 (ACLI inventory) and T-NIH-04 before building converge engines.

4. **Custom inference is presented as native proof** (S4, S5, S9). `verify/rovo-agents.mjs`
   probes one shared webtrigger and emits "19 Rovo agents declared; webtrigger
   reachable / pass:true"; STATUS.md marks VM-ROVO-CATALOG green on that;
   RELEASE_CHECKLIST accepted webtrigger evidence for a native Automation gate.
   There is no public Rovo listing API and no audit-log is consulted.
   → Reduction: keep webtrigger-fallback evidence and native Automation/Rovo
   audit-log proof in separate rows; reword "visibility" → "manifest/install
   check" (extends T-NIH-01). Docs reductions applied this pass.

5. **Generic platform capabilities are re-implemented in `src/`** where a
   library or native surface should own them (S6, S7). Hand-built ADF node schema
   + regex Markdown parser in `utils/adf.ts` (bold/links/code/tables flatten
   silently); hand-rolled ADF traversal in `utils/text.ts` drops mentions/tables
   from the text agents scan; `duplicates.ts` re-implements text relevance that
   JQL/Lucene + the native "Duplicate" link type own; `backlog.prioritizeBacklog`
   duplicates JPD prioritization/board rank. (Note: `src/jira.ts` correctly uses
   `@forge/api requestJira` against documented v3 incl. `/search/jql` — **not** a
   finding. The Twin-specific claims/safety/experiment/audience modules are
   correctly marked keep.)
   → Reduction: adopt `@atlaskit/adf-utils` for ADF build+traversal; delegate
   duplicate retrieval to JQL and record confirmed dupes as issue links; persist
   priority/area into JPD fields and sort there.

## Per-scope summary

| Scope | Agent | New findings (H/M/L) | Safe reductions applied |
| --- | --- | --- | --- |
| Provisioning orchestration | S1 | 3 / 3 / 3 | 5 classifying/experimental comments |
| Infra reconciler + `infra/**` | S2 | 3 / 4 / 2 | 12 T-NIH-07 headers + 1 experimental mark |
| Automation import + rules | S3 | 1 / 1 / 4 | 3 docs/label edits |
| Rovo visibility + webtrigger | S4 | 3 / 3 / 1 | 3 NIH/label comments |
| Verify + audit harness | S5 | 2 / 5 / 1 | experimental marks + T-NIH-07 labels (18 files) |
| `src/` domain logic | S6 | 0 / 2 / 4 | 15 classifying headers (6 delegate, 9 keep) |
| `src/` platform glue | S7 | 0 / 2 / 2 | 8 classifying headers |
| Jira config model | S8 | 1 / 4 / 3 | 5 script labels + 3 spec "Native owner" notes |
| Docs | S9 | 3 / 3 / 0 | 6 wording clarifications |
| Agent-team IaC specs | S10 | 6 / 5 / 3 | 15 "NIH note" callouts (9 files) |

## New task-board candidates (proposed; not auto-accepted)

- **T-NIH-08** Purge internal/private endpoints from all supported paths
  (automation import, trigger fix, automation-audit verify, jira-snapshot audit)
  and replace ACLI keychain-blob auth with documented `ATLASSIAN_TOKEN`.
- **T-NIH-09** Make a golden company-managed template project the source of truth
  for fields/issue-types/filters/dashboards/statuses; demote provisioning
  scripts to clone-diff fallbacks (depends on T-NIH-04).
- **T-NIH-10** Reframe `infra/` plan/apply as a read-only audit harness; do not
  build per-resource converge engines before T-NIH-03/04 complete.
- **T-NIH-11** Move Segment/partner/service fields to JSM Assets and
  Confidence/Expected-Lift/discovery fields to JPD (depends on T-NIH-05).
- **T-NIH-12** Adopt `@atlaskit/adf-utils` for ADF build + traversal; delegate
  duplicate detection to JQL + native issue links; persist priority/area to JPD
  fields. (Behavior change — needs tests + review.)
- **T-NIH-13** Replace Forge-CLI box-drawing-table parsing with `--json` output;
  de-duplicate the parser onto `scripts/lib/forge.mjs`.
- **T-NIH-14** Reconcile issue-type/field/status counts that disagree across
  MVP_READINESS (14/12/6), generated tables (13/3/8), and STATUS.md (18/8) via
  the doc generator, not by hand.

These are recommendations. Per the plan, none is marked complete from this
document alone — each needs its evidence linked, and the behavior-changing ones
(T-NIH-12) and any rule-JSON / manifest / policy changes remain approval-gated.
