---
name: jira-automation-rovo-setup
description: Wire Rovo agents to Jira Automation rules for the AIGO project. Use when connecting Rovo to Automation, editing imported rules to replace placeholder actions with Rovo agent steps, adding JQL scope conditions, fixing triggers, enabling rules, or capturing audit-log evidence. Use this skill whenever the user mentions Jira Automation + Rovo, T-M3-03, automation rule wiring, or enabling the 5 AIGO automation rules.
---

# Jira Automation → Rovo Setup

Use this skill to complete T-M3-03: connect Rovo to Jira Automation and wire the 5 AIGO rules.

## Prerequisites

- Site admin rights on the target Atlassian Cloud site
- Rovo enabled at the org level (admin.atlassian.com)
- **Jira Premium or Enterprise plan** — "Use agent" (Rovo AI) in Automation requires Atlassian Intelligence, which is not available on Free/Standard plans. Verify plan tier before attempting; if on Free/Standard the "Use agent" step will show "To use a Rovo agent, your org admin needs to activate AI" with no toggle available anywhere in admin settings.

## Plan Check (before starting)

1. Navigate to `https://<site>.atlassian.net/jira/settings/system/labs` — if only "Jira formula fields" appears and there is NO "Atlassian Intelligence" toggle, the site is on Free/Standard. Stop here and document R-07 (see below).
2. Check admin.atlassian.com → Rovo → Beta features: "Rovo beta features" toggle must be ON.
3. Check Rovo access blocklist is empty (no orgs/users blocked).

## R-07: Plan Limitation Blocker

If "Use agent" in Automation is blocked by "your org admin needs to activate AI":
- Root cause: Atlassian Intelligence for Automation is a Premium/Enterprise feature
- Workaround: Operators can trigger Rovo agents manually via the Rovo chat sidebar while viewing a Jira issue
- Resolution path: Upgrade to Jira Premium → activate Atlassian Intelligence → return to this skill
- Document in `evidence/blockers.md` and update STATUS.md risks

## Connect Rovo to Automation (one-time, requires Premium+)

1. Go to `https://<site>.atlassian.net/jira/settings/automation`
2. Top right: click the integration/connection icon (Rovo icon) or look for a "Connect Rovo" prompt
3. Authorize as a site admin account — toast: "Connection created"
4. This is a one-time step per site

## Rule IDs (AIGO project, staging: myhealthcaresite.atlassian.net)

| # | Name | Jira ID | Trigger needed | JQL scope |
|---|------|---------|---------------|-----------|
| 1 | AIGO – Intake Triage | 10022485 | issue:created ✓ | `project = AIGO` |
| 2 | AIGO – Employer Launch Plan | 10022489 | issue:created ✓ | `project = AIGO AND issuetype = "Employer Launch"` |
| 3 | AIGO – Experiment Spec | 10022493 | issue:created ✓ | `project = AIGO AND issuetype = Experiment` |
| 4 | AIGO – Creative Claims Review | 10022498 | issue:transitioned → Ready ⚠ | `project = AIGO AND issuetype = "Creative Request"` |
| 5 | AIGO – Weekly Growth Readout | 10022499 | Scheduled CRON Mon 8AM ET ⚠ | (no JQL — runs over JQL search result) |

Navigate directly to a rule: `https://<site>.atlassian.net/jira/settings/automation#/rule/<ruleId>`

**Note:** These rules do NOT appear in the global automation list UI — navigate by ID directly.

## Editing Each Rule (flow builder UI)

For rules 1–3 (standard issue:created trigger):
1. Open rule by direct URL
2. Click the existing action (placeholder comment) → Delete
3. Click "+" to add action → Actions panel → "Rovo AI" section → "Use agent"
4. Select agent from dropdown (e.g., `growth-triage-agent`, `employer-launch-agent`, `experiment-design-agent`)
5. Add a JQL Condition between trigger and action: Condition → "JQL condition" → enter JQL → Next
6. Click "Save"

For rule 4 (Creative Claims Review — trigger fix needed):
1. Open rule 10022498
2. Click trigger → change to "Work item transitioned" → set "To status: Ready"
3. Replace action with Rovo: `creative-claims-agent`
4. Add JQL condition: `project = AIGO AND issuetype = "Creative Request"`
5. Save

For rule 5 (Weekly Readout — trigger fix needed):
1. Open rule 10022499
2. Click trigger → change to "Scheduled" → CRON expression: `0 0 8 ? * MON` → Timezone: America/New_York
3. Replace action with Rovo: `weekly-readout-agent`
4. Save (no JQL condition needed — agent uses internal JQL search)

## Enable Rules (after editing, one at a time)

Safety protocol per `policies/safe-mutations.md`:
1. Enable one rule at a time
2. Trigger on a seed issue to capture audit log before enabling others
3. Capture audit log to `evidence/automation/<rule-name>-audit.md`

Enable via UI: open rule → toggle "Enabled" in top right → confirm.

Seed issues for trigger testing:
- Rule 1 (Intake Triage): create a new AIGO issue → rule fires on creation
- Rule 2 (Employer Launch): create an "Employer Launch" type issue
- Rule 3 (Experiment Spec): create an "Experiment" type issue
- Rule 4 (Creative Claims): transition a "Creative Request" issue to Ready
- Rule 5 (Weekly Readout): manually trigger or wait for Monday 8AM ET

## Audit Log Evidence

After each rule fires, capture audit log:
1. Open rule → "Audit log" tab
2. Find the most recent execution
3. Record: execution ID, timestamp, trigger event, action result, agent response (if visible)
4. Write to `evidence/automation/<rule-name>-audit.md`

Template:
```markdown
# <Rule Name> — Automation Audit Log

Rule ID: <id>
Date: <YYYY-MM-DD>
Trigger: <event>
Seed issue: <AIGO-N>

## Execution
- Status: SUCCESS / FAILED
- Execution ID: <id>
- Timestamp: <ISO>
- Agent invoked: <agent-name>
- Agent response summary: <...>

## Verdict: PASS / FAIL
```

## API Discovery Notes (what doesn't work via REST)

From T-M3-02 extended testing — these components return HTTP 500 via the internal API:
- `jira.rovo.agent.action` — Rovo action must be set via UI
- `jira.jql.condition` — JQL condition must be set via UI
- `jira.scheduled.trigger` CRON — CRON trigger must be set via UI
- `toStatus` filter in transitioned trigger — must be set via UI

What DOES work via API: rule creation, state (DISABLED/ENABLED), basic trigger type.

## Verification

After all 5 rules are enabled and audited:
```bash
# Verify all 5 rules are enabled
curl -s -b cookies.txt \
  "https://myhealthcaresite.atlassian.net/gateway/api/automation/internal-api/jira/76683cc1-6501-400f-8b59-01eaad4418d2/pro/rest/GLOBAL/rules" \
  | jq '.values[] | {id, name, state}'
```
Expected: all 5 rules `"state": "ENABLED"`.
