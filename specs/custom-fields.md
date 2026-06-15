# AIGO Custom Fields

Custom-field catalog for the AI Growth Ops control plane. Source: field list in
`specs/outcome-roadmap.md`. Issue-type ownership references
`specs/issue-types.md`.

> **Native owner (NIH note, T-NIH-03/04/05).** Custom fields are an Atlassian-
> native primitive. The intended owners for this catalog, per
> `specs/atlassian-native-tools.md`:
> - **Field creation/config:** a golden company-managed template project that
>   carries these fields, contexts, and options (matrix row "Jira admin
>   configuration"), cloned per site; ACLI `jira field` and documented Jira
>   REST `/rest/api/3/field` only fill template gaps. Field *IDs* stay
>   instance-specific and env-injected (`src/config.ts`), never hard-coded.
> - **Discovery/prioritization fields** (e.g. Targeting Confidence, Confidence,
>   Expected Lift, scoring inputs): evaluate Jira Product Discovery fields
>   (formula/rating/options) before adding bespoke selects — matrix row "Ideas
>   and product discovery", spike T-NIH-05.
> - **Reusable business entities** (Segment, Affected Segment, employer/partner
>   references): evaluate JSM Assets objects + an Assets object field before
>   modeling them as free-standing selects — matrix row "Employers, partners,
>   segments, services", spike T-NIH-05. A select list of segments is a parallel
>   product model of what an Assets schema would own.
> The classifier-output helpers (Workflow Area, Priority Score) are
> Twin-specific agent outputs and stay custom regardless.

**Instance-specific IDs.** Custom field IDs are per-Jira-instance and are never
hard-coded. They are injected at runtime via environment variables in
`src/config.ts` (`FIELD_IDS`). For the MVP, agent output is surfaced through
comments/labels rather than field writes; field writes, if ever enabled, are
gated per `policies/safe-mutations.md`.

Current live AIGO development site state:

- Six MVP fields exist: Segment (`customfield_10043`), Primary Metric
  (`customfield_10044`), Claims Risk (`customfield_10045`), Experiment ID
  (`customfield_10046`), Workflow Area (`customfield_10047`), and Priority
  Score (`customfield_10048`).
- The six matching Forge environment variables are set in `development`.
- Field options are configured for Segment, Primary Metric, Claims Risk, and
  Workflow Area.
- The remaining catalog fields below are target-state fields with no env var
  yet; creating/wiring them remains `jira-admin` / `forge-engineer` work and is
  plan-approval gated.

**Type legend:** text = single/multi-line text · number = numeric ·
date = date picker · select = single-select · multi-select = multi-select.

| # | Field | Type | Used by issue types | Env var (src/config.ts) |
|---|---|---|---|---|
| 1 | Target Population | text | AI Growth Request, Segmentation Request | — |
| 2 | Signal Sources | multi-select | Segmentation Request | — |
| 3 | Segment | select | Segmentation Request, Personalization Journey, Experiment, Campaign, Dashboard Request, Decision Memo, Positioning Update | `SEGMENT_FIELD_ID` (`segment`) |
| 4 | Suppression Rules | text | Segmentation Request, Campaign | — |
| 5 | Primary Metric | select | AI Growth Request, Experiment, Segmentation Request, Personalization Journey, Campaign, Dashboard Request, Decision Memo | `PRIMARY_METRIC_FIELD_ID` (`primaryMetric`) |
| 6 | Targeting Confidence | select | AI Growth Request, Segmentation Request | — |
| 7 | Journey Stage | select | Personalization Journey | — |
| 8 | Channels | multi-select | AI Growth Request, Creative Request, Experiment, Personalization Journey, Employer Launch, Campaign, Dashboard Request, Positioning Update | — |
| 9 | Behavior Trigger | text | Personalization Journey | — |
| 10 | Proof Point | text | Creative Request, Personalization Journey, Claims Review, Positioning Update | — |
| 11 | Claims Risk | select | Creative Request, Personalization Journey, Campaign, Claims Review, Positioning Update | `CLAIMS_RISK_FIELD_ID` (`claimsRisk`) |
| 12 | Creative Type | select | Creative Request | — |
| 13 | Hook Type | select | Creative Request | — |
| 14 | Variant ID | text | Creative Request, Experiment | — |
| 15 | Experiment ID | text | Experiment | `EXPERIMENT_ID_FIELD_ID` (`experimentId`) |
| 16 | Hypothesis | text | Experiment | — |
| 17 | Guardrail Metrics | multi-select | Experiment | — |
| 18 | Sample Feasibility | select | Experiment | — |
| 19 | Decision Date | date | Experiment, Decision Memo | — |
| 20 | Decision Needed | select | Employer Launch, Claims Review, Decision Memo | — |
| 21 | Confidence | select | AI Growth Request, Decision Memo | — |
| 22 | Research Source | select | Research Brief | — |
| 23 | Theme | text | Research Brief, Dashboard Request, Positioning Update | — |
| 24 | Frequency | number | Research Brief | — |
| 25 | Conversion Impact | select | Signup Funnel Issue, Research Brief | — |
| 26 | Recommended Test | text | Research Brief | — |
| 27 | Campaign Goal | text | Campaign | — |
| 28 | Launch Date | date | Employer Launch, Campaign | — |
| 29 | Assets Required | multi-select | Creative Request, Employer Launch | — |
| 30 | Readiness Score | number | Employer Launch | — |
| 31 | Blockers | text | AI Growth Request, Employer Launch, Bug | — |
| 32 | Funnel Step | select | Signup Funnel Issue, Bug | — |
| 33 | Affected Segment | select | Signup Funnel Issue, Research Brief | — |
| 34 | Drop-off Impact | select | Signup Funnel Issue | — |
| 35 | Evidence | text | Signup Funnel Issue, Research Brief, Claims Review, Decision Memo, Positioning Update, Bug | — |
| 36 | Expected Lift | select | Experiment, Signup Funnel Issue | — |
| 37 | QA Required | select | Creative Request, Employer Launch, Signup Funnel Issue, Bug | — |

## Notes on additional config-only fields

`src/config.ts` also wires two helper fields that are not in the outcome
field list but exist as classifier outputs:

- **Workflow Area** — `WORKFLOW_AREA_FIELD_ID` (`workflowArea`): the triage
  classifier's routing area (Targeting, Creative, Experiment, etc.; see
  `OWNER_GROUPS`).
- **Priority Score** — `PRIORITY_SCORE_FIELD_ID` (`priorityScore`): the numeric
  triage priority score.

These are advisory triage outputs rather than per-issue-type intake fields.

## Env-var coverage summary

Six fields are currently wired in `src/config.ts` `FIELD_IDS`:
`segment`, `primaryMetric`, `claimsRisk`, `experimentId`, plus the two
classifier helpers `workflowArea` and `priorityScore`. All other fields in the
catalog above are **target-state** and require a new env var + Jira custom-field
creation (plan-approval gated, owned by `forge-engineer` for `config.ts` and
`jira-admin` for the Jira field). Any field **write** path remains out of scope
until gated per `policies/safe-mutations.md`.
