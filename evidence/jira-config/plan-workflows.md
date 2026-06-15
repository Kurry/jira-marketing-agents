# Plan: Add AIGO MVP Workflow Statuses (T-M2-05)

**Status: AWAITING LEAD APPROVAL — do not execute**
**Date:** 2026-06-15
**Author:** jira-admin
**Task:** T-M2-05 — Add 9 new MVP statuses to the AIGO team-managed project
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Safety Contract Check

Adding workflow statuses is **configuration-only, not data mutation**:
- No issues are deleted, transitioned, or moved between statuses.
- No workflow scheme is changed (statuses are added, not replacing existing ones).
- No prompt, policy, or automation rule is altered.
- No production site is touched.
- Existing issues remain in their current status (To Do / In Progress / Done).

**Safety contract: NOT violated. This plan is safe to execute.**

---

## Background

Current AIGO statuses: `To Do`, `In Progress`, `Done` (3 default team-managed statuses).

Target MVP statuses (from `specs/workflows.md`):

| # | Status | Category |
|---|--------|----------|
| 1 | Intake | To Do |
| 2 | Triage | In Progress |
| 3 | Spec Ready | In Progress |
| 4 | In Review | In Progress |
| 5 | Claims Review | In Progress |
| 6 | Experiment Running | In Progress |
| 7 | Decision Needed | In Progress |
| 8 | Launch Prep | In Progress |
| 9 | Done | Done (already exists — verify) |

**Net new statuses to create: 8** (Intake, Triage, Spec Ready, In Review, Claims Review,
Experiment Running, Decision Needed, Launch Prep). "Done" already exists.

---

## REST API Research: Team-Managed vs Company-Managed

### Key finding from T-M2-03 execution

AIGO is a **team-managed (next-gen) project** (`style: next-gen`, `simplified: true`).
For team-managed projects, Jira uses a separate internal workflow engine. The standard
Jira REST API workflow endpoints apply to company-managed (classic) projects only.

### Endpoint investigation results

| Endpoint | Applies to |
|----------|------------|
| `GET /rest/api/3/statuses` | Global status list (read-only) |
| `POST /rest/api/3/statuses` | Create global statuses (requires `manage:jira-configuration` scope) |
| `POST /rest/api/3/workflow` | Company-managed workflows only (not applicable) |
| `GET /rest/api/3/project/{key}/statuses` | Returns statuses for the project's issue types |
| Jira Admin UI > Project Settings > Board | Team-managed workflow editing (UI-only) |

**Key constraint:** For team-managed projects, workflow/status customization beyond adding
global statuses is **UI-only**. There is no REST API endpoint to add a status to a
team-managed project's workflow — Jira handles the workflow mapping automatically when
statuses are created globally and the project board is configured.

**Approach:** Create the 8 statuses as global statuses via `POST /rest/api/3/statuses`
(which requires `manage:jira-configuration` scope, confirmed present in the OAuth token).
The statuses will then be available to add to the AIGO board columns via the Jira UI
(Project Settings > Board > Columns).

---

## Exact Commands to Execute

### Phase 1 — Verify OAuth scope for status creation

```bash
ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"

# Verify current global statuses
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/statuses?maxResults=50" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
vals = d.get('values', d) if isinstance(d, dict) else d
print(f'Existing global statuses: {len(vals)}')
for s in vals:
    print(f'  {s[\"id\"]}: {s[\"name\"]} ({s[\"statusCategory\"][\"name\"]})')
"
```

Expected: shows To Do (category: To Do), In Progress (category: In Progress),
Done (category: Done) plus any pre-existing global statuses.

### Phase 2 — Create 8 MVP statuses via REST

The `POST /rest/api/3/statuses` endpoint creates one or more statuses in a single call.
Status categories:
- `2` = In Progress (`IN_PROGRESS`)
- `3` = Done (`DONE`)
- `4` = To Do (`TODO`)

```bash
ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"

RESULT=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/statuses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": {
      "type": "PROJECT",
      "project": {"id": "10000"}
    },
    "statuses": [
      {"name": "Intake",              "statusCategory": "TODO"},
      {"name": "Triage",              "statusCategory": "IN_PROGRESS"},
      {"name": "Spec Ready",          "statusCategory": "IN_PROGRESS"},
      {"name": "In Review",           "statusCategory": "IN_PROGRESS"},
      {"name": "Claims Review",       "statusCategory": "IN_PROGRESS"},
      {"name": "Experiment Running",  "statusCategory": "IN_PROGRESS"},
      {"name": "Decision Needed",     "statusCategory": "IN_PROGRESS"},
      {"name": "Launch Prep",         "statusCategory": "IN_PROGRESS"}
    ]
  }')
HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -1)
echo "HTTP: $HTTP_CODE"
echo "$BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if isinstance(d, list):
    for s in d:
        print(f'  {s[\"id\"]}: {s[\"name\"]} ({s[\"statusCategory\"][\"key\"]})')
else:
    print(json.dumps(d, indent=2)[:500])
"
```

Expected: HTTP 200 or 201, list of 8 new status objects with IDs.

