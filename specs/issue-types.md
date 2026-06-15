# AIGO Issue Types

Canonical issue-type catalog for the Jira-native AI Growth Ops control plane.

**Current vs target state.** The live AIGO project today uses only the
team-managed defaults — **Workstream, Task, Sub-task** — and seed issues encode
their intended AIGO type in the description (see `automation/seed/` and
`specs/requirements.md` REQ-005). The 14 types below are the **target** state.
Until the project is reconfigured (owned by `jira-admin`, gated per
`specs/agent-team/TEAM_CHARTER.md`), agents classify issues into these types via
comments rather than relying on the Jira issue type itself.

Field names referenced below are defined in `specs/custom-fields.md` and the
field catalog in `specs/outcome-roadmap.md`. Workflows and statuses per type are
in `specs/workflows.md`.

---

## 1. AI Growth Request

General intake for a growth idea or ask that needs AI triage before it becomes
executable work. The default landing type for vague or unrouted requests.

- **Primary fields:** Target Population, Primary Metric, Targeting Confidence,
  Channels, Confidence, Blockers.
- **Legacy aliases:** **Growth Task** (current placeholder type) → AI Growth
  Request; **Automation Request** folds in here when the ask is "have AI do X".

## 2. Creative Request

Request to draft creative variants (copy/assets) for a channel. AI drafts only;
copy is claims-scanned and routed to review, never approved.

- **Primary fields:** Creative Type, Hook Type, Channels, Proof Point,
  Claims Risk, Variant ID, Assets Required, QA Required.
- **Legacy aliases:** none (new type).

## 3. Experiment

A single test with a hypothesis, metric, guardrails, and a decision rule.
Cannot move to launch without measurement, variants, tracking, and a decision
rule (see `policies/experiment-policy.md`).

- **Primary fields:** Hypothesis, Experiment ID, Variant ID, Primary Metric,
  Guardrail Metrics, Sample Feasibility, Expected Lift, Segment, Channels,
  Decision Date.
- **Legacy aliases:** none (new type).

## 4. Segmentation Request

Request to define a target audience/segment as a structured targeting spec.
Suppression logic is required before activation; AI never mutates audiences.

- **Primary fields:** Segment, Target Population, Signal Sources,
  Suppression Rules, Targeting Confidence, Primary Metric.
- **Legacy aliases:** maps to the existing `audience-builder-agent` capability.

## 5. Personalization Journey

A full lifecycle/journey artifact for a segment: stages, channels, behavior
triggers, sequence, fallbacks, tracking, and approvals.

- **Primary fields:** Segment, Journey Stage, Channels, Behavior Trigger,
  Proof Point, Claims Risk, Primary Metric.
- **Legacy aliases:** none (new type; partially covered today by `src/audience.ts`).

## 6. Employer Launch

Workback plan for launching to an employer/partner with readiness scoring,
blockers, phases, QA checklist, and suggested subtasks.

- **Primary fields:** Launch Date, Readiness Score, Blockers, Assets Required,
  QA Required, Channels, Decision Needed.
- **Legacy aliases:** none (new type).

## 7. Campaign

A multi-touch outreach plan (draft only — no send). Includes channels, cadence,
suppression checks, tracking, and approval gates.

- **Primary fields:** Campaign Goal, Channels, Segment, Suppression Rules,
  Launch Date, Primary Metric, Claims Risk.
- **Legacy aliases:** none (new type).

## 8. Dashboard Request

Request for an analytics dashboard or reporting view spec.

- **Primary fields:** Primary Metric, Segment, Channels, Theme.
- **Legacy aliases:** none (new type).

## 9. Signup Funnel Issue

A funnel-friction or signup defect to analyze and convert into a product-ready
remediation ticket; distinguishes tracking bugs from real user friction.

- **Primary fields:** Funnel Step, Affected Segment, Drop-off Impact, Evidence,
  Conversion Impact, Expected Lift, QA Required.
- **Legacy aliases:** none (new type).

## 10. Research Brief

A qualitative research / objection-mining synthesis: themes, frequency,
segments, de-identified quotes, conversion impact, recommended tests.

- **Primary fields:** Research Source, Theme, Frequency, Affected Segment,
  Conversion Impact, Recommended Test, Evidence.
- **Legacy aliases:** **Insight / Research Brief** → Research Brief (the current
  legacy type is renamed/aliased to this canonical name).

## 11. Claims Review

A health/clinical claims review item. A human Compliance reviewer is required;
AI may flag and recommend but **never approves** claims (see
`policies/claims-risk-policy.md`).

- **Primary fields:** Claims Risk, Proof Point, Evidence, Decision Needed.
- **Legacy aliases:** none (new type).

## 12. Decision Memo

A decision-support artifact tying a recommendation to evidence and a required
decision; produced by weekly readouts and decision support.

- **Primary fields:** Decision Needed, Decision Date, Confidence, Primary Metric,
  Evidence.
- **Legacy aliases:** none (new type).

## 13. Positioning Update

A product positioning/messaging update: value propositions, proof requirements,
differentiators, objection matrix, claims risk, missing-evidence warnings.

- **Primary fields:** Proof Point, Claims Risk, Theme, Segment, Channels,
  Evidence.
- **Legacy aliases:** none (new type).

## 14. Bug / Tracking Issue

An engineering/tracking defect — including analytics/tracking instrumentation
gaps that masquerade as funnel friction.

- **Primary fields:** Funnel Step, Evidence, QA Required, Blockers.
- **Legacy aliases:** none (standard Jira-style type retained for completeness).

---

## Legacy alias summary

| Legacy / current type | Canonical target type |
|---|---|
| Insight / Research Brief | Research Brief |
| Growth Task | AI Growth Request |
| Automation Request | AI Growth Request (when the ask is AI-driven) |
| Workstream / Task / Sub-task (live defaults) | Mapped per description until reconfigured |

`Workstream`, `Task`, and `Sub-task` remain the **live** issue types; the 14
canonical types are the target catalog and require a `jira-admin` reconfiguration
(plan-approval gated) before they exist in Jira.
