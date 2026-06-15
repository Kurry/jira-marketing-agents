# AIGO Project — Current State Discovery

**Date:** 2026-06-14  
**Author:** jira-admin  
**Task:** TASK 2 — Enumerate current AIGO project state  
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## 1. Project Identity

| Field | Value |
|---|---|
| Project key | AIGO |
| Project name | AI Growth Ops |
| Project ID | 10000 |
| Project type | business (team-managed, `simplified: true`, `style: next-gen`) |
| UUID | 0341679d-bd1f-4eab-9fc1-4af2a7b2cab7 |
| Lead | Kurry Tran (557058:297f331c-0582-4201-8db9-72c7ec72bf14) |

---

## 2. Current Issue Types

Source: `GET /rest/api/3/project/AIGO/statuses` and `acli jira project view --key AIGO --json`.

| ID | Name | Hierarchy Level | Subtask | Description |
|---|---|---|---|---|
| 10001 | Workstream | 1 | No | "Workstreams track a set of related work and activities that work towards a larger deliverable." |
| 10002 | Task | 0 | No | "A small, distinct piece of work." |
| 10003 | Sub-task | -1 | Yes | "A small piece of work that's part of a larger task." |

**Total: 3 issue types (team-managed defaults only)**

---

## 3. Current Workflow Statuses

Source: `GET /rest/api/3/project/AIGO/statuses` (HTTP 200).  
All three issue types share the same three statuses:

| Status ID | Name | Category |
|---|---|---|
| 10000 | To Do | To Do |
| 10001 | In Progress | In Progress |
| 10002 | Done | Done |

**Total: 3 statuses — only the team-managed defaults**

Confirmed via `acli jira workitem transition` that "AI Triage" (and other MVP
statuses) produce "No allowed transitions found", i.e., they do not exist in
the current workflow.

---

## 4. Seeded Issues

Source: `acli jira workitem search --jql "project = AIGO AND labels = aigo-seed" --csv --limit 20`

| Key | Type | Status | Summary |
|---|---|---|---|
| AIGO-1 | Task | To Do | [Growth Task] Q3 employer acquisition push |
| AIGO-2 | Task | To Do | [Experiment] Email subject line test to lift signup conversion rate |
| AIGO-3 | Task | To Do | [Creative Request] Email and SMS creative: guaranteed diabetes reversal |
| AIGO-4 | Task | In Progress | [Employer Launch] Employer launch for Acme Corp on June 20 |
| AIGO-5 | Task | To Do | [Dashboard Request] Channel performance dashboard for CAC and signups |
| AIGO-6 | Task | To Do | [Signup Funnel Issue] Signup page broken on mobile Safari |
| AIGO-7 | Task | To Do | [Bug / Tracking Issue] Signup page broken on mobile Safari for new users |
| AIGO-8 | Task | To Do | [Segmentation Request] Target lapsed eligible employer members |
| AIGO-9 | Task | To Do | [Automation Request] Re-engagement campaign to drive signup conversion |
| AIGO-10 | Task | To Do | [Growth Task] Co-branded eligibility landing page for employer members |
| AIGO-11 | Task | To Do | [Growth Task] Add post-activation member referral program |
| AIGO-12 | Task | To Do | [Growth Task] Improve early activation after registration |
| AIGO-13 | Task | To Do | [Claims Review] Claims review for SMS copy waiting on compliance |
| AIGO-14 | Task | To Do | [Decision Memo] Q3 budget decision for paid social test |
| AIGO-15 | Task | Done | [Growth Task] Shipped new employer landing page |

**Total: 15 seed issues with label `aigo-seed` — matches `minSeedCount: 15` in instance config.**

All issues are type `Task` (the team-managed default). Intended AIGO types are
encoded in the summary prefix and description text only.

---

## 5. Custom Fields

Source: `GET /rest/api/3/field` (all fields, filtered to `custom: true`).

| Field ID | Name | Type |
|---|---|---|
| customfield_10034 | Project | atlas-project |
| customfield_10019 | Rank | gh-lexo-rank |
| customfield_10015 | Start date | datepicker |
| customfield_10040 | Category | jwm-category |
| customfield_10041 | Budget | float |
| customfield_10000 | Development | devsummarycf |
| customfield_10001 | Team | atlassian-team |

**Total: 7 custom fields (all Jira system/JWM defaults — none of the 37 AIGO target fields exist yet)**

No AIGO-specific custom fields (Claims Risk, Primary Metric, Experiment ID,
Segment, Workflow Area, Priority Score, etc.) have been created.

---

## 6. Workflow Scheme

The AIGO project uses the default team-managed (next-gen) workflow scheme.
Team-managed projects do not expose a named workflow scheme via REST; the
workflow is inlined per project. All issue types share the same `To Do →
In Progress → Done` workflow.

No additional statuses, no named transitions, no conditions, no validators.

---

## Summary

| Dimension | Current | Target (specs) |
|---|---|---|
| Issue types | 3 (Workstream, Task, Sub-task) | 14 canonical types |
| Workflow statuses | 3 (To Do, In Progress, Done) | 12 MVP statuses |
| Custom fields | 0 AIGO-specific | 37 target fields (+ 2 classifier helpers) |
| Seed issues | 15 (all typed as Task) | 15+ (one per canonical type, post-reconfig) |
