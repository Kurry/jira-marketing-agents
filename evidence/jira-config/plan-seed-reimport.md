# Plan: Seed Issue Re-type for T-M2-07

**Status: AWAITING LEAD APPROVAL — do not execute**  
**Date:** 2026-06-15  
**Author:** jira-admin  
**Task:** T-M2-07 — Re-type seed issues so at least one exists per canonical issue type  
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Safety Contract Check

This plan **re-types existing issues only**:
- No issues are deleted.
- No issues are transitioned (status remains "To Do" or current status).
- No automation rules are enabled.
- No workflow schemes are changed.
- No production site is touched.
- No PHI in any output.
- Only `issuetype` field is mutated; all other fields are preserved.

**Safety contract: NOT violated. This plan is safe to execute.**

---

## Goal

Ensure that the AIGO project contains at least one issue of each of the 14 canonical
issue types defined in T-M2-03. Currently the 15 seed issues were created under the
default types (Epic, Story, Task, Bug, Subtask). After T-M2-03, 14 custom types exist
globally but most seeds remain on legacy types.

**Target:** at least 1 seed issue per type, covering all 14 canonical types:

| # | Canonical Type              |
|---|----------------------------|
| 1 | Growth Initiative          |
| 2 | Experiment                 |
| 3 | Creative Brief             |
| 4 | Campaign                   |
| 5 | Employer Launch            |
| 6 | Landing Page               |
| 7 | Referral Program           |
| 8 | Audience Segment           |
| 9 | Activation Flow            |
| 10 | Analytics Dashboard        |
| 11 | Claims Review              |
| 12 | Funnel Analysis            |
| 13 | Readout                    |
| 14 | Backlog Item               |

---

## Hard Pre-condition

**T-M2-03b must complete first.**

T-M2-03b is the operator UI step: adding the 14 canonical issue types to AIGO Project
Settings > Issue Types (so they appear as selectable types within the project). Until
the operator completes this, re-typing seeds via REST will fail with a 400 because the
types are globally created but not yet added to the AIGO project's issue type scheme.

**Blocker check before execution:**
```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/project/AIGO" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Project issue type scheme:', d.get('issueTypeScheme', {}).get('id', 'not found'))
"
```

And verify types via:
```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/issuetype/project?projectId=10000" \
  | python3 -c "
import sys, json
types = json.load(sys.stdin)
print(f'Issue types in project: {len(types)}')
for t in types:
    print(f'  {t[\"id\"]}: {t[\"name\"]}')
"
```

If fewer than 14 custom types appear, stop and prompt the operator to complete T-M2-03b.

---

## Current Seed State

Read from `evidence/jira-config/issue-types.json` and T-M2-03-result.md.

The 15 seed issues can be queried:
```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/search?jql=project=AIGO+ORDER+BY+created+ASC&maxResults=20&fields=summary,issuetype,status" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total issues: {d[\"total\"]}')
for i in d['issues']:
    print(f'  {i[\"key\"]}: [{i[\"fields\"][\"issuetype\"][\"name\"]}] {i[\"fields\"][\"summary\"][:60]}')
"
```

---

## Assignment Strategy

Map each seed issue to a canonical type by summary/theme:

| Seed Theme (approximate)        | Target Type          |
|---------------------------------|----------------------|
| Annual enrollment campaign      | Campaign             |
| A/B test subject line           | Experiment           |
| Q4 employer expansion           | Employer Launch      |
| Claims risk review              | Claims Review        |
| Referral loop design            | Referral Program     |
| SEO landing page                | Landing Page         |
| Audience segment high-risk      | Audience Segment     |
| Activation onboarding           | Activation Flow      |
| Analytics dashboard Q4          | Analytics Dashboard  |
| Funnel drop-off analysis        | Funnel Analysis      |
| Growth initiative H2            | Growth Initiative    |
| Creative brief video            | Creative Brief       |
| Weekly readout                  | Readout              |
| Sprint backlog items            | Backlog Item         |
| Remaining seed                  | Story or first type  |

**Actual assignment** will be determined at execution time by reading the seed issue
summaries and choosing the best semantic match. At least one issue will be assigned to
each of the 14 types. If there are fewer seeds than types (15 seeds / 14 types), one
type may get 2 issues and one seed stays as its original type.

---

## Exact Commands to Execute

### Step 0 — Confirm pre-condition (T-M2-03b complete)

