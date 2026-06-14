# Skill: Experiment Readout & Decision Recommendation

**Status:** 🟡 Partial (readout template + decision vocabulary implemented; evidence-based call is prompt-driven over provided data)
**Used by:** Experiment Design Agent, Weekly Readout Agent
**Implementation:** `src/experiments.ts` (`readoutTemplate`, `decisionRule`), `src/readout.ts` (`experimentsToCall`), `DecisionRecommendation` in `src/types.ts`

## Purpose

Convert experiment evidence into a Scale / Kill / Iterate / Extend / Needs review
recommendation and a structured readout.

## Behavior

- The experiment spec ships a **readout template** (hypothesis, primary metric
  result with confidence interval, guardrail check, decision, next steps) and a
  pre-committed **decision rule**.
- The weekly readout surfaces `experimentsToCall` (open experiments needing a
  decision) for human attention.
- The decision call itself (`Scale|Kill|Iterate|Extend|Needs review`) is made by
  the agent **against data the human supplies** — it is not auto-computed from
  Jira, because Jira does not hold experiment results.

## Inputs

- Experiment context (`issueKey`) and, for the call, the measured results.

## Output (decision shape)

```jsonc
{
  "decision": "Scale|Kill|Iterate|Extend|Needs review",
  "rationale": "Beat control on primary metric with no guardrail regression.",
  "guardrailCheck": "No unsubscribe/complaint regression",
  "nextSteps": ["Roll out to 100%", "Monitor guardrails for one cycle"]
}
```

## Safety

Never claims statistical significance without data. The recommendation is for a
human to confirm; the app does not scale or kill anything itself.
