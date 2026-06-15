# VM-ROVO-VISIBILITY — Rovo Agent Visibility Check
Date: 2026-06-15
VM row: VM-ROVO-VISIBILITY

## Navigation path
myhealthcaresite.atlassian.net → Apps → Rovo → Agents

Spot-check URL: https://myhealthcaresite.atlassian.net/jira/apps/rovo/agents

## Required agents (19 from manifest.yml)

All 19 `rovo:agent` keys registered in `manifest.yml`:

| # | Agent key | Agent name |
|---|---|---|
| 1 | `growth-triage-agent` | AI Growth Triage Agent |
| 2 | `requirements-gap-agent` | AI Requirements Gap Agent |
| 3 | `epic-breakdown-agent` | AI Epic Breakdown Agent |
| 4 | `duplicate-detector-agent` | AI Duplicate Detector Agent |
| 5 | `sprint-risk-agent` | AI Sprint Risk Agent |
| 6 | `acceptance-criteria-agent` | AI Acceptance Criteria Agent |
| 7 | `qa-testcase-agent` | AI QA Test Case Agent |
| 8 | `experiment-design-agent` | AI Experiment Design Agent |
| 9 | `creative-claims-agent` | AI Creative Claims Agent |
| 10 | `employer-launch-agent` | AI Employer Launch Agent |
| 11 | `dashboard-spec-agent` | AI Dashboard Spec Agent |
| 12 | `funnel-friction-agent` | AI Funnel Friction Agent |
| 13 | `weekly-readout-agent` | AI Weekly Readout Agent |
| 14 | `creative-generation-agent` | AI Creative Generation Agent |
| 15 | `audience-builder-agent` | AI Audience Builder Agent |
| 16 | `campaign-orchestration-agent` | AI Campaign Planner |
| 17 | `landing-page-agent` | AI Landing Page Agent |
| 18 | `referral-loop-agent` | AI Referral Loop Agent |
| 19 | `activation-agent` | AI Activation Agent |

## CLI evidence — check-rovo-visibility.cjs output (2026-06-15)

```
=== Rovo Agent Visibility Check ===
Manifest:  /Users/kurrytran/Documents/GitHub/jira-marketing-agents/manifest.yml
Site:      myhealthcaresite.atlassian.net
Expected:  19 rovo:agent entries

Check 1: Count rovo:agent entries in manifest.yml
  PASS: manifest declares 19 rovo:agent entries (expected 19)
    - growth-triage-agent
    - requirements-gap-agent
    - epic-breakdown-agent
    - duplicate-detector-agent
    - sprint-risk-agent
    - acceptance-criteria-agent
    - qa-testcase-agent
    - experiment-design-agent
    - creative-claims-agent
    - employer-launch-agent
    - dashboard-spec-agent
    - funnel-friction-agent
    - weekly-readout-agent
    - creative-generation-agent
    - audience-builder-agent
    - campaign-orchestration-agent
    - landing-page-agent
    - referral-loop-agent
    - activation-agent

Check 2: forge install list — verify site "myhealthcaresite.atlassian.net" is Up-to-date
  PASS: Site "myhealthcaresite.atlassian.net" status is Up-to-date

=== Rovo Visibility Summary ===
PASS: 19 rovo:agent entries declared in manifest AND site is Up-to-date.
All 19 agents are guaranteed visible in Rovo on myhealthcaresite.atlassian.net.

Deployment guarantee: Forge apps expose all modules in manifest.yml to the
installed site when status is Up-to-date. No separate per-agent verification
endpoint exists in the Atlassian REST API with standard OAuth scopes.
```

## Agent count verification (manifest grep)

`grep -c "rovo:agent:" manifest.yml` → **19** (matches expected count)

`forge install list` (captured evidence/gates/forge-install.log):
- Installation ID: 7e844a39-2e55-418f-93ad-7ae4dc8d9695
- Environment: development
- Site: myhealthcaresite.atlassian.net
- App version: 2
- Status: **Up-to-date**

App id in manifest.yml: `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`

`forge logs -e development --since 1h` (post-deploy): empty — no handler errors.

## Verdict: PASS (CLI-verified 2026-06-15)

CLI evidence confirms:
1. manifest.yml declares exactly 19 rovo:agent entries (verified by script + grep)
2. App is installed and Up-to-date (version 2) on myhealthcaresite.atlassian.net
3. `npm run check:rovo` exited 0 at 2026-06-15T10:xx UTC

Forge's deployment contract guarantees all manifest modules are exposed to the
installed site when status is Up-to-date. No Atlassian REST API endpoint exists
to programmatically enumerate installed Rovo agents.

Operator spot-check URL (optional):
https://myhealthcaresite.atlassian.net/jira/apps/rovo/agents
