---
name: jira-automation-browser-edit
description: >
  Use this skill whenever you need to inspect, verify, or edit Jira Automation
  rules in the flow builder using browser automation (Claude in Chrome). Covers
  navigating the rule list, reading trigger/condition/action structure, adding or
  verifying JQL scope conditions, diagnosing "Error loading step" errors, and
  understanding which steps require Rovo/AI activation. Trigger this skill when the
  user asks to check automation rules, add JQL filters to flows, see why a rule
  fails to render, or audit rule configurations across multiple rules.
---

# Jira Automation Flow Builder — Browser Edit Skill

Automates inspection and editing of Jira Automation rules via the flow builder
UI at `{site}/jira/settings/automation`. Relies on Claude in Chrome browser
tools.

## Setup

Load browser tools first if deferred:

```
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page
```

Target site for this repo: `myhealthcaresite.atlassian.net`  
Global automation URL: `https://myhealthcaresite.atlassian.net/jira/settings/automation#/rule-list`

## Critical Navigation Rule

The automation UI is a single-page app (SPA). Changing the hash fragment
(`#/rule/{id}`) while already on a rule page does **not** reload the flow
builder — you'll keep seeing the previous rule's content.

**Always navigate between rules this way:**
1. Click the `←` back button in the flow builder header
2. Wait for the rule list to load
3. Click the rule name from the list

Never jump directly between rules by editing the URL hash.

## Inspecting a Rule

1. Navigate to the rule list
2. Click the target rule name
3. Take a screenshot — the flow builder renders the steps vertically:
   - **Trigger** (top): lightning bolt icon, e.g. "Work item created"
   - **Condition(s)**: magnifying glass icon, e.g. "If work item matches JQL"
   - **Action(s)**: chat/pencil icon, e.g. "Add comment to work item"
4. Zoom in on the canvas to count steps and read JQL values

## Adding a JQL Scope Condition

Use this pattern to insert a condition between two existing steps:

1. Hover over the connector line between the step above and below where the
   condition should go — a `+` circle appears
2. Click the `+` connector — a "New step" panel opens on the right
3. Click **Condition** in the right panel
4. Click **JQL condition**
5. Triple-click the JQL input field to select any placeholder text
6. Type the JQL (e.g. `project = AIGO AND issuetype = Experiment`)
7. Click **Next**
8. Click **Save** (top-right of the flow builder)
9. Wait for the "Flow updated" toast — confirms the save succeeded

JQL per AIGO rule:
| Rule | JQL |
|---|---|
| AIGO – Intake Triage | `project = AIGO` |
| AIGO – Employer Launch Plan | `project = AIGO AND issuetype = "Employer Launch"` |
| AIGO – Experiment Spec | `project = AIGO AND issuetype = Experiment` |
| AIGO – Creative Claims Review | `project = AIGO AND issuetype = "Creative Request"` |
| AIGO – Weekly Growth Readout | No JQL condition needed |

## Diagnosing "Error loading step"

If the flow builder shows **"Error loading step — An unknown error occurred.
Please reload and try again."**:

1. **Check the rule description** in the right panel — if it says "TRIGGER
   PLACEHOLDER" or "connect Rovo first", the rule has a component type
   (`jira.rovo.agent.action` or `jira.issue.event.trigger:transitioned`) that
   Jira cannot render until the org/site can use the target action/trigger.
2. Hard reload (Cmd+Shift+R) — if the error persists after reload, it's a
   configuration or eligibility limitation, not a transient error.
3. Check the rendered JSON in `automation/rules/rendered/<rule>.json` to confirm
   the correct trigger and JQL are present even though the UI can't display them.
4. Document as BLK-02-gated and move on — no UI edit is possible until Rovo/AI
   activation eligibility is resolved.

**Which steps can cause this error when Rovo/AI is not active:**
- `jira.rovo.agent.action` — "Use agent (Rovo AI)" action
- `jira.issue.event.trigger:transitioned` — "Work item transitioned" trigger
- `jira.scheduled.trigger` — Scheduled/CRON trigger (may also fail to render)

## Verifying No Duplicate Conditions

After adding a JQL condition, zoom in on the flow canvas and count JQL condition
blocks. There should be exactly one per rule (unless intentional branching).
If duplicates appear, delete the extra by clicking the condition block → trash
icon in the top-right of the card.

## Checking the Rendered JSON as Ground Truth

When the UI can't render a rule, verify configuration from the repo:

```bash
cat automation/rules/rendered/<rule>.json | python3 -m json.tool
```

Look for:
- `trigger.type` — should match intended trigger event
- components with `"type": "jira.jql.condition"` — confirms JQL is present
- components with `"type": "jira.rovo.agent.action"` — requires Rovo/AI active

## Full Audit Workflow (all 5 AIGO rules)

```
For each rule in [Intake Triage, Employer Launch Plan, Experiment Spec,
                  Creative Claims Review, Weekly Growth Readout]:
  1. Navigate via rule list (not URL hash)
  2. Screenshot the flow canvas
  3. If "Error loading step": check JSON, document as BLK-02-gated
  4. Otherwise: count steps, verify JQL, check for duplicates
  5. Add JQL condition if missing (see table above)
  6. Save and confirm "Flow updated" toast
  7. Back to rule list before opening next rule
```

## Related Resources

- `skills/jira-automation-rovo-setup/SKILL.md` — full runbook for connecting
  Rovo, swapping placeholder actions for Rovo agent calls, and enabling rules
  (requires Rovo/AI active)
- `evidence/blockers.md#BLK-02` — Rovo/AI activation eligibility investigation notes
- `automation/rules/rendered/` — source of truth for intended rule configuration
