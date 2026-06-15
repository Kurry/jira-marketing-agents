# Atlassian Product Adoption Spike (v2)

Date: 2026-06-15
Status: Proposal. T-NIH-05 decision memo, re-aligned to the native-first
direction. Does not supersede current specs until accepted by architect + safety
reviewer.
Supersedes: `specs/atlassian-product-adoption-spike.md`

This is a **bounded product-fit spike**, not an adoption mandate. The MVP stays
Jira + Forge/Rovo. Each additional Atlassian product is evaluated for the one
Growth Ops surface it could own and whether it removes a *specific* custom issue
type, field, dashboard, or script. No product enters the critical path until the
tenant has licensing, an admin owner, and a documented rollback. This closes
[nih-roadmap.md](nih-roadmap.md) task **T-NIH-05** and gates **T-NIH-11**.

Canonical entity definitions live in [issue-types.md](issue-types.md),
[custom-fields.md](custom-fields.md), and [workflows.md](workflows.md); this doc
references them and never restates counts. Native owners cited below come from
the Fit Matrix in [atlassian-native-tools.md](atlassian-native-tools.md) /
[_CONVENTIONS.md](_CONVENTIONS.md) §2.

## Scope of the spike

Evaluate five products against the surfaces they could own:

- **Jira Product Discovery (JPD)** — ideas, insights, prioritization, delivery
  links. Candidate owner for the discovery-vs-execution split in
  [issue-types.md](issue-types.md) (the JPD-owned types: AI Growth Request
  intake, Research Brief, Decision Memo, Positioning Update) and for the
  confidence/expected-lift/discovery scoring fields in
  [custom-fields.md](custom-fields.md).
- **JSM Assets** — employers, partners, segments, services, reusable launch
  objects. Candidate owner for the Segment/partner/service entities currently
  modeled as free-text or custom fields.
- **Confluence** — claims rules, SOPs, approved messaging, research synthesis,
  prompt source references (Knowledge & SOPs matrix row).
- **Atlassian Analytics / Data Lake** — weekly readouts, dashboard metrics,
  trend evidence, decision support (Readouts/dashboards matrix row).
- **Atlassian Goals / Projects** — outcome rollups and cross-work alignment
  (Outcome alignment matrix row).

Per T-NIH-05, the product-level subtasks **T-NIH-05A through T-NIH-05F** are
tracked in `specs/outcome-roadmap.md`; this memo is their decision record.

## Decision matrix

| Product | Recommendation | Growth Ops surface it could own | Sample mapping | Prerequisites | Custom code reduced | Migration cost | Blockers | Rollback / manual fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jira Product Discovery | **Defer** (evaluate first per discovery/execution split) | Ideas, insights, prioritization, delivery links | The JPD-owned discovery types in [issue-types.md](issue-types.md) become JPD ideas; insights capture source evidence; the discovery/confidence/expected-lift fields in [custom-fields.md](custom-fields.md) become JPD formula/rating fields, sorted in a JPD prioritization view. Delivery links connect an idea to its Jira execution type. | JPD licensed; product/discovery workspace approved; impact/effort/confidence field mapping; agent read path to JPD ideas. | The discovery-owned issue types and the prioritization/confidence/expected-lift fields, plus `backlog.prioritizeBacklog` ranking once JPD owns rank (T-NIH-12 JPD half). | Medium: migrate intake/readout/positioning tickets, retrain agents to read/link JPD ideas, point prioritization at JPD rank. | JPD not required for campaign execution; tenant availability unconfirmed. | Keep the Jira execution types and labels for discovery work; revert prioritization to `src/backlog.ts`. |
| JSM Assets | **Defer** until schema + owner exist | Employers, partners, segments, services, reusable launch objects | Employers, member cohorts, suppression lists, channels, partner services become object schemas referenced by an Assets-object custom field on Employer Launch / Campaign / Segmentation issues (see Segment/partner/service fields in [custom-fields.md](custom-fields.md)). | Assets licensed; object-schema owner; import/update model; access controls for sensitive objects; AQL lookup path for agents (read-only). | The repeated employer/segment/partner custom fields and fragile free-text values. | Medium/high: object-schema design, imports, permissions, agent lookup actions. | Assets licensing and schema governance unproven; sensitive-object access must be PHI-safe. | Keep the Jira custom fields, issue links, and instance-config values as the source. |
| Confluence | **Adopt opportunistically** as the non-critical knowledge owner when available | Claims rules, SOPs, approved messaging, research synthesis, prompt source references | Claims governance, the safe-mutation policy, approved positioning, and SOPs live in Confluence pages linked from Jira issues and cited by agent prompts (optionally as a Rovo knowledge source). | Confluence space; page ownership; clinical/compliance review workflow; link hygiene. | Duplicated policy text across prompts and docs; improves human-review traceability. | Low/medium: publish pages, update prompts to cite page links. | Must not let claims rules go stale; clinical/compliance review ownership required; **PHI must never be published**. | Keep the versioned repo policy files (`policies/`) and Jira comments as the source until pages are approved. |
| Atlassian Analytics / Data Lake | **Defer** until entitlement + metric model proven | Weekly readouts, dashboard metrics, trend evidence, decision support | Weekly Growth Readout pulls Jira activity, Automation audit results, and experiment/campaign metrics into a Data Lake–backed dashboard feeding the Decision Memo. | Analytics/Data Lake availability; data access; semantic model; metric definitions; dashboard owner. | Custom dashboard scripts (`src/dashboards.ts`) and ad-hoc readout comments. | Medium/high: data modeling, governance, dashboard buildout. | Tenant entitlement and source-data availability unproven. | Keep Jira filters, Jira dashboards, and the agent-generated Decision Memo issue (`src/readout.ts`). |
| Atlassian Goals / Projects | **Defer** until outcome taxonomy is explicit | Outcome rollups and cross-work alignment | Acquisition outcomes, employer-launch goals, conversion improvements, and experiment programs roll up from Jira work to Goals. | Goals enabled; leadership outcome taxonomy; owner model; Jira linkage conventions. | Custom rollup dashboards and status-summary scripts. | Medium: define the outcome hierarchy, update readout links. | Outcome taxonomy still forming; not needed for MVP workflow proof. | Keep Jira labels, issue links, dashboards, and Decision Memo summaries (Outcome alignment matrix row keeps Jira links/labels until Goals adopted). |

