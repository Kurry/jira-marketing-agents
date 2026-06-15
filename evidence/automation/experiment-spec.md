# experiment-spec — Automation Rule Import Record (VM-AUTOMATION-IMPORT)

**Rule key:** `experiment-spec`
**Rule name:** AIGO – Experiment Spec
**Jira Automation ID:** 10022493
**State at import:** DISABLED (enabled=false)
**Source file:** `automation/rules/rendered/experiment-spec.json`
**Imported:** 2026-06-15 via internal API (browser-authenticated admin session)
**CloudID:** 76683cc1-6501-400f-8b59-01eaad4418d2

## Rule configuration

| Field | Value |
|---|---|
| Trigger | issue:created (jira.issue.event.trigger:created) ✓ matches spec |
| Intended scope | project = AIGO AND issuetype = Experiment (JQL — add via UI) |
| Agent | experiment-design-agent |
| Action (current) | Placeholder comment — replace with Rovo action after connecting Rovo to Automation |

## Operator follow-up before enabling
1. Settings → Automation → Connect Rovo
2. Edit rule → Change action to Rovo: `experiment-design-agent`
3. Add JQL condition: `project = AIGO AND issuetype = Experiment`
4. Validate via T-M3-03 → `evidence/automation/experiment-spec-audit.md`

## VM-AUTOMATION-IMPORT verdict: PASS
- Rule exists in Jira Automation: ✓
- State = DISABLED at import: ✓
- Source file rendered: `automation/rules/rendered/experiment-spec.json` ✓
