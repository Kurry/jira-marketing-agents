# Plan: Create AIGO Issue Types (T-M2-03)

**Status: AWAITING LEAD APPROVAL — do not execute**  
**Date:** 2026-06-14  
**Author:** jira-admin  
**Task:** T-M2-03 — Create 14 canonical AIGO issue types  
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Safety Contract Check

Creating issue types is **configuration-only, not data mutation**:
- No issues are deleted, transitioned, or modified.
- No workflow scheme is changed (workflow gap is T-M2-05, separate plan).
- No prompt, policy, or automation rule is altered.
- No production site is touched.

**Safety contract: NOT violated. This plan is safe to execute.**

---

## Background

Current state: AIGO project has 3 issue types (Workstream id:10001, Task id:10002,
Sub-task id:10003) — all team-managed defaults.  
Target state: 14 canonical types per `specs/issue-types.md`.

Team-managed (next-gen) Jira projects use project-scoped issue types. The Jira
REST endpoint for creating issue types on team-managed projects is:

```
POST /rest/api/3/issuetype
```

with the project scope set:
```json
{
  "name": "<type name>",
  "description": "<description>",
  "type": "standard",
  "scope": {
    "type": "PROJECT",
    "project": { "id": "10000" }
  }
}
```

For sub-task types, use `"type": "subtask"`. All 14 canonical types are
`standard` (hierarchy level 0).

The acli CLI does not expose an `issue-type create` command; these will be
created via direct Jira REST API calls using the OAuth bearer token from
`security find-generic-password -l "acli" -w`.

---

## Exact Commands to Execute

The following script creates all 14 issue types in order. It is idempotent:
if a type with that name already exists in the project scope, Jira returns an
error which will be logged but will not abort.

```bash
#!/usr/bin/env bash
set -euo pipefail

ACCESS_TOKEN=$(security find-generic-password -l "acli" -w 2>&1 \
  | sed 's/^go-keyring-base64://' | base64 -d | gunzip \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
CLOUD_ID="76683cc1-6501-400f-8b59-01eaad4418d2"
BASE="https://api.atlassian.com/ex/jira/$CLOUD_ID/rest/api/3"
PROJECT_ID="10000"

create_type() {
  local NAME="$1"
  local DESC="$2"
  local RESULT
  RESULT=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE/issuetype" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"description\":\"$DESC\",\"type\":\"standard\",\"scope\":{\"type\":\"PROJECT\",\"project\":{\"id\":\"$PROJECT_ID\"}}}")
  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | head -1)
  echo "[$HTTP_CODE] $NAME: $(echo $BODY | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get(\"id\",d.get(\"errorMessages\",d)))' 2>/dev/null || echo "$BODY")"
}

create_type "AI Growth Request"     "General intake for a growth idea or ask that needs AI triage before it becomes executable work."
create_type "Creative Request"      "Request to draft creative variants (copy/assets) for a channel. AI drafts only; claims-scanned and routed to review."
create_type "Experiment"            "A single test with a hypothesis, metric, guardrails, and a decision rule."
create_type "Segmentation Request"  "Request to define a target audience/segment as a structured targeting spec."
create_type "Personalization Journey" "A full lifecycle/journey artifact for a segment: stages, channels, behavior triggers, sequence, fallbacks, tracking, and approvals."
create_type "Employer Launch"       "Workback plan for launching to an employer/partner with readiness scoring, blockers, phases, QA checklist."
create_type "Campaign"              "A multi-touch outreach plan (draft only — no send). Includes channels, cadence, suppression checks, tracking, and approval gates."
create_type "Dashboard Request"     "Request for an analytics dashboard or reporting view spec."
create_type "Signup Funnel Issue"   "A funnel-friction or signup defect to analyze and convert into a product-ready remediation ticket."
create_type "Research Brief"        "A qualitative research / objection-mining synthesis: themes, frequency, segments, de-identified quotes, conversion impact."
create_type "Claims Review"         "A health/clinical claims review item. Human Compliance reviewer required; AI may flag but never approves."
create_type "Decision Memo"         "A decision-support artifact tying a recommendation to evidence and a required decision."
create_type "Positioning Update"    "A product positioning/messaging update: value propositions, proof requirements, differentiators, objection matrix."
create_type "Bug / Tracking Issue"  "An engineering/tracking defect — including analytics/tracking instrumentation gaps."
```

---

## Issue Types to Create (14 total)

| # | Name | Description |
|---|---|---|
| 1 | AI Growth Request | General intake for a growth idea or ask that needs AI triage |
| 2 | Creative Request | Creative variants request; AI drafts only; claims-scanned |
| 3 | Experiment | Single test with hypothesis, metric, guardrails, decision rule |
| 4 | Segmentation Request | Audience/segment spec with suppression logic required |
| 5 | Personalization Journey | Full lifecycle/journey artifact for a segment |
| 6 | Employer Launch | Workback plan with readiness scoring and QA checklist |
| 7 | Campaign | Multi-touch outreach plan draft (no send); suppression checks |
| 8 | Dashboard Request | Analytics dashboard or reporting view spec |
| 9 | Signup Funnel Issue | Funnel-friction or signup defect analysis |
| 10 | Research Brief | Qualitative research synthesis with de-identified quotes |
| 11 | Claims Review | Health/clinical claims review; human Compliance required |
| 12 | Decision Memo | Decision-support artifact with recommendation and evidence |
| 13 | Positioning Update | Product positioning/messaging update with claims risk |
| 14 | Bug / Tracking Issue | Engineering/tracking defect |

---

## Verification Step

After execution:
```bash
# Verify all 14 types are visible in the project
acli jira project view --key AIGO --json | python3 -c "
import sys, json
d = json.load(sys.stdin)
types = d.get('issueTypes', [])
print(f'Total issue types: {len(types)}')
for t in types:
    print(f'  {t[\"id\"]}: {t[\"name\"]}')
"
```

Expected: 14 new types visible (plus the 3 existing defaults = 17 total, or 14
if Jira replaces defaults, depending on team-managed project behavior).

---

## Rollback Step

Jira REST supports deleting project-scoped issue types:

```
DELETE /rest/api/3/issuetype/{id}?alternativeIssueTypeId={fallback_id}
```

- Requires `alternativeIssueTypeId` = `10002` (Task) so any issues that used
  the deleted type are re-typed to Task.
- This endpoint is destructive; it requires a separate plan-approval before use.
- Since no issues will be typed to the new types at the time of creation (all 15
  seeds are currently typed Task), deletion after creation is safe and instant.

To rollback: collect the IDs returned by each `create_type` call (logged in
output), then DELETE each. No issue re-typing needed since no issues use the
new types yet.

---

## Dependencies

- acli OAuth token must be valid (confirmed valid per evidence/jira-config/acli-auth.md)
- Project ID 10000 must be the AIGO project (confirmed)
- No other teammate's work is blocked by this plan
- T-M2-04 (custom fields) can proceed in parallel after lead approval

---

**AWAITING LEAD APPROVAL — do not execute until lead posts approval in the task list.**

---

## Lead Approval

**Status: APPROVED**  
**Approved by:** lead  
**Date:** 2026-06-15T01:10Z  
**Criteria checked:**
- [x] Exact file paths and Jira resources named
- [x] Exact verification commands listed
- [x] Rollback step documented (DELETE /issuetype with alternativeIssueTypeId=10002)
- [x] Safety contract: configuration-only, no data mutation, no workflow scheme change, staging only
- [x] Not in plan-approval-required class (creating issue types ≠ changing/deleting workflow schemes)

Execute when ready.
