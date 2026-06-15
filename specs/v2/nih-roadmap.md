# NIH Reduction Roadmap — Consolidated T-NIH Board

Date: 2026-06-15
Status: Proposal. Consolidates the original T-NIH-01..07 board and the
second-pass T-NIH-08..14 candidates into one sequenced, dependency-aware board.
Supersedes: the "NIH Reduction Task Board" + "New task-board candidates" sections
of `specs/atlassian-native-tools.md` and `specs/nih-review-2026-06-15.md`.

This is the single ordering authority for NIH-reduction work. The executable
task list in [tasks.md](tasks.md) references these IDs; the architecture rationale
lives in [atlassian-native-tools.md](atlassian-native-tools.md). Canonical entity
definitions live in [issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md),
and [workflows.md](workflows.md) — this board references them and never restates
counts.

**Before coding any Atlassian surface, load the matching skill and verify via
ctx7 — see [_CONVENTIONS.md](_CONVENTIONS.md) §7.** Each task's required skill(s)
and ctx7 topic are named in the "Required tooling per task" section below.

## Decision rule

Per [_CONVENTIONS.md](_CONVENTIONS.md) §1: use Atlassian-native capabilities
first; keep custom code only where it expresses Twin-specific policy, agent logic,
safety rules, evidence generation, or a documented platform gap. Every task below
names a native owner from the Fit Matrix and an evidence artifact.

## Status legend

- `[x]` Done and evidence linked.
- `[ ]` Remaining work.
- `[~]` Partially done; needs live Jira / Atlassian product validation.
- **GATE** = behavior-changing or policy-touching; requires lead-approved plan +
  safety-reviewer sign-off before implementation (see [_CONVENTIONS.md](_CONVENTIONS.md) §5).

## The board

| ID | Title | State | Native owner (Fit Matrix row) | Depends on | Gate |
| --- | --- | --- | --- | --- | --- |
| T-NIH-01 | Rovo visibility & evidence wording | `[x]` | Agent runtime / Agent event triggers | — | no |
| T-NIH-02 | Supported Automation import path cleanup | `[x]` | Automation import | — | GATE (manifest) |
| T-NIH-03 | ACLI capability inventory | `[x]` | Project/work item operations | — | no |
| T-NIH-04 | Golden template clone validation | `[ ]` | Jira admin configuration | T-NIH-03 | no |
| T-NIH-05 | Atlassian product adoption spike | `[x]` | JPD / Assets / Confluence / Analytics / Goals | — | no |
| T-NIH-07 | Custom script label inventory | `[x]` | (all — labels every script) | — | no |
| T-NIH-08 | Purge internal/private endpoints + keychain auth | `[ ]` | Automation import; Project/work item ops | — | GATE (scripts behavior) |
| T-NIH-09 | Golden template as source of truth; demote provisioners to clone-diff | `[ ]` | Jira admin configuration | T-NIH-04, T-NIH-03 | GATE (provisioning) |
| T-NIH-10 | Reframe `infra/` as read-only audit harness | `[ ]` | Jira admin configuration; Readouts/dashboards | T-NIH-03, T-NIH-04 | GATE (control-plane) |
| T-NIH-11 | Move Segment/partner/service fields to Assets; Confidence/Lift/discovery to JPD | `[ ]` | Employers/partners/segments/services; Ideas & product discovery | T-NIH-05 | GATE (data model) |
| T-NIH-12 | Adopt `@atlaskit/adf-utils`; JQL+native links for duplicates; JPD prioritization | `[ ]` | (libraries / native surfaces) | T-NIH-05 (for JPD half) | GATE (src behavior) |
| T-NIH-13 | Forge-CLI `--json` output; de-dup parser onto `scripts/lib/forge.mjs` | `[ ]` | Project/work item operations | — | no |
| T-NIH-14 | Reconcile issue-type/field/status counts via doc generator | `[ ]` | (canonical data model) | T-NIH-09 (only if model shifts) | no |

(`T-NIH-06` was never issued; the original board skipped from 05 to 07. The gap
is intentional — do not reuse the number.)

## Required tooling per task

Per [_CONVENTIONS.md](_CONVENTIONS.md) §7, no Atlassian surface is coded from
memory: load the named skill under `skills/` and confirm the specifics via ctx7
before writing code or evidence. A task that touches an Atlassian surface without
a skill + ctx7 reference is not ready to claim.

