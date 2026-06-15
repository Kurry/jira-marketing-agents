# AIGO JQL Filters / Queues

Provisioned: 2026-06-15 (T-M6-01)  
Site: myhealthcaresite.atlassian.net  
Project: AIGO (projectId: 10000)  
Script: `scripts/provision-filters.cjs` (idempotent — re-run is safe)

## Created Filters

| Filter Name | Jira ID | Purpose |
|---|---|---|
| AIGO — Intake | 10000 | Issues awaiting triage |
| AIGO — Claims Review | 10001 | Health/clinical claims pending human review |
| AIGO — Launch Readiness | 10002 | Employer launches in Launch Prep |
| AIGO — Readout Needed | 10003 | Issues labeled `readout-needed` for weekly readout |
| AIGO — Decision Needed | 10004 | Issues stalled in Decision Needed status |
| AIGO — Blocked | 10005 | Issues labeled `blocked` or stale for 7+ days |
| AIGO — Experiment Running | 10006 | Active experiments |

## JQL Definitions

```
AIGO — Intake
  project = AIGO AND status = "Intake" ORDER BY created DESC

AIGO — Claims Review
  project = AIGO AND status = "Claims Review" ORDER BY priority DESC, created DESC

AIGO — Launch Readiness
  project = AIGO AND status = "Launch Prep" ORDER BY created DESC

AIGO — Readout Needed
  project = AIGO AND labels = "readout-needed" ORDER BY updated DESC

AIGO — Decision Needed
  project = AIGO AND status = "Decision Needed" ORDER BY updated ASC

AIGO — Blocked
  project = AIGO AND (labels = "blocked" OR (status in ("Triage", "Spec Ready", "In Review") AND updated <= "-7d")) ORDER BY updated ASC

AIGO — Experiment Running
  project = AIGO AND status = "Experiment Running" ORDER BY created DESC
```

## Notes

- All filters are marked as Favourites for the provisioning user.
- The "Blocked" filter detects both explicitly labeled issues and implicitly stale in-progress issues (no update in 7+ days).
- "Readout Needed" relies on the `readout-needed` label being applied by the AI Weekly Readout Agent or manually by the lead.
- Filter IDs are stable — safe to bookmark or embed in dashboards.
- To re-provision after site wipe: re-run `node scripts/provision-filters.cjs`; it will skip any filter already created under the same name.
