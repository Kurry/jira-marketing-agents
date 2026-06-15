---
name: atlassian-analytics-data-lake
description: Query and report on Atlassian product data via Atlassian Analytics and the Atlassian Data Lake. Use when connecting to the Data Lake, writing visual or raw SQL against Jira/JSM/Confluence/JPD schemas, building charts/dashboards, blending cross-product data, checking who can connect (org admin) and plan/edition requirements, CSV export, or data-freshness limits.
---

# Atlassian Analytics & the Data Lake

The **Atlassian Data Lake** is a structured, queryable copy of your Atlassian cloud product data. **Atlassian Analytics** is the product that connects to it to build charts, dashboards, and SQL queries.

## What the Data Lake is

- A managed, structured dataset aggregating data across your sites/products into shared tables.
- Lets you filter, transform, blend across products/sites, and visualize.
- Products currently available: **Jira, Jira Service Management, Jira Product Discovery, Confluence, Talent, Focus, Goals, Atlassian Projects** (set evolves — verify in docs).

## Access & plan requirements

- **You must be an organization admin** to create a connection to the Data Lake.
- Up to **10 connections** per org (use multiple only to restrict access to sensitive data).
- Analytics availability is **edition/plan-gated** (Premium/Enterprise tiers of the relevant products) — confirm current entitlement in Atlassian admin before promising access.
- After connecting, you grant Analytics users access to each data source connection.

## Schemas

Data is organized into related tables per product domain. Querying uses these schemas:

| Schema | Covers |
|---|---|
| Jira family | Issues, projects, sprints, boards, workflows, users (Jira Software / Work Management / Product Discovery aggregated into one set of tables) |
| Jira Service Management | Adds JSM-specific tables (requests, SLAs, queues) on top of the Jira family tables |
| Asset & configuration management | JSM Assets objects/schemas |
| Confluence | Pages, spaces, activity |
| Data-share schemas | Cross-product/aggregated share tables |

- **Important:** Jira apps share one set of tables. To isolate a single app's data, filter on the **Project type** column from the Jira **project** table (Filters in visual mode, or `WHERE` in SQL mode).

## Querying

- **Visual SQL:** build queries with a no-/low-code UI (joins, filters, transforms) that compiles to SQL.
- **Raw SQL mode:** write SQL directly against the schema tables.
- **Charts & dashboards:** assemble query results into visualizations; dashboards can blend multiple sources.
- **Export:** results can be exported to **CSV**.

## Common workflows

1. **Stand up Analytics:** org admin creates a Data Lake connection → grants users access to that data source.
2. **Build a report:** new query → pick the Data Lake source → join the relevant tables (e.g. issue + project + status) → filter by Project type for a specific Jira app → save as a chart on a dashboard.
3. **Isolate one product:** always add the Project-type filter so Software vs JSM vs JPD data don't co-mingle.
4. **Cross-product/site insight:** blend Jira + Confluence (or multiple sites) in one dashboard.
5. **Hand off data:** export a query result to CSV for stakeholders without Analytics access.

## Gotchas / limitations

- **Freshness:** most tables lag ~**90 minutes** behind live product data — not real-time; don't use for second-by-second monitoring.
- Org-admin-only connection creation; non-admins can't connect a new source.
- Plan-gated — a customer on a lower edition may not have Analytics/Data Lake at all.
- The list of available products and tables changes; verify schema docs before relying on a specific table/column.
- This is reporting infrastructure, not an operational write API — there is no mutation surface here.

## Safety

Read-only analysis surface. Creating/altering Data Lake connections or changing who can access a data source is an org-admin action — recommend, but require explicit human approval before changing connection or access configuration.

## References

- What is the Data Lake: https://support.atlassian.com/analytics/docs/what-is-the-atlassian-data-lake/
- Data model: https://support.atlassian.com/analytics/docs/understand-the-data-model-of-the-atlassian-data-lake/
- Connect to the Data Lake: https://support.atlassian.com/analytics/docs/connect-to-the-atlassian-data-lake/
- Visual SQL: https://support.atlassian.com/analytics/docs/query-and-transform-data-with-visual-sql/
- Jira schema: https://support.atlassian.com/analytics/docs/schema-for-jira-software/
- JSM schema: https://support.atlassian.com/analytics/docs/schema-for-jira-service-management/
- Manage data source access: https://support.atlassian.com/analytics/docs/manage-data-source-access/
