# Skill: Weekly Growth Readout (+ Decision Extraction, Blocked-Work Detection, Risk Rollup, Action List)

**Status:** ✅ Implemented
**Used by:** Weekly Readout Agent
**Implementation:** `src/readout.ts` (`buildWeeklyReadout`) · action `generateWeeklyReadout`

## Purpose

Summarize the last N days of AIGO issues into an executive-ready readout with the
top actions for leadership.

## Behavior

Over a JQL result set (default `project = AIGO AND updated >= -7d ORDER BY
updated DESC`), buckets issues into completed, blocked, decisions needed, claims
bottlenecks, experiments to call, employer launch risks, and high-impact funnel
issues — keyed off status, issue type, and labels. Builds a `topThreeActions`
list prioritizing unblock → decide → clear-claims → call-experiment.

## Inputs

```ts
{ jql: string; days?: number }
```

## Output (`WeeklyReadout`, abbreviated)

```jsonc
{
  "period": "Last 7 day(s)",
  "completedWork": ["AIGO-1: Shipped new landing page"],
  "blockedWork": ["AIGO-3: Claims review for SMS"],
  "decisionsNeeded": ["AIGO-5: Q3 budget decision"],
  "claimsBottlenecks": ["AIGO-3: Claims review for SMS"],
  "experimentsToCall": ["AIGO-2: Email experiment"],
  "employerLaunchRisks": ["AIGO-4: Acme launch"],
  "highImpactFunnelIssues": [],
  "topThreeActions": ["Unblock — AIGO-3: …", "Decide — AIGO-5: …", "Clear claims review — AIGO-3: …"]
}
```

## Safety

Read-only summary. Frames experiment calls as recommendations; does not claim
significance without data. Designed to run on a schedule and post via an
explicit Automation comment/issue-create step.
