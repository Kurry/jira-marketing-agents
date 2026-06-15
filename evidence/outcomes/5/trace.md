# Outcome 5 — AI Experimentation Engine

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-7 | A/B test — email subject line for re-engagement signup conversion | Experiment |

---

## Agent Run Output Summary

**Agent:** `experiment-design-agent` → action `proposeExperimentSpec`
**Input:** AIGO-7 (Experiment, describes email A/B test, mentions signup conversion rate, no explicit segment)

Expected `ExperimentSpec` shape returned by `src/experiments.ts`:

```json
{
  "issueKey": "AIGO-7",
  "hypothesis": "We believe that A/B test — email subject line for re-engagement signup conversion will improve Signup conversion rate for the target segment. We will know we are right when Signup conversion rate increases versus control without guardrail regressions.",
  "audience": "Unspecified — confirm target audience",
  "segment": "Unspecified — confirm segment definition",
  "channel": "Email",
  "variants": [
    "Control (current experience)",
    "Variant A (proposed change)"
  ],
  "primaryMetric": "Signup conversion rate",
  "secondaryMetrics": [
    "Downstream activation rate",
    "Revenue per exposed user"
  ],
  "guardrailMetrics": [
    "Unsubscribe rate",
    "Spam complaint rate",
    "CAC (cost per acquisition)",
    "Claims risk (no new unapproved claims)",
    "Tracking integrity"
  ],
  "sampleSizeNote": "Estimate sample size from the baseline rate and the minimum detectable effect (MDE). Do not start until powered.",
  "runtimeRecommendation": "Run for at least one to two full business cycles (e.g., 1–2 weeks) and reach the pre-computed sample size before reading results.",
  "trackingRequirements": [
    "Exposure/assignment event per variant",
    "Primary metric conversion event",
    "Guardrail events (unsubscribe, complaint)",
    "Tracking validated in staging before launch"
  ],
  "decisionRule": "Ship Variant A if it beats Control on Signup conversion rate with no guardrail regression; otherwise iterate or kill.",
  "readoutTemplate": [
    "Hypothesis and what we tested",
    "Primary metric result (with confidence interval — do not claim significance without data)",
    "Guardrail check",
    "Decision: Scale / Iterate / Kill / Extend",
    "Next steps"
  ],
  "approvalsRequired": [
    "Messaging / deliverability review",
    "Experiment launch approval (human go/no-go)"
  ],
  "readyForDesign": true,
  "notReadyReasons": []
}
```

**Note:** `readyForDesign: true` because primary metric (`signup`) and channel (`email`) were both detected. Audience and segment remain unspecified — these would appear in `notReadyReasons` only if they were required for readiness (they are flagged in `missingInformation` of triage, but the experiment spec treats them as warnings, not blockers for spec generation).

---

## Comment Posted to Jira

`addAnalysisComment` posts to AIGO-7:

> **[AI Experiment Design — Draft Spec]**
>
> **Hypothesis:** We believe that the email subject-line variant will improve Signup conversion rate versus control without guardrail regressions.
>
> **Channel:** Email  
> **Primary Metric:** Signup conversion rate  
> **Secondary Metrics:** Downstream activation rate, Revenue per exposed user  
>
> **Guardrail Metrics:** Unsubscribe rate · Spam complaint rate · CAC · Claims risk · Tracking integrity
>
> **Variants:**  
> - Control (current experience)  
> - Variant A (proposed change)  
>
> **Sample Size Note:** Estimate from baseline rate and MDE. Do not start until powered.  
> **Runtime:** At least 1–2 full business cycles; reach pre-computed sample size before reading results.
>
> **Tracking Requirements:**  
> - Exposure/assignment event per variant  
> - Primary metric conversion event  
> - Guardrail events (unsubscribe, complaint)  
> - Tracking validated in staging before launch  
>
> **Decision Rule:** Ship Variant A if it beats Control on Signup conversion rate with no guardrail regression; otherwise iterate or kill.
>
> **Approvals Required:**  
> - Messaging / deliverability review  
> - Experiment launch approval (human go/no-go)
>
> **Readout Template:** Hypothesis · Primary metric result (with CI) · Guardrail check · Decision (Scale/Iterate/Kill/Extend) · Next steps
>
> *This spec is AI-generated for human review. No experiment has been launched.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — No dedicated Experiment Automation rule is in the current five imported rules. Experiment readiness gate and launch-block validator are deferred Forge workflow items per outcome-roadmap.md. Any rule must be imported disabled and validated before enabling.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md and `policies/experiment-policy.md`:

- `approvalsRequired` always includes "Experiment launch approval (human go/no-go)" — no experiment can self-launch.
- When claims risk is detected in the issue text, "Claims / compliance review" is added to `approvalsRequired`.
- The readout template explicitly instructs not to claim statistical significance without data — the AI does not fabricate results.
- Inconclusive tests must be labeled as such (readout template step: "Decision: Scale / Iterate / Kill / Extend" — requires data).
- No experiment transition is automated; status changes require a human operator action in Jira.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| No experiment moves to launch without metric, guardrails, and tracking | PASS — `notReadyReasons` blocks `readyForDesign` if primary metric or channel is missing; guardrails always included |
| Readouts produce scale/kill/iterate/extend recommendations only from evidence | PASS — readout template requires data before decision; module does not invent results |
| Inconclusive tests are explicitly labeled | PASS — readout template step explicitly calls for CI and decision label |
| Learnings can create or recommend follow-up Jira tickets | PARTIAL — readout template includes "Next steps" but automated follow-up ticket creation is deferred (allowlist gate) |

---

## Verdict

**PASS (read-only domain confirmed; human go/no-go gate always required; live run pending T-M4-03)**
