# Automation Rule Audit

**Audited by:** automation-eng  
**Date:** 2026-06-14  
**Source files:** `automation/rules/*.json` (excluding `aigo-automation-ruleset.json` bundle)

---

## Summary Table

| Rule | Trigger | Agent Key Placeholder | Other Placeholders | Enabled? | Safety Verdict |
|------|---------|----------------------|-------------------|----------|---------------|
| AIGO – Intake Triage | `jira.issue.event.trigger:created` | `__TRIAGE_AGENT_KEY__` | `__PROJECT_ID__` (×2 in ruleScope), `__PROJECT_KEY__` (JQL), `__ACTOR_ACCOUNT_ID__`, `{{issue.key}}`, `{{agentResponse}}` | `"state": "DISABLED"` → **false** | SAFE — read-only analysis; posts comment only; no field changes |
| AIGO – Creative Claims Review | `jira.issue.event.trigger:transitioned` (toStatus: Ready) | `__CREATIVE_CLAIMS_AGENT_KEY__` | `__PROJECT_ID__` (×2), `__PROJECT_KEY__` (JQL), `__ACTOR_ACCOUNT_ID__`, `{{issue.key}}`, `{{agentResponse}}` | `"state": "DISABLED"` → **false** | SAFE — agent prompt explicitly says "Never approve claims"; comment body labels it "not an approval"; transition to "Claims Review" is routing only; human owns approval |
| AIGO – Experiment Spec | `jira.manual.or.event.trigger` (created OR transitioned to AI Triage) | `__EXPERIMENT_DESIGN_AGENT_KEY__` | `__PROJECT_ID__` (×2), `__PROJECT_KEY__` (JQL), `__ACTOR_ACCOUNT_ID__`, `{{issue.key}}`, `{{agentResponse}}` | `"state": "DISABLED"` → **false** | SAFE — posts draft spec only; comment labels it "launch requires human go/no-go"; no launch step |
| AIGO – Employer Launch Plan | `jira.issue.event.trigger:created` | `__EMPLOYER_LAUNCH_AGENT_KEY__` | `__PROJECT_ID__` (×2), `__PROJECT_KEY__` (JQL), `__ACTOR_ACCOUNT_ID__`, `{{issue.key}}`, `{{agentResponse}}` | `"state": "DISABLED"` → **false** | SAFE — posts workback plan only; comment says "analysis only"; prompt says "Go/no-go and claims approval are human steps" |
| AIGO – Weekly Growth Readout | `jira.scheduled.trigger` (CRON: Mon 08:00 America/New_York) | `__WEEKLY_READOUT_AGENT_KEY__` | `__PROJECT_ID__` (×2 in ruleScope), `__PROJECT_KEY__` (JQL + issue.create), `__ACTOR_ACCOUNT_ID__`, `{{agentResponse}}`, `{{now.format(...)}}` | `"state": "DISABLED"` → **false** | SAFE — creates Decision Memo issue (read/write but not launch); analysis only; no campaign send or audience mutation |

---

## Agent Key Placeholder → Expected Manifest Key Mapping

| Placeholder | Expected `manifest.yml` key |
|------------|---------------------------|
| `__TRIAGE_AGENT_KEY__` | `growth-triage-agent` |
| `__CREATIVE_CLAIMS_AGENT_KEY__` | `creative-claims-agent` |
| `__EXPERIMENT_DESIGN_AGENT_KEY__` | `experiment-design-agent` |
| `__EMPLOYER_LAUNCH_AGENT_KEY__` | `employer-launch-agent` |
| `__WEEKLY_READOUT_AGENT_KEY__` | `weekly-readout-agent` |

All five keys are present in `manifest.yml` under `modules.rovo:agent`.

---

## Instance Config Placeholders

| Placeholder | Source in `instances/aigo.example.json` | Status |
|------------|----------------------------------------|--------|
| `__PROJECT_KEY__` | `projectKey: "AIGO"` | Present |
| `__PROJECT_ID__` | Not in example config | Missing — warn at render time |
| `__ACTOR_ACCOUNT_ID__` | Not in example config | Missing — warn at render time |

---

## Safety Checks

### 1. "Approve" step audit
No rule in any of the 5 template files contains:
- A step with `"type": "APPROVE"`
- An `"action": "approve"` field
- Any transition to an "Approved" status

The creative-claims rule routes to "Claims Review" (gated by a CONTAINS condition on "Risky"), with a `_comment` explicitly stating: `"Optional routing only. Human still owns the approval decision."` This is routing, not approval. **PASS.**

### 2. "Launch" step audit
No rule contains a send, deploy, or publish step. No action type in any rule triggers campaign delivery or audience mutation. **PASS.**

### 3. Enabled state
All 5 rules use `"state": "DISABLED"`. Per CRITICAL RULES, rules must not be enabled without safety-reviewer pre-approval AND lead plan-approval. **PASS — none are enabled.**

### 4. Creative-claims "Never approve" language
The `creative-claims.json` prompt field contains: `"Never approve claims."` The comment body says: `"analysis only; not an approval"`. **PASS.**

---

## Findings / Concerns

1. **`__PROJECT_ID__` and `__ACTOR_ACCOUNT_ID__` missing from example config** — the render script must warn (not fail hard) when these are absent, since the example config is intentionally incomplete. Real deployments must supply both values.
2. **`weekly-readout.json` creates a Jira issue** (`jira.issue.create`) — this is the only rule that writes a new issue rather than just a comment. This is acceptable (Decision Memo = analysis artifact), but should be noted for review.
3. **No `{{...}}`-style tokens in the rule templates** — templates use `__UPPER_SNAKE__` convention for config substitution, not `{{}}`. The `{{issue.key}}`, `{{agentResponse}}`, and `{{now.format(...)}}` tokens are Jira Automation smart values evaluated at runtime by Jira, not by our render script. The render script must NOT replace these.

---

*Verification matrix: VM-AUTOMATION-RENDER, VM-AUTOMATION-IMPORT, VM-AUTOMATION-VALIDATE*
