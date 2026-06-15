---
name: jira-service-management
description: Operate the Jira Service Management (JSM) Cloud REST API — service desks, request types, customer requests, queues, SLAs, approvals, comments (public vs internal), organizations, customers, and participants. Use when calling /rest/servicedeskapi, creating or transitioning portal requests, posting public/internal comments, managing SLAs/approvals/organizations, or mapping JSM requests to their underlying Jira issues.
---

# Jira Service Management (JSM) REST API

JSM adds an ITSM/help-desk layer on top of Jira. A **customer request** is a Jira issue surfaced through a **portal** with a **request type**; the JSM API speaks in service-desk concepts while the platform Jira API still works on the same issues underneath.

## Auth & base URL

- Base path: `https://<site>.atlassian.net/rest/servicedeskapi/`. OAuth gateway form: `https://api.atlassian.com/ex/jira/{cloudId}/rest/servicedeskapi/...`.
- Auth: Basic (email + API token), OAuth 2.0 3LO, or Forge — same mechanisms as the Jira platform API.
- OAuth scopes: `read:servicedesk-request`, `write:servicedesk-request`, `manage:servicedesk-customer`, plus granular `read:request:jira-service-management` etc.
- Service desk types: **agents** vs **customers** see different data; many request endpoints can be called as the customer (`X-ExperimentalApi` may be needed for experimental methods — send header `X-ExperimentalApi: opt-in`).

## Core endpoints (real paths, under /rest/servicedeskapi)

| Action | Method + path |
|---|---|
| List/get service desks | `GET /servicedesk`, `GET /servicedesk/{id}` |
| Request types for a desk | `GET /servicedesk/{id}/requesttype` |
| Request type fields | `GET /servicedesk/{id}/requesttype/{rtId}/field` |
| Queues | `GET /servicedesk/{id}/queue`, `GET /servicedesk/{id}/queue/{qId}/issue` |
| Create customer request | `POST /request` |
| Get/list requests | `GET /request`, `GET /request/{idOrKey}` |
| Request transitions | `GET`/`POST /request/{idOrKey}/transition` |
| Comments | `GET`/`POST /request/{idOrKey}/comment` (`public: true|false`) |
| SLA | `GET /request/{idOrKey}/sla`, `GET /request/{idOrKey}/sla/{slaId}` |
| Approvals | `GET /request/{idOrKey}/approval`; `POST .../approval/{id}` to approve/decline |
| Participants | `GET`/`POST`/`DELETE /request/{idOrKey}/participant` |
| Request status history | `GET /request/{idOrKey}/status` |
| Customers | `POST /customer` (create), `GET/POST /servicedesk/{id}/customer` (add to desk) |
| Organizations | `GET/POST /organization`, `.../organization/{id}/user`, `/servicedesk/{id}/organization` |
| Attach temp files / attachment | `POST /servicedesk/{id}/attachTemporaryFile`, `POST /request/{idOrKey}/attachment` |

## Common workflows

1. **Raise a request on behalf of a customer.** POST `/request` with `{"serviceDeskId":"1","requestTypeId":"25","requestFieldValues":{"summary":"...","description":"..."},"raiseOnBehalfOf":"<accountId>"}`. Discover valid `requestFieldValues` from `GET /servicedesk/{id}/requesttype/{rtId}/field`.
2. **Reply to a customer vs note internally.** POST `/request/{key}/comment` with `{"body":"...","public":true}` for a portal-visible reply, `public:false` for an internal (agent-only) note.
3. **Move a request.** GET `/request/{key}/transition` for allowed transitions, then POST `{"id":"<transitionId>","additionalComment":{"body":"..."}}`.
4. **Handle an approval.** GET `/request/{key}/approval`, then POST `/request/{key}/approval/{approvalId}` with `{"decision":"approve"}` or `"decline"`.
5. **Track SLAs.** GET `/request/{key}/sla` returns each SLA's ongoing/completed cycles, breach status, and remaining time.

## Gotchas / current changes

- A customer request **is** a Jira issue: use the platform Jira API (`/rest/api/3/issue/...`) for fields/links/changelog the servicedeskapi does not expose, but mutate request lifecycle via servicedeskapi when possible so portal/SLA logic stays consistent.
- **request channels:** requests created via API behave like portal requests; email/portal/API are different channels and may map to different request types.
- Comments default to **public** if `public` is omitted in some clients — always set it explicitly to avoid leaking internal notes to customers.
- Some endpoints are **experimental** and require `X-ExperimentalApi` opt-in; they can change without notice.
- Pagination uses `start`/`limit` with `_links.next` (servicedeskapi style), not the platform `nextPageToken`.
- `requestTypeId`/`serviceDeskId` are numeric IDs, not project keys — resolve them first.

## Safety

Read/draft by default. Listing desks, requests, SLAs, and reading comments are safe. Creating/transitioning requests, posting comments (especially public ones visible to customers), approving/declining, and adding/removing customers or organizations are mutating — require explicit human approval, and double-check `public` before any customer-facing comment.

## References

- JSM REST API intro (auth, scopes, pagination): https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/
- Request group (create, comment, transition, SLA, approval, participant): https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-request/
- Service desk group (queues, request types, customers): https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/
- Organization group: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-organization/
- Request type group: https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-requesttype/
