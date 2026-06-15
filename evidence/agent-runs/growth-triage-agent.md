# Agent Run Evidence — AI Growth Triage Agent
Task: T-M4-01
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD (to be assigned from T-M2-07 output; likely AIGO-1 or AIGO-2 based on smoke test)

## Input
- Issue summary: TBD
- Issue type: TBD (seed issues include Growth Task, Experiment, Employer Launch, etc.)
- Issue status: TBD

## Expected output (from prompt + src/triage.ts module logic)

The agent calls `getIssueContext` then `classifyGrowthIssue`. Based on src/triage.ts:

- **Clean summary** — trimmed issue summary with no extra whitespace.
- **Recommended issue type** — one of: `Growth Task`, `Experiment`, `Creative Request`, `Claims Review`,
  `Dashboard Request`, `Automation Request`, `Employer Launch`, `Segmentation Request`,
  `Signup Funnel Issue`, `Insight / Research Brief`. Derived from `ISSUE_TYPE_BY_AREA` via keyword
  matching against AREA_SIGNALS (9 areas: Signup Funnel, Claims, Creative, Experiment, Dashboard,
  Employer Launch, Targeting, Automation, Research, Unknown).
- **Workflow area** — one of the 9 WorkflowArea values.
- **Priority (P0–P3)** — derived from `scorePriority()` (labels, issue type, due date).
- **Risk level** — Low / Medium / High / Blocked. High if P0/P1 or claims risk is Risky/Prohibited.
  Blocked if text contains "blocked", "blocker", "cannot proceed", "waiting on".
- **Claims risk** — Safe / Needs substantiation / Risky / Prohibited. Scanned by `scanClaimsRisk()`.
  For AIGO-3 ("guaranteed diabetes reversal"), expect Risky or Prohibited.
- **Missing information** — items from BASE_CHECKS (`Goal`, `Owner`, `Due date`, `Acceptance criteria`)
  plus area-specific extras (e.g. Experiment adds `Primary metric`, `Audience / segment`, `Channel`,
  `Decision rule`; Employer Launch adds `Launch date`, `Eligibility file`, `Segment / suppression logic`).
- **Suggested owner group** — from OWNER_GROUPS config map keyed by WorkflowArea.
- **Recommended next status** — `Needs Human Review` if ambiguous, high-risk, or has human approvals;
  `Needs Info` if missing info; `Ready` if clean.
- **Acceptance criteria** — 2–3 bullets from `baselineAcceptanceCriteria(area)`. E.g. for Experiment:
  hypothesis/metric/decision-rule documented; tracking validated; guardrails defined.
- **Suggested subtasks** — area-specific from `baselineSubtasks()`. E.g. for Experiment:
  Define spec, Implement tracking, QA tracking, Launch & monitor, Readout & decision.
- **Human approvals required** — Compliance/medical claims review (if claims risk), Launch go/no-go
  (if Employer Launch), Audience/suppression approval (if Targeting or "suppression" in text),
  Production signup-flow approval (if Signup Funnel).
- **Safety**: agent NEVER changes the issue. All output is analysis only.

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
