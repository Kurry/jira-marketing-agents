# VM-ROVO-VISIBILITY - Rovo Manifest/Install Check
Date: 2026-06-15
VM row: VM-ROVO-VISIBILITY
Status: manifest/install verified; actual Rovo UI/API visibility pending

## Pending UI Confirmation Path

myhealthcaresite.atlassian.net -> Apps -> Rovo -> Agents

Spot-check URL: https://myhealthcaresite.atlassian.net/jira/apps/rovo/agents

This evidence file does not treat manifest/install status as proof that the
agents are visible in the Rovo UI. The CLI check verifies only:

1. `manifest.yml` declares the expected 19 `rovo:agent` entries.
2. `forge install list` reports the target Jira site as `Up-to-date`.

Actual Rovo visibility still requires UI confirmation or a public Atlassian API
listing if Atlassian exposes one for this tenant.

## Required Agents (19 from manifest.yml)

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

## CLI Evidence - check-rovo-visibility.cjs output (2026-06-15)

```
=== Rovo Manifest/Install Check ===
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

Check 2: forge install list - verify site "myhealthcaresite.atlassian.net" is Up-to-date
  PASS: Site "myhealthcaresite.atlassian.net" status is Up-to-date

=== Rovo Manifest/Install Summary ===
PASS: manifest declares 19 rovo:agent entries and Forge reports myhealthcaresite.atlassian.net Up-to-date.
This proves only manifest agent count plus Forge installation status.
UI/API confirmation is pending for actual Rovo visibility.

Confirmation step: inspect the Rovo UI, or use a public Atlassian agent
listing API if Atlassian exposes one for this tenant.
  https://myhealthcaresite.atlassian.net/jira/apps/rovo/agents
```

## Agent Count Verification

`scripts/check-rovo-visibility.cjs` parsed **19** `rovo:agent` keys from
`manifest.yml` (matches expected count).

`forge install list` (captured evidence/gates/forge-install.log):
- Installation ID: 7e844a39-2e55-418f-93ad-7ae4dc8d9695
- Environment: development
- Site: myhealthcaresite.atlassian.net
- App version: 2
- Status: **Up-to-date**

App id in manifest.yml: `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`

`forge logs -e development --since 1h` (post-deploy): empty; no handler errors.

## Verdict: PASS for Manifest/Install Only (CLI-verified 2026-06-15)

CLI evidence confirms:

1. `manifest.yml` declares exactly 19 `rovo:agent` entries.
2. The app is installed and `Up-to-date` (version 2) on myhealthcaresite.atlassian.net.
3. `npm run check:rovo` exited 0 at 2026-06-15T10:xx UTC.

This is not a Rovo UI visibility verdict. The agents still need confirmation in
the Rovo UI, or through a public Atlassian API listing if one is available.

Operator spot-check URL:
https://myhealthcaresite.atlassian.net/jira/apps/rovo/agents