## Decisions

- **JPD** — defer; but JPD is the evaluated default owner for the discovery types
  and discovery/scoring fields in the canonical data model. Adopt only after
  licensing and the impact/effort/confidence mapping are confirmed; until then
  those types/fields fall back to Jira-Software per [issue-types.md](issue-types.md)
  (documented gap, not a default).
- **Assets** — defer until employer/segment/partner objects have a stable schema
  and an owner.
- **Confluence** — adopt opportunistically as the reviewed knowledge source; do
  **not** make it a blocking dependency for Forge/Rovo MVP install.
- **Analytics/Data Lake** — defer until tenant entitlement and the metric model
  are proven.
- **Goals/Projects** — defer until the leadership outcome hierarchy is explicit.

## Follow-up criteria (the gate for T-NIH-11 and the JPD half of T-NIH-12)

Adopt a product into the critical path **only when all** are true:

1. Tenant licensing and the admin path are confirmed.
2. A sample object/page/dashboard/goal exists and is linked from a Jira issue.
3. The migration removes a **specific** custom issue type, field, dashboard, or
   script (named, not "reduces clutter") rather than adding another system of
   record.
4. Agents have a **read-only** lookup path and cannot mutate sensitive product
   state without human approval (safety contract, [_CONVENTIONS.md](_CONVENTIONS.md) §5).
5. Rollback returns the workflow to Jira issue/field/dashboard surfaces without
   data loss.
6. **PHI never appears** in the adopted product's objects, pages, dashboards, or
   any agent output reading from it.

## Relationship to the task board

- This memo **closes T-NIH-05** (evidence: this file + `specs/outcome-roadmap.md`
  subtasks T-NIH-05A..F).
- It **gates T-NIH-11** (move Segment/partner/service fields to Assets and
  Confidence/Expected-Lift/discovery fields to JPD) — no field moves until the
  six criteria above pass for that product.
- It **gates the JPD half of T-NIH-12** (persist priority/area into JPD fields and
  sort there); the `@atlaskit/adf-utils` + JQL/native-duplicate-link half of
  T-NIH-12 has no product dependency and proceeds independently.

## Notes / merges / drops

- No content dropped from `specs/atlassian-product-adoption-spike.md`: all five
  product rows, decisions, and follow-up criteria are preserved.
- Added: explicit links from each product to the canonical entity it would own,
  the PHI guardrail (criterion 6), and the named gate relationships to T-NIH-11
  and T-NIH-12 so the spike feeds the sequenced [nih-roadmap.md](nih-roadmap.md)
  rather than standing alone.
