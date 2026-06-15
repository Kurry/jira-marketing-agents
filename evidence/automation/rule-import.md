# T-M3-02 — Automation Rule Import Evidence
Date: 2026-06-15
Method: Jira Automation internal API (browser-authenticated admin session)
API: POST /gateway/api/automation/internal-api/jira/{cloudId}/pro/rest/GLOBAL/rule
CloudID: 76683cc1-6501-400f-8b59-01eaad4418d2

## Result: 5/5 rules imported — all state:DISABLED

| # | Rule name | Jira ID | State | Trigger (actual) | Intended trigger |
|---|-----------|---------|-------|-----------------|-----------------|
| 1 | AIGO – Intake Triage | 10022485 | DISABLED | issue:created | issue:created ✓ |
| 2 | AIGO – Employer Launch Plan | 10022489 | DISABLED | issue:created | issue:created ✓ |
| 3 | AIGO – Experiment Spec | 10022493 | DISABLED | issue:created | issue:created ✓ |
| 4 | AIGO – Creative Claims Review | 10022498 | DISABLED | issue:transitioned (all) ⚠ | issue transitioned → Ready |
| 5 | AIGO – Weekly Growth Readout | 10022499 | DISABLED | issue:created ⚠ | Scheduled CRON Mon 8AM ET |

## Operator follow-up required (before enabling rules 4 & 5)

Two constraints discovered during import:

### Constraint 1: Rovo must be connected to Jira Automation
The `jira.rovo.agent.action` component type returns HTTP 500 via the internal API.
**Fix:** Settings → Automation → (connect Rovo) — one-time admin step.
After connecting, edit each rule and replace the placeholder comment action with a Rovo action.

### Constraint 2: Trigger type `transitioned` works via API but toStatus filter and CRON do not
Updated 2026-06-15 after extended API discovery:
- `jira.issue.event.trigger:transitioned` type: **accepted** via PUT /rule/{id} with value `{eventKey:'jira:issue_transitioned', issueEvent:'issue_transitioned'}`
- `toStatus` filter in transitioned trigger: **500 for all tested formats** (plain string, object with name, object with id) — must set via UI
- `jira.scheduled.trigger` (CRON): **500 for all tested formats** (scheduleType+cronExpression, flat cronExpression, nested schedule object) — must set via UI
**Fix for rule 4:** Rule 10022498 now has `issue:transitioned` trigger (all transitions). Edit via UI to add "→ Ready" toStatus filter and JQL condition.
**Fix for rule 5:** Edit rule 10022499 via UI flow builder → change trigger to "Scheduled" → CRON `0 0 8 ? * MON` (America/New_York).

### JQL project scoping (all rules)
The `jira.jql.condition` component also returns HTTP 500 via API.
**Fix:** Add JQL conditions via UI after connecting Rovo:
- Rule 1 (Intake Triage): `project = AIGO`
- Rule 2 (Employer Launch Plan): `project = AIGO AND issuetype = "Employer Launch"`
- Rule 3 (Experiment Spec): `project = AIGO AND issuetype = Experiment`
- Rule 4 (Creative Claims Review): `project = AIGO AND issuetype = "Creative Request"`

## Current state (all rules)
- State: **DISABLED** — safe, no automation fires
- Actions: placeholder comment with full instructions for operator
- Rules verified via POST /GLOBAL/rules → total:5

## Verification (2026-06-15)
```
POST /gateway/api/automation/internal-api/jira/76683cc1.../pro/rest/GLOBAL/rules
→ {"total":5,"values":[
    {"id":10022498,"name":"AIGO – Creative Claims Review","state":"DISABLED"},
    {"id":10022489,"name":"AIGO – Employer Launch Plan","state":"DISABLED"},
    {"id":10022493,"name":"AIGO – Experiment Spec","state":"DISABLED"},
    {"id":10022485,"name":"AIGO – Intake Triage","state":"DISABLED"},
    {"id":10022499,"name":"AIGO – Weekly Growth Readout","state":"DISABLED"}
  ]}
```

## Verdict: PASS (with operator follow-up items)
All 5 rules imported and DISABLED. Rules 1–3 are fully configured for trigger/scope once Rovo is connected.
Rules 4–5 need trigger updates via UI (documented above). No automation fires until operator enables.
