# weekly-readout — Automation Rule Import Record (VM-AUTOMATION-IMPORT)

**Rule key:** `weekly-readout`
**Rule name:** AIGO – Weekly Growth Readout
**Jira Automation ID:** 10022499
**State at import:** DISABLED (enabled=false)
**Source file:** `automation/rules/rendered/weekly-readout.json`
**Imported:** 2026-06-15 via internal API (browser-authenticated admin session)
**CloudID:** 76683cc1-6501-400f-8b59-01eaad4418d2

## Rule configuration

| Field | Value |
|---|---|
| Trigger (current) | issue:created — PLACEHOLDER; change to Scheduled CRON via UI |
| Intended trigger | jira.scheduled.trigger → CRON: `0 0 8 ? * MON` (America/New_York) |
| Intended scope | Global (no JQL filter — runs against JQL in agent prompt) |
| Agent | weekly-readout-agent |
| Action (current) | Placeholder comment — replace with Rovo action after connecting Rovo to Automation |

## Operator follow-up before enabling
1. Settings → Automation → Connect Rovo
2. Edit rule → Change trigger to "Scheduled" → CRON: `0 0 8 ? * MON` timezone `America/New_York`
3. Change action to Rovo: `weekly-readout-agent` + create Decision Memo issue
4. Validate via T-M3-03 → `evidence/automation/weekly-readout-audit.md`

## VM-AUTOMATION-IMPORT verdict: PASS (with trigger placeholder)
- Rule exists in Jira Automation: ✓
- State = DISABLED at import: ✓
- Source file rendered: `automation/rules/rendered/weekly-readout.json` ✓
- Note: trigger type `jira.scheduled.trigger` returns HTTP 500 via internal API; rule uses placeholder `created` trigger until operator updates via UI
