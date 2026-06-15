---
name: confluence-cloud-rest
description: >
  Operate the Confluence Cloud REST API — read and write pages, blog posts, spaces, comments,
  labels, attachments, and content properties via the v2 API, plus CQL search via v1. Use when
  building/updating Confluence pages, fetching page bodies (storage/ADF/view), searching content
  with CQL, paginating with cursors, or wiring auth (OAuth 2.0, API token, Forge).
---

# confluence-cloud-rest

Confluence Cloud REST API. Default to the **v2** API (`/wiki/api/v2/`) for content CRUD; fall
back to **v1** (`/wiki/rest/api/`) only where v2 has no equivalent (notably CQL search).

## Auth & base URL

- Base: `https://<site>.atlassian.net/wiki/api/v2/` (v2), `https://<site>.atlassian.net/wiki/rest/api/` (v1).
- **API token (Basic auth):** header `Authorization: Basic base64(email:api_token)`. Token from id.atlassian.com → Security → API tokens. Best for scripts/yourself.
- **OAuth 2.0 (3LO):** bearer token; call via `https://api.atlassian.com/ex/confluence/{cloudId}/wiki/api/v2/...`. Resolve `cloudId` from `https://api.atlassian.com/oauth/token/accessible-resources`.
- **Forge:** `api.asUser()` / `api.asApp()` with `route` template literals; scopes in `manifest.yml`.
- **Granular OAuth scopes (v2):** e.g. `read:page:confluence`, `write:page:confluence`, `read:space:confluence`, `read:comment:confluence`, `write:comment:confluence`, `read:attachment:confluence`, `read:label:confluence`. Classic scopes (`read:confluence-content.all`, `write:confluence-content`) still work for v1.
- Headers: `Accept: application/json`; `Content-Type: application/json` on writes.

## Body representations

- `storage` — Confluence Storage Format (XHTML). The default for page CRUD; round-trips reliably.
- `atlas_doc_format` — ADF (JSON, same model as Jira). Pass the ADF doc as a **stringified** JSON in `body.value`.
- `view` — rendered HTML, **read-only** (request via `body-format=view`).
- On reads, choose with `body-format` query param; on writes, set `body.representation` + `body.value`.

## Core v2 endpoints

| Object | Read | Write |
|---|---|---|
| Pages | `GET /pages`, `GET /pages/{id}`, `GET /spaces/{id}/pages` | `POST /pages`, `PUT /pages/{id}`, `DELETE /pages/{id}` |
| Blog posts | `GET /blogposts`, `GET /blogposts/{id}` | `POST /blogposts`, `PUT /blogposts/{id}`, `DELETE /blogposts/{id}` |
| Spaces | `GET /spaces`, `GET /spaces/{id}` | (create via v1) |
| Footer comments | `GET /pages/{id}/footer-comments`, `GET /footer-comments/{id}` | `POST /footer-comments`, `PUT/DELETE /footer-comments/{id}` |
| Inline comments | `GET /pages/{id}/inline-comments`, `GET /inline-comments/{id}` | `POST /inline-comments`, `PUT/DELETE` |
| Labels | `GET /pages/{id}/labels`, `GET /labels` | labels added via v1 `POST /wiki/rest/api/content/{id}/label` |
| Attachments | `GET /pages/{id}/attachments`, `GET /attachments/{id}` | upload via v1 (see gotchas) |
| Content properties | `GET /pages/{id}/properties`, `GET .../properties/{propId}` | `POST`, `PUT`, `DELETE` |
| Children / Ancestors / Descendants | `GET /pages/{id}/children`, `.../ancestors`, `.../descendants` | — |
| Versions | `GET /pages/{id}/versions` | — |

`{id}` is the numeric content/space ID, not the space key. Get a space ID from `GET /spaces?keys=KEY`.

## Pagination (cursor)

- v2 uses `limit` + opaque `cursor`. The response **`Link` header** carries `rel="next"` with the next URL (cursor embedded). Follow it until absent. Do not build cursors by hand; do not use `start`.
- v1 CQL search returns `_links.next` (relative URL with cursor) — same follow-the-link pattern.

## Search — CQL (v1)

- `GET /wiki/rest/api/search?cql=<CQL>&limit=25&cursor=<c>`. (`/wiki/rest/api/content/search` also exists for content-only.)
- CQL examples: `type=page AND space=DEV`, `title ~ "launch"`, `text ~ "metabolic"`, `label = "q3"`, `created >= "2026-01-01"`, `lastModified > now("-7d")`, `ancestor = 12345`.
- Operators: `=`, `!=`, `~` (contains/fuzzy), `!~`, `>`, `<`, `in (...)`, `AND/OR/NOT`, `ORDER BY`. User-specific fields (`user`, `user.accountid`) are no longer accepted on `/search`.

## Common workflows

1. **Create a page:** `POST /pages` with `{ "spaceId": "<id>", "status": "current", "title": "...", "parentId": "<optional>", "body": { "representation": "storage", "value": "<p>...</p>" } }`.
2. **Update a page (version bump required):** `GET /pages/{id}` → read `version.number` → `PUT /pages/{id}` with `{ "id": "<id>", "status": "current", "title": "...", "body": {...}, "version": { "number": <current+1>, "message": "edit summary" } }`. A stale/equal version returns 409.
3. **Fetch page body as ADF:** `GET /pages/{id}?body-format=atlas_doc_format` (or `storage`, `view`).
4. **List pages in a space, paginate:** `GET /spaces/{id}/pages?limit=100`, then follow `Link: rel="next"`.
5. **Add footer comment:** `POST /footer-comments` with `{ "pageId": "<id>", "body": { "representation": "storage", "value": "..." } }`. Replies add `parentCommentId`.
6. **Read content property:** `GET /pages/{id}/properties` → `PUT .../properties/{propId}` with a bumped `version.number`.

## Gotchas / current changes

- **v1 → v2 migration:** v2 is the path forward (granular endpoints, ~faster bulk reads, cursor-only pagination). v1 endpoints under `/wiki/rest/api/` remain for CQL search, attachment upload, label add, and a few admin gaps. Check the changelog before assuming a v1 endpoint persists.
- **Version number is mandatory and monotonic** on every page/blogpost/property update — fetch current, increment by 1.
- **`atlas_doc_format` value is a JSON string**, not a raw object; mismatched representation/value yields 400.
- IDs in v2 are numeric content IDs; space *keys* must be resolved to space *IDs* first.
- Attachment upload still uses v1 multipart: `POST /wiki/rest/api/content/{id}/child/attachment` with header `X-Atlassian-Token: no-check`.
- Rate limits are dynamic (cost-budget); honor `Retry-After` on 429.

Safety: this skill defaults to read/draft/recommend. Page/comment creation, edits, deletes, and any bulk mutation require explicit human approval before executing.

## References

- v2 intro & auth: https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
- v2 Page group: https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/
- CQL search (v1): https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-search/
- Advanced searching using CQL: https://developer.atlassian.com/cloud/confluence/advanced-searching-using-cql/
- Using the REST API: https://developer.atlassian.com/cloud/confluence/using-the-rest-api/
