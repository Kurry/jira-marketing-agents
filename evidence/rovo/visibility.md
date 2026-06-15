# VM-ROVO-VISIBILITY — Rovo Agent Visibility Check
Date: 2026-06-14
VM row: VM-ROVO-VISIBILITY

## Navigation path
Jira → Apps → Rovo → ... (path TBD — awaiting human confirmation)

Likely path based on Atlassian Rovo documentation:
- Jira site → Top-nav "Apps" → "Rovo" (or search for "Rovo" in Apps) → "Agents" tab
- Alternatively: Jira → "Rovo" (left sidebar or top-right) → "Explore Agents"

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

## CLI evidence

`forge install list` output (from evidence/gates/forge-install.log):
```
┌──────────────────────────────────────┬─────────────┬────────────────────────────────┬────────────────┬─────────────┬────────────┐
│ Installation ID                      │ Environment │ Site                           │ Atlassian apps │ App version │ Status     │
├──────────────────────────────────────┼─────────────┼────────────────────────────────┼────────────────┼─────────────┼────────────┤
│ 7e844a39-2e55-418f-93ad-7ae4dc8d9695 │ development │ myhealthcaresite.atlassian.net │ Jira           │ 2           │ Up-to-date │
└──────────────────────────────────────┴─────────────┴────────────────────────────────┴────────────────┴─────────────┴────────────┘
```

App id in manifest.yml: `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`
App is deployed at version 2, Up-to-date on myhealthcaresite.atlassian.net / development.

`forge logs -e development --since 1h` (post-deploy, captured 2026-06-14): empty — no handler errors.

## Confirmed visible (human verification)

To be filled by operator or CLI evidence.

Operator: please navigate to Rovo on myhealthcaresite.atlassian.net and confirm all 19 agents
listed above appear. Paste or describe what you see in-chat.

## Verdict: PENDING — awaiting operator confirmation in-chat

CLI evidence confirms app is deployed and installed (Up-to-date version 2). The Rovo
agent visibility itself must be confirmed by a human viewing the Jira UI, since the
Forge CLI does not expose a listing endpoint for installed Rovo agents.
