# Skill: Experiment Design (Spec + Variant Matrix + Metric Mapping + Guardrails + Feasibility)

**Status:** ✅ Implemented
**Used by:** Experiment Design Agent, Creative (variant matrix)
**Implementation:** `src/experiments.ts` (`proposeExperimentSpec`) · action `proposeExperimentSpec` · policy [`../policies/experiment-policy.md`](../policies/experiment-policy.md)

## Purpose

Turn an experiment request into a complete, decision-ready spec — and flag it
"not ready" when measurement is missing.

## Behavior

- **Metric mapping:** detects a measurable primary metric (signup conversion,
  CTR, CVR, open rate, activation, retention, revenue) from the text.
- **Variant matrix:** Control + Variant A (extendable), each with tracking.
- **Guardrails (always):** unsubscribe, complaint rate, CAC, claims risk,
  tracking integrity.
- **Feasibility check:** no measurable primary metric, unspecified channel, or
  too little detail → `readyForDesign: false` with `notReadyReasons`.
- **Approvals:** experiment launch (human go/no-go) always; claims/compliance
  when risky language detected; messaging review for email/SMS.

## Inputs

- `issueKey: string`

## Output (`ExperimentSpec`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-123",
  "hypothesis": "...", "audience": "...", "segment": "...", "channel": "Email",
  "variants": ["Control (current experience)", "Variant A (proposed change)"],
  "primaryMetric": "Signup conversion rate",
  "guardrailMetrics": ["Unsubscribe rate", "...", "Tracking integrity"],
  "decisionRule": "Ship Variant A if it beats Control … otherwise iterate or kill.",
  "approvalsRequired": ["Experiment launch approval (human go/no-go)"],
  "readyForDesign": true, "notReadyReasons": []
}
```

## Safety

Designs only — never launches. Does not claim statistical significance unless
data is provided.