- **T-NIH-01** Rovo visibility & evidence wording — Tooling: `skills/forge-rovo-agents` + `skills/rovo-studio-agents` + ctx7 `Forge rovo:agent module` / `Use Rovo in an automation rule`.
- **T-NIH-02** Supported Automation import path cleanup — Tooling: `skills/rovo-studio-agents` + `skills/jira-automation-rovo-setup` + `skills/forge-platform` + ctx7 Jira Automation export/import; Forge manifest reference.
- **T-NIH-03** ACLI capability inventory — Tooling: `skills/jira-acli` + ctx7 `acli jira` command reference.
- **T-NIH-04** Golden template clone validation — Tooling: `skills/jira-cloud-rest` + `skills/jira-acli` + ctx7 Jira REST project/config; ACLI clone.
- **T-NIH-05** Atlassian product adoption spike — Tooling: `skills/jira-product-discovery` + `skills/jsm-assets` + `skills/confluence-cloud-rest` + `skills/atlassian-analytics-data-lake` + `skills/atlassian-goals-atlas` + ctx7 JPD / Assets+AQL / Confluence REST / Data Lake SQL / Atlassian Goals.
- **T-NIH-07** Custom script label inventory — Tooling: none (no Atlassian surface; labels repo scripts only).
- **T-NIH-08** Purge internal/private endpoints + native import + token auth — Tooling: `skills/rovo-studio-agents` + `skills/jira-automation-rovo-setup` + `skills/jira-cloud-rest` + `skills/jira-acli` + ctx7 Jira Automation export/import; Use Rovo in automation; `ATLASSIAN_TOKEN` auth.
- **T-NIH-09** Golden template as source of truth; demote provisioners to clone-diff — Tooling: `skills/jira-cloud-rest` + `skills/jira-acli` + ctx7 Jira REST project/config; ACLI clone.
- **T-NIH-10** Reframe `infra/` as read-only audit harness — Tooling: `skills/forge-platform` + `skills/jira-cloud-rest` + `skills/jira-acli` + ctx7 `forge … --json`; documented Jira REST GETs.
- **T-NIH-11** Move Segment/partner/service fields to Assets; Confidence/Lift/discovery to JPD — Tooling: `skills/jsm-assets` + `skills/jira-product-discovery` + ctx7 Assets schema/AQL; JPD fields.
- **T-NIH-12** Adopt `@atlaskit/adf-utils`; JQL+native links for duplicates; JPD prioritization — Tooling: `skills/forge-platform` + `skills/jira-cloud-rest` + `skills/jira-product-discovery` + ctx7 `@atlaskit/adf-utils`; JQL relevance + native "Duplicate" link; JPD prioritization.
- **T-NIH-13** Forge-CLI `--json` output; de-dup parser — Tooling: `skills/forge-platform` + ctx7 Forge CLI `--json` output.
- **T-NIH-14** Reconcile counts via doc generator — Tooling: none (no Atlassian surface; re-derives from the canonical data model).

## Five themes → task mapping

Per [_CONVENTIONS.md](_CONVENTIONS.md) §3, the ~70 second-pass findings collapse
to five themes. Each theme is closed by the tasks below.

1. **Internal/private endpoints + reverse-engineered keychain auth** →
   **T-NIH-08** (the purge), gated by **T-NIH-02** wording already shipped.
2. **Parallel "configured Jira project" product** → **T-NIH-04** (validate clone),
   **T-NIH-09** (make template the source), **T-NIH-11** (move entity/scoring
   fields native).
3. **`infra/` reconciler as Terraform-equivalent control plane** → **T-NIH-10**
   (reframe as read-only audit harness only).
4. **Custom inference presented as native proof** → **T-NIH-01** (shipped) +
   the separate-evidence-rows discipline carried in [tasks.md](tasks.md).
5. **Generic platform capabilities re-implemented in `src/`** → **T-NIH-12**
   (libraries + native surfaces). **T-NIH-13** removes the box-drawing-table
   parser. **T-NIH-14** removes hand-maintained count drift.

## Dependency graph & sequencing

The hard ordering constraints (these MUST hold):

```
T-NIH-03 (ACLI inventory) ──┐
                            ├─► T-NIH-04 (clone validation) ──► T-NIH-09 (template = source) ──► T-NIH-14*
T-NIH-03 ───────────────────┴─► T-NIH-10 (audit harness reframe)
                            └─► (no converge engine before 03 + 04)

T-NIH-08 (endpoint purge) ──► automation cleanup in T-NIH-09 / T-NIH-10
T-NIH-05 (product spike) ──► T-NIH-11 (Assets/JPD migration)
                          └─► T-NIH-12 (JPD-prioritization half only)
```

Key rules, stated explicitly:

- **No infra converge engine** (any per-resource apply that mutates Jira) is built
  before **T-NIH-03** (ACLI inventory) and **T-NIH-04** (golden-template clone)
  both complete. T-NIH-10 only reframes `infra/` as read-only until those land.
- **Internal-endpoint purge (T-NIH-08) precedes automation cleanup.** The
  automation-import / trigger-fix / audit work folded into T-NIH-09 and T-NIH-10
  must not re-introduce `gateway/api/automation/internal-api` or
  `rest/cb-automation`, so the purge has to be done (or in-flight with the native
  replacement proven) first.
