# Skill: Dashboard Specification (+ Metric Definition, Source Mapping, QA)

**Status:** ✅ Implemented
**Used by:** Dashboard Agent
**Implementation:** `src/dashboards.ts` (`createDashboardSpec`) · action `createDashboardSpec`

## Purpose

Convert a vague reporting ask into a concrete dashboard spec: business question,
metrics, dimensions, filters, source systems, refresh cadence, charts, QA, and
acceptance criteria.

## Behavior

Matches the request against ten dashboard categories (Executive acquisition,
Segment performance, Employer launch, Experimentation, Creative performance,
Signup funnel, Channel performance, Claims review, Member objection, Weekly
growth decision) and seeds metrics/dimensions/charts from the matched category.
Infers source systems (warehouse / product analytics / CRM) from the text and
flags ambiguous ones with "Confirm source system(s) with the data team".

## Inputs

- `issueKey: string`

## Output (`DashboardSpec`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-123",
  "businessQuestion": "Where are users dropping off in the signup funnel?",
  "users": ["Growth leadership", "Workflow owners", "Analytics"],
  "metrics": ["Step completion rate", "Drop-off rate", "Time on step"],
  "dimensions": ["Funnel step", "Device", "Channel"],
  "filters": ["Date range", "Channel", "Segment", "Employer (where applicable)"],
  "sourceSystems": ["Product analytics"],
  "refreshCadence": "Daily",
  "charts": ["Funnel drop-off", "Completion by device"],
  "qaChecks": ["Metrics reconcile against the source system within tolerance."],
  "acceptanceCriteria": ["Dashboard answers: \"…\""]
}
```

## Safety

Read-only spec. Produces a definition, not a live dashboard; building remains a
human/data-team task. Ambiguous metric names are flagged for definition.
