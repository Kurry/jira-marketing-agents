# T-M2-04 Result: Create 6 MVP Custom Fields

**Status: COMPLETE**
**Date:** 2026-06-15T04:12Z–04:14Z
**Executed by:** jira-admin
**Site:** myhealthcaresite.atlassian.net (staging only)

---

## Execution Summary

All 3 phases of T-M2-04 completed successfully.

### Phase 1: Custom Field Creation (all 201 Created)

| HTTP | Field Name | customfield ID |
|------|------------|----------------|
| 201 | Segment | customfield_10043 |
| 201 | Primary Metric | customfield_10044 |
| 201 | Claims Risk | customfield_10045 |
| 201 | Experiment ID | customfield_10046 |
| 201 | Workflow Area | customfield_10047 |
| 201 | Priority Score | customfield_10048 |

All fields created via `POST /rest/api/3/field`.

---

### Phase 2: Forge Environment Variables

All 6 variables set in `development` environment:

```
forge variables set SEGMENT_FIELD_ID        customfield_10043 --environment development  ✔
forge variables set PRIMARY_METRIC_FIELD_ID  customfield_10044 --environment development  ✔
forge variables set CLAIMS_RISK_FIELD_ID    customfield_10045 --environment development  ✔
forge variables set EXPERIMENT_ID_FIELD_ID  customfield_10046 --environment development  ✔
forge variables set WORKFLOW_AREA_FIELD_ID   customfield_10047 --environment development  ✔
forge variables set PRIORITY_SCORE_FIELD_ID customfield_10048 --environment development  ✔
```

### Forge Variables List Output (development)

```
┌────────────┬─────────────────────────┬───────────────────┐
│ Encrypted? │ Key                     │ Value             │
├────────────┼─────────────────────────┼───────────────────┤
│            │ CLAIMS_RISK_FIELD_ID    │ customfield_10045 │
├────────────┼─────────────────────────┼───────────────────┤
│            │ EXPERIMENT_ID_FIELD_ID  │ customfield_10046 │
├────────────┼─────────────────────────┼───────────────────┤
│            │ PRIMARY_METRIC_FIELD_ID │ customfield_10044 │
├────────────┼─────────────────────────┼───────────────────┤
│            │ PRIORITY_SCORE_FIELD_ID │ customfield_10048 │
├────────────┼─────────────────────────┼───────────────────┤
│            │ SEGMENT_FIELD_ID        │ customfield_10043 │
├────────────┼─────────────────────────┼───────────────────┤
│            │ WORKFLOW_AREA_FIELD_ID  │ customfield_10047 │
└────────────┴─────────────────────────┴───────────────────┘
```

---

### Phase 3: Forge Deploy

```
forge deploy -e development
→ Deployed Jira AI Growth Ops Rovo Agents to the development environment.
→ App version: 2.3.0
→ Status: ✔ Deployed
```

The 6 custom field IDs are now live in the app and readable from `src/config.ts`
(`process.env.SEGMENT_FIELD_ID`, etc.) within Forge functions.

---

## Verification Output

```
AIGO MVP fields found: 6/6
  customfield_10043: Segment
  customfield_10044: Primary Metric
  customfield_10045: Claims Risk
  customfield_10046: Experiment ID
  customfield_10047: Workflow Area
  customfield_10048: Priority Score
```

Verified via: `GET /rest/api/3/field/search?type=custom` filtered by name.

Note: `GET /rest/api/3/field` with a `custom: true` filter check returned 0 results
due to a filter behavior difference (the field list endpoint returns a subset). The
`field/search?type=custom` endpoint confirmed all 6 fields present.

---

## IDs Captured in evidence/jira-config/custom-fields.json

```json
{
  "Segment":        "customfield_10043",
  "Primary Metric": "customfield_10044",
  "Claims Risk":    "customfield_10045",
  "Experiment ID":  "customfield_10046",
  "Workflow Area":  "customfield_10047",
  "Priority Score": "customfield_10048"
}
```

---

## Next Steps (Per Plan)

- **Select field options:** Must be populated via Jira Admin UI for team-managed projects.
  - Segment: Employer Members, Lapsed Members, Activation Cohort, High-intent Visitors, General Audience
  - Primary Metric: Signups, CAC, Activation Rate, Retention, MoM Revenue, Feature Adoption, NPS
  - Claims Risk: Low, Medium, High, Prohibited
  - Workflow Area: Targeting, Creative, Experiment, Employer, Funnel, Content, Research, Platform
  - Priority Score: number field — no options needed
- **Notify forge-engineer:** Field IDs are set; `src/config.ts` can now reference them
  from env vars. No code changes needed as config.ts already reads from env vars.
- **33 remaining fields** (T-M2-04b): Deferred; separate plan required after MVP P1/P2.

---

## Safety contract: Verified

- Configuration-only: no issues modified, no workflow changed.
- No automation rules enabled.
- Field write path still gated by `policies/safe-mutations.md`.
- Staging only: myhealthcaresite.atlassian.net.