### Alternative: Create statuses individually if batch fails

```bash
create_status() {
  local NAME="$1"
  local CATEGORY="$2"  # TODO | IN_PROGRESS | DONE
  RESULT=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE/statuses" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"scope\":{\"type\":\"PROJECT\",\"project\":{\"id\":\"10000\"}},\"statuses\":[{\"name\":\"$NAME\",\"statusCategory\":\"$CATEGORY\"}]}")
  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | head -1)
  STATUS_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('id','ERROR'))" 2>/dev/null || echo "PARSE_ERROR")
  echo "[$HTTP_CODE] $NAME => $STATUS_ID"
}

create_status "Intake"             "TODO"
create_status "Triage"             "IN_PROGRESS"
create_status "Spec Ready"         "IN_PROGRESS"
create_status "In Review"          "IN_PROGRESS"
create_status "Claims Review"      "IN_PROGRESS"
create_status "Experiment Running" "IN_PROGRESS"
create_status "Decision Needed"    "IN_PROGRESS"
create_status "Launch Prep"        "IN_PROGRESS"
```

### Phase 3 — Verify statuses are available in the project

```bash
ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"

# Check project statuses
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/project/AIGO/statuses" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
target = {'Intake','Triage','Spec Ready','In Review','Claims Review',
          'Experiment Running','Decision Needed','Launch Prep','Done'}
for issue_type in data:
    print(f'{issue_type[\"name\"]}:')
    for s in issue_type['statuses']:
        mark = '[x]' if s['name'] in target else '[ ]'
        print(f'  {mark} {s[\"id\"]}: {s[\"name\"]}')
"
```

Expected: 8 new statuses visible on at least the primary issue types.

### Phase 4 (UI step — human operator required)

After statuses are created via API, a human operator must:
1. Go to: `myhealthcaresite.atlassian.net` > AIGO > Project Settings > Board
2. Add the 8 new statuses to the appropriate board columns:
   - Column "To Do": add Intake
   - Column "In Progress": add Triage, Spec Ready, In Review, Claims Review,
     Experiment Running, Decision Needed, Launch Prep
3. Verify board shows all columns correctly.

This is required because team-managed project board column mapping is UI-only.

---

## Capture and Evidence

After execution, write the returned status IDs to:
`evidence/jira-config/statuses.json`

Format:
```json
[
  { "name": "Intake",              "id": "XXXXX", "category": "TODO" },
  { "name": "Triage",              "id": "XXXXX", "category": "IN_PROGRESS" },
  ...
]
```

Write execution summary to: `evidence/jira-config/T-M2-05-result.md`

---

## Rollback Step

Statuses can be deleted via:
```
DELETE /rest/api/3/statuses?id={statusId}
```

Since no issues will be in the new statuses at creation time, deletion is safe and instant.
Board column mapping changes are also reversible in the UI.

**Rollback is safe and reversible.**

---

## Dependencies

- T-M2-03 (issue types): COMPLETE — 14 types exist globally
- T-M2-04 (custom fields): COMPLETE — 6 fields + Forge variables set
- acli: verified at 1.3.19-stable
- OAuth token: valid (confirmed by T-M2-03 and T-M2-04 execution)
- Phase 4 (board column mapping) requires a human operator in the Jira UI

---

## Known Risk

**R-STATUS-01:** The `POST /rest/api/3/statuses` endpoint with `scope.type=PROJECT`
may exhibit the same behavior seen with issue types — where the project scope is
accepted but the status is created globally. If this occurs, the statuses will still
be available to the project but need to be added via the board UI (Phase 4). This is
consistent with T-M2-03 findings for team-managed projects.

If the batch endpoint returns 401, try the individual `create_status` function approach
documented above. If both fail, status creation requires the Jira Admin UI at:
Settings > Issues > Statuses > Add Status.

---

**Status: AWAITING LEAD APPROVAL — do not execute until lead posts approval in the task list.**

---

## Lead Approval

**Status: APPROVED**
**Approved by:** lead
**Date:** 2026-06-15T01:45Z
**Criteria checked:**
- [x] Staging only — myhealthcaresite.atlassian.net
- [x] Configuration-only — creates statuses, does not delete/reassign/mutate issue data
- [x] Does not change workflow schemes (creating statuses ≠ editing workflow scheme)
- [x] Rollback documented (DELETE /rest/api/3/statuses — safe, no issues in new statuses at creation time)
- [x] Phase 4 UI step identified and delegated to human operator
- [x] Safety contract: NOT violated

Execute when safety-reviewer approves. Phase 4 board column mapping requires operator action in Jira UI after Phase 2 completes.

---

## Safety-Reviewer Approval

**Approved by:** safety-reviewer
**Date:** 2026-06-15T01:45Z
**Criteria checked:**
- [x] Staging only
- [x] No automation rule enablement
- [x] No manifest changes
- [x] No PHI exposure
- [x] No AI claims approval
- [x] Configuration-only (no existing issue data mutation)

**Verdict: APPROVED — execute when lead confirms.**
