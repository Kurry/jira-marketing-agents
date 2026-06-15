# employer-launch — Automation Rule Import Record (VM-AUTOMATION-IMPORT)

**Rule key:** `employer-launch`
**Rule name:** AIGO – Employer Launch Plan
**Jira Automation ID:** 10022489
**State at import:** DISABLED (enabled=false)
**Source file:** `automation/rules/rendered/employer-launch.json`
**Imported:** 2026-06-15 via internal API (browser-authenticated admin session)
**CloudID:** 76683cc1-6501-400f-8b59-01eaad4418d2

## Rule configuration

| Field | Value |
|---|---|
| Trigger | issue:created (jira.issue.event.trigger:created) ✓ matches spec |
| Intended scope | project = AIGO AND issuetype = "Employer Launch" (JQL — add via UI) |
| Agent | employer-launch-agent |
| Action (current) | Placeholder comment — replace with Rovo action after connecting Rovo to Automation |

## Operator follow-up before enabling
1. Settings → Automation → Connect Rovo
2. Edit rule → Change action to Rovo: `employer-launch-agent`
3. Add JQL condition: `project = AIGO AND issuetype = "Employer Launch"`
4. Validate via T-M3-03 → `evidence/automation/employer-launch-audit.md`

## VM-AUTOMATION-IMPORT verdict: PASS
- Rule exists in Jira Automation: ✓
- State = DISABLED at import: ✓
- Source file rendered: `automation/rules/rendered/employer-launch.json` ✓
