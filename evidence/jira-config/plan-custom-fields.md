# Plan: Create AIGO Custom Fields (T-M2-04)

**Status: AWAITING LEAD APPROVAL — do not execute**  
**Date:** 2026-06-14  
**Author:** jira-admin  
**Task:** T-M2-04 — Create 6 MVP-critical custom fields (env-var wired) in Jira  
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Safety Contract Check

Creating custom fields is **configuration-only, not data mutation**:
- No issues are modified, transitioned, or deleted.
- No workflow is changed.
- No prompt, policy, or automation rule is altered.
- Field **writes** are still gated per `policies/safe-mutations.md`; this plan
  only creates the field schema, not any write path.
- No production site is touched.

**Safety contract: NOT violated. This plan is safe to execute.**

---

## Scope of This Plan

There are 39 custom fields in the full AIGO catalog (`specs/custom-fields.md`).
This plan covers **only the 6 MVP-critical fields** wired to env vars in
`src/config.ts`. The remaining 33 target-state fields are deferred to
T-M2-04b (full field catalog) and require a separate plan.

The 6 env-var-wired fields (and the forge variables that need to be set):

| # | Field | Jira Type | Env var (src/config.ts) |
|---|---|---|---|
| 1 | Segment | select | SEGMENT_FIELD_ID |
| 2 | Primary Metric | select | PRIMARY_METRIC_FIELD_ID |
| 3 | Claims Risk | select | CLAIMS_RISK_FIELD_ID |
| 4 | Experiment ID | text (single-line) | EXPERIMENT_ID_FIELD_ID |
| 5 | Workflow Area | select | WORKFLOW_AREA_FIELD_ID |
| 6 | Priority Score | number | PRIORITY_SCORE_FIELD_ID |

---

## Exact Commands to Execute

### Phase 1 — Create the 6 fields via Jira REST

```bash
#!/usr/bin/env bash
set -euo pipefail

ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"

create_field() {
  local NAME="$1"
  local TYPE="$2"
  local SEARCHER="$3"
  local DESC="$4"
  RESULT=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE/field" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"type\":\"$TYPE\",\"searcherKey\":\"$SEARCHER\",\"description\":\"$DESC\"}")
  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | head -1)
  FIELD_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','ERROR'))" 2>/dev/null || echo "PARSE_ERROR")
  echo "[$HTTP_CODE] $NAME => $FIELD_ID"
  echo "  Body: $BODY" | head -c 200
}

# 1. Segment (select)
create_field "Segment" \
  "com.atlassian.jira.plugin.system.customfieldtypes:select" \
  "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher" \
  "AIGO: Target audience segment for this issue."

# 2. Primary Metric (select)
create_field "Primary Metric" \
  "com.atlassian.jira.plugin.system.customfieldtypes:select" \
  "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher" \
  "AIGO: Primary success metric (signups, CAC, activation rate, etc.)."

# 3. Claims Risk (select)
create_field "Claims Risk" \
  "com.atlassian.jira.plugin.system.customfieldtypes:select" \
  "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher" \
  "AIGO: Health/clinical claims risk level: Low, Medium, High, Prohibited."

# 4. Experiment ID (text)
create_field "Experiment ID" \
  "com.atlassian.jira.plugin.system.customfieldtypes:textfield" \
  "com.atlassian.jira.plugin.system.customfieldtypes:textsearcher" \
  "AIGO: Unique identifier for this experiment (e.g., EXP-2026-001)."

# 5. Workflow Area (select)
create_field "Workflow Area" \
  "com.atlassian.jira.plugin.system.customfieldtypes:select" \
  "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher" \
  "AIGO: Triage routing area (Targeting, Creative, Experiment, Employer, Funnel, Content, Research, Platform)."

# 6. Priority Score (number)
create_field "Priority Score" \
  "com.atlassian.jira.plugin.system.customfieldtypes:float" \
  "com.atlassian.jira.plugin.system.customfieldtypes:exactnumber" \
  "AIGO: Numeric triage priority score (0–100) from the Growth Triage Agent."
```

### Phase 2 — Record the field IDs and set forge variables

After Phase 1, collect the `customfield_XXXXX` IDs logged by the script and
set them as Forge environment variables:

