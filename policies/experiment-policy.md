# Experiment Policy

Governs how the Experiment Design Agent drafts experiments and how results are
called. The app **designs** experiments; humans **launch** and **decide**.

## Readiness

An experiment is **not ready** unless it has:

- A measurable **primary metric**.
- A defined **audience / segment** and **channel**.
- Enough detail to write a hypothesis and a decision rule.

If any are missing, the agent marks the spec "not ready" and lists the reasons.

## Guardrails (always included)

- Unsubscribe rate
- Spam complaint rate
- CAC (cost per acquisition)
- Claims risk (no new unapproved claims)
- Tracking integrity

## Measurement hygiene

- Estimate sample size from the baseline rate and minimum detectable effect
  before starting; do not start underpowered.
- Run for at least one to two full business cycles.
- **Do not claim statistical significance unless data is provided.** Report
  results with appropriate uncertainty.

## Decision rule

Each experiment must state a decision rule up front, e.g. "Ship Variant A if it
beats Control on the primary metric with no guardrail regression; otherwise
iterate or kill." The agent recommends a call; a human confirms Scale / Iterate
/ Kill / Extend.

## Approvals

- Experiment launch always requires human go/no-go.
- Risky/prohibited claims require Compliance / Medical Review before launch.
- The app never launches experiments, changes audiences, or alters suppression.