```bash
ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"

curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/issuetype/project?projectId=10000" \
  | python3 -c "
import sys, json
types = json.load(sys.stdin)
names = [t['name'] for t in types]
required = ['Growth Initiative','Experiment','Creative Brief','Campaign',
            'Employer Launch','Landing Page','Referral Program','Audience Segment',
            'Activation Flow','Analytics Dashboard','Claims Review',
            'Funnel Analysis','Readout','Backlog Item']
missing = [r for r in required if r not in names]
if missing:
    print(f'BLOCKED: {len(missing)} types not yet in project: {missing}')
    print('Complete T-M2-03b first.')
else:
    print('Pre-condition MET: all 14 types present in project.')
"
```

### Step 1 — List seed issues and build assignment map

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/search?jql=project=AIGO+ORDER+BY+created+ASC&maxResults=20&fields=summary,issuetype,status" \
  | python3 -m json.tool > /tmp/seed_issues.json
cat /tmp/seed_issues.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
for i in d['issues']:
    print(f'{i[\"key\"]}\t{i[\"fields\"][\"issuetype\"][\"name\"]}\t{i[\"fields\"][\"summary\"][:70]}')
"
```

At this point, manually (or programmatically) map each key to its target type ID
from `evidence/jira-config/issue-types.json`.

### Step 2 — Re-type each seed issue

For each issue key + target type ID pair:
```bash
retype_issue() {
  local ISSUE_KEY="$1"
  local TYPE_ID="$2"
  local TYPE_NAME="$3"
  RESULT=$(curl -s -w "\n%{http_code}" \
    -X PUT "$BASE/issue/$ISSUE_KEY" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"fields\":{\"issuetype\":{\"id\":\"$TYPE_ID\"}}}")
  HTTP_CODE=$(echo "$RESULT" | tail -1)
  echo "[$HTTP_CODE] $ISSUE_KEY => $TYPE_NAME (ID: $TYPE_ID)"
}

# Example calls (actual keys determined at execution time from Step 1):
# retype_issue "AIGO-1"  "<growth-initiative-id>"  "Growth Initiative"
# retype_issue "AIGO-2"  "<experiment-id>"          "Experiment"
# ... (all 14 mappings)
```

### Step 3 — Verify coverage

```bash
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/search?jql=project=AIGO+ORDER+BY+issuetype+ASC&maxResults=20&fields=summary,issuetype" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
from collections import Counter
type_counts = Counter(i['fields']['issuetype']['name'] for i in d['issues'])
required = ['Growth Initiative','Experiment','Creative Brief','Campaign',
            'Employer Launch','Landing Page','Referral Program','Audience Segment',
            'Activation Flow','Analytics Dashboard','Claims Review',
            'Funnel Analysis','Readout','Backlog Item']
print('Coverage check:')
for t in required:
    mark = '[x]' if type_counts.get(t, 0) >= 1 else '[ ]'
    print(f'  {mark} {t}: {type_counts.get(t, 0)}')
"
```

Expected: all 14 types show [x] with count >= 1.

---

## Evidence to Capture

After execution, write:
- `evidence/jira-config/seed-issues.json` — array of `{key, summary, originalType, newType, typeId, httpCode}`
- `evidence/jira-config/T-M2-07-result.md` — execution log with coverage check output

---

## Rollback

Re-type any issue back to its original type using the same PUT endpoint:
```
PUT /rest/api/3/issue/{issueKey}
{"fields": {"issuetype": {"id": "<original-type-id>"}}}
```

No issues are deleted; rollback is non-destructive.

---

## Known Constraints

1. **T-M2-03b must complete first** — operator must add the 14 types to AIGO via
   Project Settings > Issue Types UI.
2. **Subtask type** — Jira may not allow re-typing a Subtask to a non-subtask type via
   REST without first unlinking the parent. If any seed is a Subtask, skip it and note
   in the result doc.
3. **One-issue-per-type minimum** — with 15 seeds and 14 types, at least one type will
   have 2 seeds. This is acceptable.
4. **Status preservation** — all issues remain in their current status (To Do). The
   PUT /issue endpoint does not change status when only `issuetype` is updated.

---

## Dependencies

- T-M2-03 (issue types globally created): COMPLETE
- T-M2-03b (types added to AIGO project scheme via UI): PENDING — operator action
- T-M2-05 (statuses created): COMPLETE (this run)
- T-M2-04 (custom fields): COMPLETE
- acli / OAuth token: valid

---

**Status: AWAITING LEAD APPROVAL**
