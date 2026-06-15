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
| Trigger (current) | jira.issue.event.trigger:transitioned (all transitions) — updated 2026-06-15; toStatus filter still needs UI |
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

## VM-AUTOMATION-IMPORT verdict: PASS (trigger type fixed; toStatus still needs UI)
- Rule exists in Jira Automation: ✓
- State = DISABLED at import: ✓
- Source file rendered: `automation/rules/rendered/creative-claims.json` ✓
- Trigger updated 2026-06-15: `jira.issue.event.trigger:transitioned` now set via API (PUT /rule/10022498)
  - Working format: `{eventKey:'jira:issue_transitioned', issueEvent:'issue_transitioned'}`
  - toStatus filter returns 500 for all tested formats — must be set to "Ready" via UI flow builder
  - JQL condition returns 500 — add `project = AIGO AND issuetype = "Creative Request"` via UI
