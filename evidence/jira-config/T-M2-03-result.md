# T-M2-03 Result: Create 14 AIGO Issue Types

**Status: COMPLETE**
**Date:** 2026-06-15T04:08Z–04:11Z
**Executed by:** jira-admin
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Execution Summary

All 14 canonical AIGO issue types were created via `POST /rest/api/3/issuetype`.

### HTTP Results (all 201 Created)

| HTTP | Name | Jira ID |
|------|------|---------|
| 201 | AI Growth Request | 10020 |
| 201 | Creative Request | 10021 |
| 201 | Experiment | 10022 |
| 201 | Segmentation Request | 10023 |
| 201 | Personalization Journey | 10024 |
| 201 | Employer Launch | 10025 |
| 201 | Campaign | 10026 |
| 201 | Dashboard Request | 10027 |
| 201 | Signup Funnel Issue | 10028 |
| 201 | Research Brief | 10029 |
| 201 | Claims Review | 10030 |
| 201 | Decision Memo | 10031 |
| 201 | Positioning Update | 10032 |
| 201 | Bug / Tracking Issue | 10017 (pre-existing from first attempt) |

**Note on IDs:** The first creation attempt (04:08Z) produced IDs 10004–10017, but those
types were created as global (not project-scoped) because the Jira Cloud REST API does not
support creating project-scoped issue types for team-managed (next-gen) projects via
`POST /issuetype` with scope. The scope parameter is accepted by the API but silently
dropped for user-created types — only Jira-internal types receive project scope.

On investigation (see details below), the 13 global types (10004–10016) were deleted and
recreated. `10017` (Bug / Tracking Issue) could not be deleted because it was the last
global base-level type, so it was retained.

Final IDs: 10017, 10020–10032 (14 total).

---

## Team-Managed Project Scope Finding

AIGO is a **team-managed (next-gen) project** (`style: next-gen, simplified: true`).
For team-managed projects:

- `POST /issuetype` with `scope: {type: PROJECT, project: {id: 10000}}` is accepted
  but the resulting type is created as global (no scope in the response).
- `PUT /project/{key}/issuetypes` requires a scope not available on this OAuth token
  (returns 401 "scope does not match" even with `manage:jira-project`).
- The 3 default project-scoped types (Workstream 10001, Task 10002, Sub-task 10003)
  were created by Jira itself at project creation time and cannot be replicated via API.

**Implication:** The 14 AIGO issue types exist globally in the Jira instance and are
available for use. To make them available in the AIGO project for issue creation, a
project admin must go to Project Settings > Issue Types in the Jira UI and add them.
This is a UI-only step for team-managed projects — no API path exists. This is noted
as a blocker sub-item for T-M2-05 or a separate T-M2-03b UI step.

---

## Verification Output

```
AIGO canonical types found: 14/14
  10020: AI Growth Request
  10017: Bug / Tracking Issue
  10026: Campaign
  10030: Claims Review
  10021: Creative Request
  10027: Dashboard Request
  10031: Decision Memo
  10025: Employer Launch
  10022: Experiment
  10024: Personalization Journey
  10032: Positioning Update
  10029: Research Brief
  10023: Segmentation Request
  10028: Signup Funnel Issue
```

Verified via: `GET /rest/api/3/issuetype` filtered by canonical name set.

Note: `acli jira project view --key AIGO --json` only shows 3 project-scoped types
(Workstream, Task, Sub-task) because acli uses the `/issuetype/project` endpoint which
only returns project-scoped types for team-managed projects.

---

## IDs Captured in evidence/jira-config/issue-types.json

```json
[
  { "name": "AI Growth Request",       "id": "10020" },
  { "name": "Creative Request",        "id": "10021" },
  { "name": "Experiment",              "id": "10022" },
  { "name": "Segmentation Request",    "id": "10023" },
  { "name": "Personalization Journey", "id": "10024" },
  { "name": "Employer Launch",         "id": "10025" },
  { "name": "Campaign",                "id": "10026" },
  { "name": "Dashboard Request",       "id": "10027" },
  { "name": "Signup Funnel Issue",     "id": "10028" },
  { "name": "Research Brief",          "id": "10029" },
  { "name": "Claims Review",           "id": "10030" },
  { "name": "Decision Memo",           "id": "10031" },
  { "name": "Positioning Update",      "id": "10032" },
  { "name": "Bug / Tracking Issue",    "id": "10017" }
]
```

---

## Action Required (UI Step — T-M2-03b)

A human operator must go to:
**myhealthcaresite.atlassian.net > AIGO project > Project Settings > Issue Types**
and add the 14 global issue types to make them available on new AIGO issues.

This is a mandatory follow-up before seed issues can be re-typed.

---

## Rollback

If needed, each type can be deleted via:
```
DELETE /rest/api/3/issuetype/{id}?alternativeIssueTypeId=10002
```
IDs to delete: 10017, 10020–10032.
Since no issues use these types yet, deletion is instant and safe.

---

**Safety contract: Verified — configuration-only, staging only, no data mutation.**
