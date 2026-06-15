---
name: jira-product-discovery
description: Work with Jira Product Discovery (JPD) — ideas, insights, JPD fields (formula/rating/options), views (matrix/board/timeline), prioritization scoring, and delivery links to Jira Software. Use when reading or creating ideas via the Jira Cloud REST API, capturing insights, configuring JPD-specific custom fields, computing weighted/roll-up scores, or linking an idea to delivery epics/issues in Jira Software.
---

# Jira Product Discovery (JPD)

JPD is Atlassian's product-discovery and roadmapping tool. A JPD project holds **ideas** (a Jira issue type); ideas carry **insights** (evidence: research, tickets, votes) and **fields** used to score and prioritize. JPD runs on the same Jira Cloud platform, so you use the **standard Jira REST API v3** with JPD-specific field types.

## Access & base URL

- Same platform API: `https://<site>.atlassian.net/rest/api/3/...` (or OAuth gateway `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`).
- Auth: Basic (email + API token), OAuth 2.0 3LO (`read:jira-work`, `write:jira-work`), or Forge.
- A JPD project has `projectTypeKey: "product_discovery"`. Ideas are normal issues in that project — fetch/create them with `/rest/api/3/issue` and search with `/rest/api/3/search/jql`.

## Core concepts & how they map to the API

| JPD concept | API mapping |
|---|---|
| Idea | Issue (issuetype "Idea") in a `product_discovery` project; CRUD via `/rest/api/3/issue` |
| Field (custom) | `customfield_NNNNN`; discover via `GET /rest/api/3/field` and `createmeta` |
| Insight | JPD-specific entity attached to an idea (research/evidence); managed via the **JPD insights API** (`/rest/api/3/jira-product-discovery/...` / Forge JPD module), not a plain comment |
| View (matrix/board/timeline) | A saved presentation of ideas; configured in-product, not a first-class REST resource |
| Delivery | Issue links from the idea to Jira Software epics/issues (`/rest/api/3/issueLink`); the delivery panel rolls up linked work item progress |

## JPD field types

- **Options / single-select / multi-select** — labels like statuses, themes, segments.
- **Rating** — 1–5 style scoring on an idea.
- **Formula** — computed fields (e.g. weighted score) built from other fields, Insights count, and Votes; expression-based formulas support normalization to compare ideas. Formula fields are read-only outputs.
- **People, number, date, checkbox, hyperlink** — standard. Read every field's id/schema from `GET /rest/api/3/field` before writing.

## Common workflows

1. **List ideas.** `POST /rest/api/3/search/jql` with `{"jql":"project = DISC ORDER BY created DESC","fields":["summary","status","customfield_XXXXX"]}` (token-paginate via `nextPageToken`).
2. **Create an idea.** `POST /rest/api/3/issue` with `{"fields":{"project":{"key":"DISC"},"issuetype":{"name":"Idea"},"summary":"...","description":<ADF>}}`.
3. **Set a JPD field.** `PUT /rest/api/3/issue/{key}` updating `customfield_NNNNN` with the value shape the field expects (option object, number, etc.). Formula fields cannot be written — they recompute.
4. **Add an insight.** Use the JPD insights endpoints / Forge JPD API to attach evidence to an idea (don't fake it as a comment); insights feed roll-up formulas and votes.
5. **Link to delivery.** `POST /rest/api/3/issueLink` connecting the idea to a Jira Software epic/issue; the JPD delivery panel then tracks status of linked work.

## Gotchas / current changes

- JPD has **no separate product REST API** for ideas — it is the Jira platform API filtered to `product_discovery` projects. Insights/views are the JPD-specific parts and have narrower API coverage (largely Forge module + dedicated insight endpoints).
- Field types are **JPD-specific in behavior** (formula, rating); resolve the exact `customfield_*` id and schema per project — they differ across projects.
- Search uses the **new `/search/jql`** endpoint with `nextPageToken` pagination (no `startAt`/`total`).
- Views (matrix/board/timeline) are UI constructs; don't expect to create them via REST.
- Delivery progress only counts work items actually linked/shown in JPD; a link must exist for roll-up.

## Safety

Read/draft by default — listing/reading ideas, fields, and insights is safe. Creating/editing ideas, writing fields, adding insights, and creating delivery links mutate the project — require explicit human approval. Never bulk-modify ideas or alter prioritization fields/formulas in a live discovery space without sign-off.

## References

- Jira Cloud REST v3 (ideas as issues): https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- JPD fields reference: https://support.atlassian.com/jira-product-discovery/docs/jira-product-discovery-fields-reference/
- Custom (expression) formulas: https://support.atlassian.com/jira-product-discovery/docs/expression-based-formulas/
- What are insights: https://support.atlassian.com/jira-product-discovery/docs/what-are-insights/
- What is JPD: https://support.atlassian.com/jira-product-discovery/docs/what-is-jira-product-discovery/
