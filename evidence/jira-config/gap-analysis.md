# AIGO Jira Configuration — Gap Analysis

**Date:** 2026-06-14  
**Author:** jira-admin  
**Task:** TASK 3 — Current state vs. target state comparison  
**Sources:** evidence/jira-config/current-state.md, specs/issue-types.md, specs/custom-fields.md, specs/workflows.md

---

## 1. Issue Types Gap

### Current (3 types — team-managed defaults)

| ID | Name | Action needed |
|---|---|---|
| 10001 | Workstream | REMOVE (not in target catalog; no seed issues use it as primary type) |
| 10002 | Task | KEEP as transitional fallback; all 15 seed issues are typed Task today |
| 10003 | Sub-task | REMOVE (not in target catalog) |

### Target (14 canonical types from specs/issue-types.md)

| # | Target Type | Status | Legacy alias / note |
|---|---|---|---|
| 1 | AI Growth Request | CREATE | Was "Growth Task" / "Automation Request" |
| 2 | Creative Request | CREATE | New type |
| 3 | Experiment | CREATE | New type |
| 4 | Segmentation Request | CREATE | New type |
| 5 | Personalization Journey | CREATE | New type |
| 6 | Employer Launch | CREATE | New type |
| 7 | Campaign | CREATE | New type |
| 8 | Dashboard Request | CREATE | New type |
| 9 | Signup Funnel Issue | CREATE | New type |
| 10 | Research Brief | CREATE | Was "Insight / Research Brief" |
| 11 | Claims Review | CREATE | New type |
| 12 | Decision Memo | CREATE | New type |
| 13 | Positioning Update | CREATE | New type |
| 14 | Bug / Tracking Issue | CREATE | Standard Jira-style type |

**Net:** 14 new issue types to CREATE. `Task` stays as a transitional type until
seed issues are re-typed. `Workstream` and `Sub-task` are removable once all
seeds are moved (requires plan-approval for any delete action).

---

## 2. Workflow Statuses Gap

### Current (3 statuses)

| Status | Category | Action |
|---|---|---|
| To Do | To Do | KEEP |
| In Progress | In Progress | KEEP |
| Done | Done | KEEP |

### Target — 9 statuses to ADD (from specs/workflows.md)

| # | Status to Add | Category | Currently Exists? |
|---|---|---|---|
| 1 | AI Triage | In Progress | NO |
| 2 | Needs Info | To Do | NO |
| 3 | Needs Human Review | In Progress | NO |
| 4 | Ready | To Do | NO |
| 5 | Blocked | In Progress | NO |
| 6 | Decision Needed | In Progress | NO |
| 7 | Claims Review | In Progress | NO |
| 8 | Experiment Running | In Progress | NO |
| 9 | Readout Needed | In Progress | NO |

**Net:** 9 statuses to CREATE. All 3 existing statuses are retained.

**Note:** Adding/modifying the workflow scheme on a team-managed project requires
plan-approval per TEAM_CHARTER.md. T-M2-05 is blocked on safety-reviewer
sign-off of specs/workflows.md first.

---

## 3. Custom Fields Gap

### Currently Existing (0 AIGO-specific fields)

The 7 existing custom fields are all Jira system/JWM defaults:
`Project, Rank, Start date, Category, Budget, Development, Team`.
None of the 37 AIGO target fields exist.

### Target Fields to Create (37 from specs/custom-fields.md + 2 classifier helpers)

Fields currently wired to env vars in `src/config.ts` (need to be created in
Jira and IDs provided to forge):

| # | Field | Type | Env var |
|---|---|---|---|
| 1 | Segment | select | SEGMENT_FIELD_ID |
| 2 | Primary Metric | select | PRIMARY_METRIC_FIELD_ID |
| 3 | Claims Risk | select | CLAIMS_RISK_FIELD_ID |
| 4 | Experiment ID | text | EXPERIMENT_ID_FIELD_ID |
| 5 | Workflow Area | text/select | WORKFLOW_AREA_FIELD_ID |
| 6 | Priority Score | number | PRIORITY_SCORE_FIELD_ID |