```bash
# Replace XXXXX with the actual IDs returned by Phase 1
forge variables set SEGMENT_FIELD_ID       customfield_XXXXX --environment development
forge variables set PRIMARY_METRIC_FIELD_ID customfield_XXXXX --environment development
forge variables set CLAIMS_RISK_FIELD_ID   customfield_XXXXX --environment development
forge variables set EXPERIMENT_ID_FIELD_ID customfield_XXXXX --environment development
forge variables set WORKFLOW_AREA_FIELD_ID  customfield_XXXXX --environment development
forge variables set PRIORITY_SCORE_FIELD_ID customfield_XXXXX --environment development

# Verify
forge variables list --environment development
```

### Phase 3 — Redeploy Forge app

After setting variables:
```bash
forge deploy -e development
```

This picks up the new field IDs so the app can read them from `src/config.ts`
(`FIELD_IDS` map).

---

## Select Field Options (Post-creation)

After creating the select fields, their option lists must be populated via:
```
PUT /rest/api/3/customFieldOption/{fieldId}
```

The required options per field:

**Segment:** Employer Members, Lapsed Members, Activation Cohort, High-intent Visitors, General Audience

**Primary Metric:** Signups, CAC, Activation Rate, Retention, MoM Revenue, Feature Adoption, NPS

**Claims Risk:** Low, Medium, High, Prohibited

**Workflow Area:** Targeting, Creative, Experiment, Employer, Funnel, Content, Research, Platform

**Priority Score:** (number field — no options needed)

This step is a separate sub-task within T-M2-04 and can be executed immediately
after the fields are created.

---

## Verification Step

```bash
ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"

curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3/field" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
aigo = [f for f in data if f.get('custom') and f['name'] in [
  'Segment','Primary Metric','Claims Risk','Experiment ID','Workflow Area','Priority Score'
]]
print(f'AIGO MVP fields found: {len(aigo)}/6')
for f in aigo:
    print(f'  {f[\"id\"]}: {f[\"name\"]}')
"
```

Expected: 6 AIGO MVP fields found.

---

## Rollback Step

Custom fields can be deleted (moved to trash) via:
```
DELETE /rest/api/3/customFieldOption/{fieldId}
```
or in Jira Admin: Settings → Issues → Custom Fields → Actions → Move to Trash.

Since no issues have values in these fields at creation time (fields don't auto-
populate), deletion has no data impact. Deleted fields can be restored from trash
within 30 days.

**Rollback is safe and reversible.**

---

## Dependencies

- T-M2-03 (issue types) should ideally be approved/executed first, but field
  creation is independent and can proceed in parallel.
- `forge-engineer` must be notified of the final field IDs so `src/config.ts`
  and any tests that reference field IDs can be updated if needed.
- Field **reads** in the app are advisory (agent output is comments/labels only
  for MVP); field **writes** remain gated per `policies/safe-mutations.md`.
- Forge variables set step requires `forge deploy` after to take effect.

---

## What This Plan Does NOT Cover

- The remaining 33 catalog fields (Target Population, Hypothesis, Channels, etc.)
  — deferred to T-M2-04b, separate plan, after MVP P1/P2 complete.
- Screen schemes and field configuration schemes — needed to make fields visible
  on issue create/edit forms; a follow-on sub-task.
- Field context / project-scoping — custom fields are global by default in
  company-managed projects; for team-managed, they appear on all issues once
  created. No additional scoping needed for team-managed AIGO.

---

**AWAITING LEAD APPROVAL — do not execute until lead posts approval in the task list.**

---

## Lead Approval

**Status: APPROVED**  
**Approved by:** lead  
**Date:** 2026-06-15T01:10Z  
**Criteria checked:**
- [x] Exact file paths and Jira resources named
- [x] Creates 6 MVP-critical fields only (env-var wired); 33 deferred
- [x] Rollback step: move to trash within 30 days
- [x] Safety contract: configuration-only, field write path still gated by policies/safe-mutations.md
- [x] staging only

Execute when ready. After creation, update src/config.ts env var comments and note field IDs in evidence/jira-config/custom-fields.json.
