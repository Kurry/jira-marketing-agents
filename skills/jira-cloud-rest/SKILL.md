---
name: jira-cloud-rest
description: Operate the Jira Cloud platform REST API v3 (issues, JQL search, transitions, comments, attachments, links, webhooks). Use when calling /rest/api/3, building JQL queries, paginating search, creating/editing/transitioning issues, posting ADF comments, handling OAuth 2.0 3LO or API-token auth, dealing with 429 rate limits, or migrating off the removed GET/POST /search endpoint to POST /search/jql.
---

# Jira Cloud Platform REST API v3

REST API for Jira Cloud issues, search, fields, transitions, comments, links, and webhooks. v3 uses Atlassian Document Format (ADF) for rich text; v2 uses wiki markup strings. Prefer v3.

## Auth & base URL

- Base URL: `https://<site>.atlassian.net/rest/api/3/` for site-relative calls.
- OAuth 2.0 3LO uses the gateway form: `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`. Get `cloudId` from `GET https://api.atlassian.com/oauth/token/accessible-resources`.
- **Basic auth**: `email:API_TOKEN` base64-encoded in `Authorization: Basic ...`. API tokens are created at id.atlassian.com; passwords are not accepted. Good for scripts/server jobs.
- **OAuth 2.0 (3LO)**: bearer token; request granular scopes like `read:jira-work`, `write:jira-work`, `read:jira-user`, plus classic `manage:jira-webhook`. Use granular scopes (`read:issue:jira`, `write:issue:jira`, etc.) for new apps.
- **Forge**: call `api.asApp()` / `api.asUser().requestJira(route\`/rest/api/3/...\`)`; scopes declared in `manifest.yml`.

## Core endpoints (real paths)

| Action | Method + path |
|---|---|
| Create issue | `POST /rest/api/3/issue` |
| Get issue | `GET /rest/api/3/issue/{idOrKey}` (`?fields=`, `?expand=`) |
| Edit issue | `PUT /rest/api/3/issue/{idOrKey}` |
| Delete issue | `DELETE /rest/api/3/issue/{idOrKey}` (`?deleteSubtasks=true`) |
| Search (JQL) | `POST /rest/api/3/search/jql` (also `GET`) |
| Approx count | `POST /rest/api/3/search/approximate-count` |
| Create metadata | `GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes` and `/issuetypes/{issueTypeId}` |
| Edit metadata | `GET /rest/api/3/issue/{idOrKey}/editmeta` |
| Transitions | `GET` then `POST /rest/api/3/issue/{idOrKey}/transitions` |
| Comments | `GET`/`POST /rest/api/3/issue/{idOrKey}/comment`; `PUT`/`DELETE .../comment/{id}` |
| Attachments | `POST /rest/api/3/issue/{idOrKey}/attachments` (multipart, header `X-Atlassian-Token: no-check`) |
| Issue links | `POST /rest/api/3/issueLink`; types via `GET /rest/api/3/issueLinkType` |
| Bulk fetch | `POST /rest/api/3/issue/bulkfetch` |
| Bulk edit/transition/move | `POST /rest/api/3/bulk/issues/fields|transition|move` |
| Webhooks (dynamic) | `POST/GET/DELETE /rest/api/3/webhook` (OAuth/Connect apps only; expire ~30 days, refresh via `PUT /rest/api/3/webhook/refresh`) |
| Fields | `GET /rest/api/3/field` |

## Common workflows

1. **Create an issue.** POST `/issue` with `{"fields":{"project":{"key":"ABC"},"issuetype":{"name":"Task"},"summary":"...","description":<ADF doc>}}`. Validate allowed fields first via `createmeta`.
2. **Search + page.** POST `/search/jql` with `{"jql":"project=ABC ORDER BY created DESC","fields":["summary","status"],"maxResults":100}`. Read `nextPageToken` from the response; resend the same body adding `"nextPageToken":"<token>"` until it is absent. There is **no `startAt` and no `total`** — get a count from `/search/approximate-count`.
3. **Transition an issue.** GET `/transitions` to discover valid transition IDs for the current status, then POST `{"transition":{"id":"31"}}` (optionally set fields/`update`/`fields` in the same body).
4. **Add a comment.** POST `/comment` with `{"body":<ADF doc>}`. ADF root: `{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}`.
5. **Link issues.** POST `/issueLink` with `{"type":{"name":"Blocks"},"inwardIssue":{"key":"A-1"},"outwardIssue":{"key":"A-2"}}`.

## Gotchas / current changes

- **Search migration (2024–2025):** the legacy `GET`/`POST /rest/api/3/search` (and v2) were deprecated and fully shut down through Oct 2025. Use `POST /rest/api/3/search/jql`. Pagination is **token-based** (`nextPageToken`), not `startAt`; the response no longer returns `total`. Default and behavior of `fields` changed — explicitly request the fields you need (e.g. `["*all"]` or a named list); some bulk/expand options differ from the old endpoint.
- **ADF required in v3** for `description`, comment `body`, and other rich-text fields — sending a plain string fails. Use v2 if you must send wiki markup.
- **Rate limits:** expect HTTP `429`; honor the `Retry-After` header (seconds) and back off. Cost-based limiting applies per app/tenant; batch with `bulkfetch`/`expand` instead of many small calls.
- **expand** controls extra data (e.g. `renderedFields`, `changelog`, `transitions`); pass as query param or in the search body.
- Custom fields appear as `customfield_NNNNN`; resolve IDs via `GET /rest/api/3/field`.

## Safety

Read/draft by default. `GET`, `createmeta`, and search are safe. Treat `DELETE`, bulk edit/transition/move, webhook registration, and permission/workflow changes as destructive — require explicit human approval and never run them against production unprompted.

## References

- REST v3 intro (auth, pagination, scopes): https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Issue search group (`/search/jql`, approximate-count): https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
- Issues group (CRUD, transitions, createmeta): https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- ADF / Document Format: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- JQL search migration guide: https://developer.atlassian.com/changelog/#CHANGE-2046
- OAuth 2.0 3LO scopes: https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