Fields in catalog but NO env var yet (target state, all need creation):

| # | Field | Type |
|---|---|---|
| 7 | Target Population | text |
| 8 | Signal Sources | multi-select |
| 9 | Suppression Rules | text |
| 10 | Targeting Confidence | select |
| 11 | Journey Stage | select |
| 12 | Channels | multi-select |
| 13 | Behavior Trigger | text |
| 14 | Proof Point | text |
| 15 | Creative Type | select |
| 16 | Hook Type | select |
| 17 | Variant ID | text |
| 18 | Hypothesis | text |
| 19 | Guardrail Metrics | multi-select |
| 20 | Sample Feasibility | select |
| 21 | Decision Date | date |
| 22 | Decision Needed | select |
| 23 | Confidence | select |
| 24 | Research Source | select |
| 25 | Theme | text |
| 26 | Frequency | number |
| 27 | Conversion Impact | select |
| 28 | Recommended Test | text |
| 29 | Campaign Goal | text |
| 30 | Launch Date | date |
| 31 | Assets Required | multi-select |
| 32 | Readiness Score | number |
| 33 | Blockers | text |
| 34 | Funnel Step | select |
| 35 | Affected Segment | select |
| 36 | Drop-off Impact | select |
| 37 | Evidence | text |
| 38 | Expected Lift | select |
| 39 | QA Required | select |

**Net:** 39 custom fields to CREATE (6 MVP-critical, wired to env vars; 33
target-state fields for full catalog coverage).

**MVP minimum:** The 6 fields wired to `src/config.ts` env vars must be created
first and their IDs injected via `forge variables set` before agent field-reading
(advisory reads only; writes are gated per policies/safe-mutations.md).

---

## 4. Seed Issue Re-typing Gap

After issue types are created, 15 seed issues need their type changed from
`Task` to the canonical AIGO type encoded in their summary prefix:

| Issue | Summary prefix | Target type |
|---|---|---|
| AIGO-1 | Growth Task | AI Growth Request |
| AIGO-2 | Experiment | Experiment |
| AIGO-3 | Creative Request | Creative Request |
| AIGO-4 | Employer Launch | Employer Launch |
| AIGO-5 | Dashboard Request | Dashboard Request |
| AIGO-6 | Signup Funnel Issue | Signup Funnel Issue |
| AIGO-7 | Bug / Tracking Issue | Bug / Tracking Issue |
| AIGO-8 | Segmentation Request | Segmentation Request |
| AIGO-9 | Automation Request | AI Growth Request |
| AIGO-10 | Growth Task | AI Growth Request |
| AIGO-11 | Growth Task | AI Growth Request |
| AIGO-12 | Growth Task | AI Growth Request |
| AIGO-13 | Claims Review | Claims Review |
| AIGO-14 | Decision Memo | Decision Memo |
| AIGO-15 | Growth Task | AI Growth Request |

**Note:** Re-typing issues via `acli jira workitem edit` is a mutation and
requires plan-approval before execution. Some target types (Personalization
Journey, Research Brief, Campaign, Positioning Update) have no current seed
issue — at least one new seed issue per type will need to be created post-config.

---

## 5. Priority Order

| Priority | Gap | Blocker | Plan file |
|---|---|---|---|
| P1 | Create 14 issue types | None (immediate) | plan-issue-types.md |
| P2 | Create 6 MVP custom fields | None (after P1 types exist) | plan-custom-fields.md |
| P3 | Add 9 workflow statuses | safety-reviewer sign-off on specs/workflows.md | plan-workflow.md (T-M2-05) |
| P4 | Re-type 15 seed issues | P1 types must exist | plan-seed-retype.md |
| P5 | Create remaining 33 custom fields | P2 done; `forge-engineer` adds env vars | plan-custom-fields-full.md |
