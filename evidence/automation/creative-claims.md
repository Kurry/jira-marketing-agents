# creative-claims — Automation Rule Import Record (VM-AUTOMATION-IMPORT)

**Rule key:** `creative-claims`
**Rule name:** AIGO – Creative Claims Review
**Jira Automation ID:** 10022498
**State at import:** DISABLED (enabled=false)
**Source file:** `automation/rules/rendered/creative-claims.json`
**Imported:** 2026-06-15 via internal API (browser-authenticated admin session)
**CloudID:** 76683cc1-6501-400f-8b59-01eaad4418d2

## Rule configuration

| Field | Value |
|---|---|
| Trigger (current) | issue:created — PLACEHOLDER; change to "transitioned → Ready" via UI |
| Intended trigger | jira.issue.event.trigger:transitioned → toStatus: Ready |
| Intended scope | project = AIGO AND issuetype = "Creative Request" |
| Agent | creative-claims-agent |
| Action (current) | Placeholder comment — replace with Rovo action after connecting Rovo to Automation |

## Operator follow-up before enabling
1. Settings → Automation → Connect Rovo
2. Edit rule → Change trigger to "Work item transitioned" → "Ready"
3. Add JQL condition: `project = AIGO AND issuetype = "Creative Request"`
4. Change action to Rovo: `creative-claims-agent` (never approves claims)
5. Validate via T-M3-03 → `evidence/automation/creative-claims-audit.md`

## VM-AUTOMATION-IMPORT verdict: PASS (with trigger placeholder)
- Rule exists in Jira Automation: ✓
- State = DISABLED at import: ✓
- Source file rendered: `automation/rules/rendered/creative-claims.json` ✓
- Note: trigger type `jira.issue.event.trigger:transitioned` returns HTTP 500 via internal API; rule uses placeholder `created` trigger until operator updates via UI
