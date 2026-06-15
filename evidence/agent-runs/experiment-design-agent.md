# Agent Run Evidence — AI Experiment Design Agent
Task: T-M4-03
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD — strong candidate: AIGO-2 ("[Experiment] Email subject line test to lift signup conversion rate")

## Input
- Issue summary: TBD (likely "[Experiment] Email subject line test to lift signup conversion rate")
- Issue type: Experiment
- Issue status: To Do

## Expected output (from prompts/experiment-design-agent.md + src/experiments.ts)

The agent calls `getIssueContext` then `proposeExperimentSpec`. Based on src/experiments.ts:

- **Hypothesis** — built by `buildHypothesis()`: "We believe that [issue summary] will improve [primaryMetric]
  for the target segment. We will know we are right when [metric] increases versus control without
  guardrail regressions."
- **Audience** — detected from text via `detectAudience()`. For a signup experiment, likely
  "New / prospective users" (if "new user"/"prospect" present) or "Unspecified — confirm target audience".
- **Segment** — detected from text via `detectSegment()`. Likely "Unspecified — confirm segment definition"
  unless a `segment: <name>` pattern appears.
- **Channel** — detected by `detectChannel()`. For "email subject line" issue, expect `Email`.
- **Variants** — always `["Control (current experience)", "Variant A (proposed change)"]`.
- **Primary metric** — detected by `detectPrimaryMetric()`. For "signup conversion rate" in summary/description,
  expect `Signup conversion rate` or `Email open rate`. If undetectable, flagged as NOT READY.
- **Secondary metrics** — always `["Downstream activation rate", "Revenue per exposed user"]`.
- **Guardrail metrics** — always the 5 standard guardrails: Unsubscribe rate, Spam complaint rate,
  CAC, Claims risk (no new unapproved claims), Tracking integrity.
- **Sample size note** — standard text about baseline rate and MDE.
- **Runtime recommendation** — 1–2 full business cycles / weeks, reach pre-computed sample size.
- **Tracking requirements** — 4 standard items: exposure event, primary metric conversion event,
  guardrail events, staging validation.
- **Decision rule** — "Ship Variant A if it beats Control on [primaryMetric] with no guardrail
  regression; otherwise iterate or kill." (or NOT READY if no primary metric).
- **Readout template** — 5 bullets: hypothesis, primary metric result (with CI, no false significance),
  guardrail check, decision, next steps.
- **Approvals required** — for Email channel: "Messaging / deliverability review" + "Experiment
  launch approval (human go/no-go)". Claims review added if risky language detected.
- **Ready for design** — `true` if primary metric found, channel specified, and issue has enough detail.
  For AIGO-2, expect `true` (email + signup conversion rate both detectable).
- **Safety**: agent NEVER launches experiments. "Experiment launch always requires human go/no-go."

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