- **T-NIH-04 precedes T-NIH-09.** You cannot declare the golden template the
  source of truth before a clone-diff has been validated against a disposable
  target. T-NIH-04 is currently blocked: the live AIGO project is
  team-managed/next-gen and cannot be the company-managed clone source (see
  [golden-template-validation.md](golden-template-validation.md)).
- **T-NIH-05 precedes T-NIH-11.** No Segment/partner/service field moves to Assets
  and no Confidence/Expected-Lift/discovery field moves to JPD until the product
  spike confirms licensing, admin path, and rollback for that product.
- **T-NIH-12 splits.** The `@atlaskit/adf-utils` adoption and JQL+native-link
  duplicate path have no product dependency and can proceed once approved; the
  "persist priority/area into JPD fields and sort there" half waits on T-NIH-05 /
  T-NIH-11.
- **T-NIH-14** only re-derives counts from the canonical data model
  ([issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md),
  [workflows.md](workflows.md)) via the doc generator. If T-NIH-09/T-NIH-11 change
  the model, T-NIH-14 runs after; otherwise it is independent.

## Recommended execution waves

1. **Wave 0 (unblocked, low-risk).** T-NIH-13 (Forge `--json`), and the
   non-JPD half of T-NIH-12 (adf-utils + JQL/native-link duplicates) once
   approved. T-NIH-14 if the data model is already stable.
2. **Wave 1 (foundational, gated).** T-NIH-08 endpoint/auth purge. In parallel,
   unblock T-NIH-04 by standing up a company-managed golden template project
   (the precondition that currently fails).
3. **Wave 2 (depends on Wave 1).** T-NIH-04 clone validation → then T-NIH-09
   (template as source, demote provisioners) and T-NIH-10 (audit-harness reframe).
4. **Wave 3 (product-gated).** T-NIH-11 (Assets/JPD migration) and the JPD half
   of T-NIH-12, only after T-NIH-05 follow-up criteria are met per
   [atlassian-product-adoption-spike.md](atlassian-product-adoption-spike.md).
5. **Wave 4 (cleanup).** T-NIH-14 final count reconciliation if the model moved.

## Evidence index

Each task closes only when its evidence is linked (per
[atlassian-native-tools.md](atlassian-native-tools.md) — never marked complete
from a planning doc alone).

| ID | Evidence artifact(s) |
| --- | --- |
| T-NIH-01 | `scripts/check-rovo-visibility.cjs`, `tests/check-rovo-visibility.test.ts`, `docs/MVP_RUNBOOK.md`, `evidence/rovo/visibility.md` |
| T-NIH-02 | `manifest.yml`, `src/index.ts`, `scripts/provision-automation.cjs`, `docs/INTEGRATION.md`, `tests/importAutomation.test.ts`, `tests/integration/manifest.integration.test.ts` |
| T-NIH-03 | `docs/PORTABILITY.md` |
| T-NIH-04 | `evidence/nih/golden-template-validation.json` (currently records the team-managed blocker) |
| T-NIH-05 | [atlassian-product-adoption-spike.md](atlassian-product-adoption-spike.md), `specs/outcome-roadmap.md` (T-NIH-05A..F) |
| T-NIH-07 | `docs/script-label-inventory.md`, `tests/script-label-inventory.test.ts` |
| T-NIH-08 | `scripts/provision-automation.cjs`, `scripts/fix-automation-triggers.cjs`, `scripts/verify/automation-audit.mjs`, `scripts/audit/jira-snapshot.mjs`, `scripts/provision-jira.cjs`, `scripts/lib/jira.mjs`; new `evidence/nih/endpoint-purge.json` |
| T-NIH-09 | `scripts/provision-instance.cjs`, `scripts/provision-jira.cjs`, `scripts/aigo-project-readiness.cjs`, `instances/*.json`; new `evidence/nih/template-source.json` |
| T-NIH-10 | `scripts/infra/plan.mjs`, `scripts/infra/apply.mjs`, `infra/**`; new `evidence/nih/audit-harness.json` |
| T-NIH-11 | `specs/custom-fields.md` (native-owner notes), `src/audience.ts`; new Assets/JPD mapping evidence |
| T-NIH-12 | `src/utils/adf.ts`, `src/utils/text.ts`, `src/duplicates.ts`, `src/backlog.ts`, plus new behavior tests |
| T-NIH-13 | `scripts/lib/forge.mjs`, `scripts/check-rovo-visibility.cjs`, `scripts/verify/forge-install.mjs` |
| T-NIH-14 | doc generator + `specs/v2/issue-types.md`/`custom-fields.md`/`workflows.md` regenerated tables |
