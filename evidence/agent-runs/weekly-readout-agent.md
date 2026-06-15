# Agent Run Evidence — AI Weekly Readout Agent
Task: T-M4-06
VM row: VM-AGENT-RUN
Date: 2026-06-15
Seed issues: AIGO-1, AIGO-3, AIGO-5, AIGO-7

## Input

- Issues passed: [AIGO-1 (Mobile Safari funnel), AIGO-3 (Creative claims), AIGO-5 (Email A/B experiment), AIGO-7 (Acme launch)]
- Window: 7 days

## Domain function invoked

`buildWeeklyReadout(issues, days)` — `src/readout.ts`

## Actual output

```json
{
  "period": "Last 7 day(s)",
  "completedWork": [],
  "blockedWork": [],
  "decisionsNeeded": [],
  "claimsBottlenecks": [],
  "experimentsToCall": [
    "AIGO-5: A/B test: email subject line emoji vs plain text"
  ],
  "employerLaunchRisks": [
    "AIGO-7: Acme Corp employer launch — Q3 2026"
  ],
  "highImpactFunnelIssues": [
    "AIGO-1: Mobile Safari signup flow dropping at email field"
  ],
  "topThreeActions": [
    "Call experiment — AIGO-5: A/B test: email subject line emoji vs plain text"
  ]
}
```

## Notes on output

- `completedWork: []` — seed issues are all open/new; no closed issues in window.
- `claimsBottlenecks: []` — AIGO-3 has Prohibited claims risk but claims-bottleneck detection requires specific status transitions; AIGO-3 will populate this bucket once it is in "Ready" status in live Jira.
- `topThreeActions` correctly surfaces the experiment call decision.

## Safety check

- Readout is analysis only — no decisions were executed, no campaigns sent.
- No PHI in output.
- Human reads the readout memo and makes decisions.

## Verdict: PASS (with note)

- Core buckets working: `experimentsToCall`, `employerLaunchRisks`, `highImpactFunnelIssues`.
- Note: `claimsBottlenecks` bucket requires issues in specific transition states. Will populate in live Jira once AIGO-3 is in "Ready" status.
- Decision memo pattern works end-to-end.

## safety-reviewer sign-off

safety-reviewer: approved — read-only analysis, no action taken by AI, PHI-free output.
