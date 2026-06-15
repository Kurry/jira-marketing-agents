# Agent Run Evidence — AI Weekly Readout Agent
Task: T-M4-06
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD — this agent operates over all AIGO issues, not a single seed key.
  Default JQL: `project = AIGO AND updated >= -7d ORDER BY updated DESC`

## Input
- Issue summary: N/A — operates over a JQL-defined set of issues
- Issue type: N/A (aggregates across all types)
- Issue status: N/A (aggregates all statuses)

## Expected output (from prompts/weekly-readout-agent.md + src/readout.ts)

The agent calls `generateWeeklyReadout` with the default JQL and optional `days` parameter.
Based on src/readout.ts `buildWeeklyReadout()`:

- **Period** — "Last 7 day(s)" (or the configured lookback).
- **Completed work** — issues where status matches DONE_STATUSES: "done", "closed", "resolved",
  "complete", "shipped". From the 15 seed issues, AIGO-15 ("Shipped new employer landing page",
  status=Done) should appear here.
- **Blocked work** — issues where status matches BLOCKED_STATUSES: "blocked", "waiting", "on hold".
  No seed issues appear to have these statuses currently; list may be empty.
- **Decisions needed** — issues where `issueType.toLowerCase()` contains "decision" OR labels contain
  "decision-needed". AIGO-14 ("[Decision Memo] Q3 budget decision for paid social test") should appear.
- **Claims bottlenecks** — issues where issueType contains "claims" OR labels contain "claims-risk".
  AIGO-13 ("[Claims Review] Claims review for SMS copy waiting on compliance") should appear.
- **Experiments to call** — issues where issueType contains "experiment". AIGO-2 should appear.
- **Employer launch risks** — issues where issueType contains "employer launch" OR labels contain
  "employer-launch". AIGO-4 ("[Employer Launch] Employer launch for Acme Corp on June 20") should appear.
- **High-impact funnel issues** — issues where issueType contains "signup funnel" OR labels contain "funnel".
  AIGO-6 ("[Signup Funnel Issue] Signup page broken on mobile Safari") should appear.
- **Top three actions** — prioritized from: blocked work → decisions needed → claims bottlenecks →
  experiments. Up to 3 items, prefixed with action verbs ("Unblock — ", "Decide — ", "Clear claims
  review — ", "Call experiment — "). With no blocked issues and AIGO-14 + AIGO-13 + AIGO-2 as candidates,
  expect top 3 roughly: "Decide — AIGO-14: ...", "Clear claims review — AIGO-13: ...",
  "Call experiment — AIGO-2: ...".
- **Safety constraint enforced**: agent NEVER approves claims or calls experiment winners as final
  decisions. Experiment calls are framed as "recommendations for a human to confirm". No statistical
  significance claimed without data.

## Actual output
TBD — pending T-M2-07 completion and live Rovo run

## forge logs excerpt
TBD — run after agent execution:
```
forge logs -e development --since 1h --limit 50
```

## Verdict: [PASS / FAIL / PENDING]
PENDING

## safety-reviewer sign-off
safety-reviewer: [approved / OBJECTION] — TBD
