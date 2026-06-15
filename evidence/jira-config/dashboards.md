# AIGO Dashboards

Provisioned: 2026-06-15 (T-M6-02)
Site: myhealthcaresite.atlassian.net
Project: AIGO
Script: `scripts/provision-dashboards.cjs` (idempotent — re-run is safe)

## Created Dashboards

| Dashboard Name | Jira ID | URL | Gadgets |
|---|---|---|---|
| AIGO — Weekly Growth State | 10001 | [Open](https://myhealthcaresite.atlassian.net/jira/dashboards/10001) | 4 |
| AIGO — Claims Bottlenecks | 10002 | [Open](https://myhealthcaresite.atlassian.net/jira/dashboards/10002) | 1 |
| AIGO — Experiments | 10003 | [Open](https://myh
Evidence written: evidence/jira-config/dashboards.md

=== Dashboard Provision Summary ===
  Created: 6
  Skipped: 0
  Errors:  0

Done.
.net/jira/dashboards/10004) | 2 |
| AIGO — Signup Funnel Issues | 10005 | [Open](https://myhealthcaresite.atlassian.net/jira/dashboards/10005) | 2 |
| AIGO — Research Insights | 10006 | [Open](https://myhealthcaresite.atlassian.net/jira/dashboards/10006) | 2 |

## Dashboard Purposes

- **AIGO — Weekly Growth State** — Weekly growth ops snapshot: active issues by status, decision-needed queue, readout-needed, and recent completions.
- **AIGO — Claims Bottlenecks** — Health/clinical claims review queue: issues awaiting compliance review, risk distribution, and age-in-queue.
- **AIGO — Experiments** — Active experiments, decision-needed experiments, and recently completed tests.
- **AIGO — Employer Launches** — Employer launch pipeline: in launch prep, readiness scores, blockers, and upcoming go/no-go decisions.
- **AIGO — Signup Funnel Issues** — Signup funnel friction and bug queue: active issues by status, blocked funnel issues, and triage backlog.
- **AIGO — Research Insights** — Research briefs and positioning updates: synthesis backlog, decision-needed research, and recent Decision Memos.

## Notes

- All dashboards are shared with logged-in users.
- Gadgets use the filter IDs from T-M6-01 (provision-filters.cjs).
- If gadgets show HTTP errors, add them manually: Dashboard → Edit → Add gadget → 'Filter Results'.
- To re-provision after site wipe: re-run `node scripts/provision-dashboards.cjs`.

## Raw Results

```json
[
  {
    "name": "AIGO — Weekly Growth State",
    "id": "10001",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10001",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  },
  {
    "name": "AIGO — Claims Bottlenecks",
    "id": "10002",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10002",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  },
  {
    "name": "AIGO — Experiments",
    "id": "10003",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10003",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  },
  {
    "name": "AIGO — Employer Launches",
    "id": "10004",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10004",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  },
  {
    "name": "AIGO — Signup Funnel Issues",
    "id": "10005",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10005",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  },
  {
    "name": "AIGO — Research Insights",
    "id": "10006",
    "url": "https://myhealthcaresite.atlassian.net/jira/dashboards/10006",
    "status": "created",
    "gadgets": [
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      },
      {
        "moduleKey": "com.atlassian.jira.gadgets:filter-results-gadget",
        "status": "http-400",
        "note": "Gadget may need manual configuration in the Jira UI"
      }
    ]
  }
]
```