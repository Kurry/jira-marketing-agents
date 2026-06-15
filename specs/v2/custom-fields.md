# AIGO Custom Fields (v2 — Canonical)

Date: 2026-06-15
Status: Proposal. Aligns the field model to the Atlassian-native / NIH-reduction direction; does not supersede current specs until accepted by architect + safety reviewer.
Supersedes: `specs/custom-fields.md`

Single source of truth for canonical field counts, names, and the native owner
of each field (per [`_CONVENTIONS.md`](_CONVENTIONS.md) §4). Issue-type
references point to [`issue-types.md`](issue-types.md); statuses to
[`workflows.md`](workflows.md). Other v2 docs must reference this file and must
not restate field counts or lists.

## Canonical count and drift reconciliation

**Canonical: 39 field entities, re-homed to three owners:**

- **6 → JSM Assets** (object attributes / Assets object fields)
- **6 → JPD** (formula / rating / option fields)
- **27 → Jira custom fields** (golden-template-owned; minimal, only where Assets
  and JPD do not apply)

Total preserved = **6 + 6 + 27 = 39.** Every field from `specs/custom-fields.md`
(37 numbered intake fields + 2 classifier helpers) is preserved — this is a
re-homing, not a deletion.

Drift reconciled (NIH theme #2, T-NIH-14):

| Source | Count claimed | Why it disagreed |
| --- | --- | --- |
| `specs/custom-fields.md` catalog | 37 + 2 helpers = 39 | The full intended catalog. **Adopted as the entity set.** |
| `docs/MVP_READINESS.md` | 12 | The near-term MVP subset, not the full model. |
| live AIGO site | 6 | What is physically wired today (`customfield_10043…10048`). |
| generated tables | 3 / 8 | Partial generator views of the wired subset. |

Resolution: the **catalog of 39** is the canonical entity set; 6 wired today and
12 in MVP scope are *implementation milestones*, not separate models. The
canonical number is stated **once, here.** Field **IDs** remain instance-specific
and env-injected (`src/config.ts`), never hard-coded.

## Owner A — JSM Assets (6) (matrix row "Employers, partners, segments, services")

Reusable business entities become Assets objects with an Assets object field on
the issue, rather than free-standing selects (a select list of segments is a
parallel product model of what an Assets schema owns). Spike T-NIH-05 / T-NIH-11.

| Field | Becomes (Assets) | Used by |
| --- | --- | --- |
| Segment | Object field → `Segment` object type | Segmentation Request, Personalization Journey, Experiment, Campaign, Dashboard Request, Decision Memo, Positioning Update |
| Affected Segment | Object field → `Segment` object (reference) | Signup Funnel Issue, Research Brief |
| Target Population | Object attribute on `Segment` (or `Population`) object | AI Growth Request, Segmentation Request |
| Signal Sources | Object attribute / referenced `Signal Source` objects | Segmentation Request |
| Suppression Rules | Object attribute on `Segment` / `Audience` object | Segmentation Request, Campaign |
| Channels | `Channel` object type, multi-reference | AI Growth Request, Creative Request, Experiment, Personalization Journey, Employer Launch, Campaign, Dashboard Request, Positioning Update |

If Assets is unlicensed in the tenant: fall back to minimal Jira selects
(documented gap, not default). Employer/Partner references for Employer Launch
also resolve to Assets objects (see [`issue-types.md`](issue-types.md) #6).

## Owner B — JPD (6) (matrix row "Ideas and product discovery")

Confidence / expected-lift / discovery-scoring fields become JPD field types
(formula, rating, options) on the corresponding JPD ideas. Spike T-NIH-05 /
T-NIH-11.

| Field | Becomes (JPD) | Used by |
| --- | --- | --- |
| Confidence | rating field | AI Growth Request, Decision Memo |
| Targeting Confidence | rating field | AI Growth Request, Segmentation Request |
| Expected Lift | rating / number field | Experiment, Signup Funnel Issue |
| Conversion Impact | rating field | Signup Funnel Issue, Research Brief |
| Drop-off Impact | rating field | Signup Funnel Issue |
| Frequency | number field (insight roll-up) | Research Brief |

Where JPD is unavailable: fall back to Jira selects/number fields (documented
gap, not default).

## Owner C — Jira custom fields (27) (golden-template-owned)

These stay as Jira custom fields because they are growth-execution attributes or
Twin-specific classifier outputs that Assets/JPD do not own. The **golden
company-managed template project** carries their contexts and options (matrix
row "Jira admin configuration"); ACLI `jira field` + documented Jira REST
`/rest/api/3/field` only fill template gaps. Field IDs stay env-injected.

| # | Field | Type | Used by issue types |
| --- | --- | --- | --- |
| 1 | Primary Metric | select | AI Growth Request, Experiment, Segmentation Request, Personalization Journey, Campaign, Dashboard Request, Decision Memo |
| 2 | Journey Stage | select | Personalization Journey |
| 3 | Behavior Trigger | text | Personalization Journey |
| 4 | Proof Point | text | Creative Request, Personalization Journey, Claims Review, Positioning Update |
| 5 | Claims Risk | select | Creative Request, Personalization Journey, Campaign, Claims Review, Positioning Update |
| 6 | Creative Type | select | Creative Request |
| 7 | Hook Type | select | Creative Request |
| 8 | Variant ID | text | Creative Request, Experiment |
| 9 | Experiment ID | text | Experiment |
| 10 | Hypothesis | text | Experiment |
| 11 | Guardrail Metrics | multi-select | Experiment |
| 12 | Sample Feasibility | select | Experiment |
| 13 | Decision Date | date | Experiment, Decision Memo |
| 14 | Decision Needed | select | Employer Launch, Claims Review, Decision Memo |
| 15 | Research Source | select | Research Brief |
| 16 | Theme | text | Research Brief, Dashboard Request, Positioning Update |
| 17 | Recommended Test | text | Research Brief |
| 18 | Campaign Goal | text | Campaign |
| 19 | Launch Date | date | Employer Launch, Campaign |
| 20 | Assets Required | multi-select | Creative Request, Employer Launch |
| 21 | Readiness Score | number | Employer Launch |
| 22 | Blockers | text | AI Growth Request, Employer Launch, Bug |
| 23 | Funnel Step | select | Signup Funnel Issue, Bug |
| 24 | Evidence | text | Signup Funnel Issue, Research Brief, Claims Review, Decision Memo, Positioning Update, Bug |
| 25 | QA Required | select | Creative Request, Employer Launch, Signup Funnel Issue, Bug |
| 26 | Workflow Area | select | classifier output (triage routing area) — Twin-specific, stays custom |
| 27 | Priority Score | number | classifier output (triage priority) — Twin-specific, stays custom |

**Classifier helpers (rows 26–27)** are Twin-specific agent outputs and stay
custom regardless of Assets/JPD adoption (matrix "Keep custom only for"). They
are advisory triage outputs, not per-issue-type intake fields.

## Live / MVP wiring status (implementation, not model)

Wired today on the AIGO development site (6): Segment (`customfield_10043`),
Primary Metric (`customfield_10044`), Claims Risk (`customfield_10045`),
Experiment ID (`customfield_10046`), Workflow Area (`customfield_10047`),
Priority Score (`customfield_10048`); matching Forge env vars set in
`development`. Under the v2 model, **Segment migrates to Assets** and the
Confidence-family fields migrate to JPD as those products are adopted; until
then they remain Jira selects as a documented fallback. All field **writes**
stay out of scope until gated per `policies/safe-mutations.md`.

## Notes / merges / moves

- **Moved to Assets (6):** Segment, Affected Segment, Target Population, Signal
  Sources, Suppression Rules, Channels — preserved as entities, new owner Assets.
- **Moved to JPD (6):** Confidence, Targeting Confidence, Expected Lift,
  Conversion Impact, Drop-off Impact, Frequency — preserved, new owner JPD.
- **No fields deleted.** 37 numbered + 2 helpers = 39; 12 (Channels was 1 of the
  37) move to Assets/JPD, 27 stay Jira-custom. (6+6 moved = 12; 39−12 = 27.)
- Affected Segment and Segment both resolve to the same Assets `Segment` object
  type via separate reference fields (kept distinct on the issue).
