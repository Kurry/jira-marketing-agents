---
name: trello
description: >
  Operate the Trello REST API (Atlassian) — boards, lists, cards, checklists, labels, members,
  custom fields, and webhooks. Use when creating/reading/updating Trello cards or boards, moving
  cards between lists, managing checklists/labels, registering webhooks, batching reads, or wiring
  Trello API key + token auth and handling rate limits (429).
---

# trello

Trello REST API. Base URL `https://api.trello.com/1/`. Every request needs `key` and `token`.

## Auth & base URL

- **API key + token** (standard): append `?key=<API_KEY>&token=<TOKEN>` (or send as headers) to every call.
  - Get the key from a Power-Up/integration on the Trello Power-Up admin page; the token is authorized per-user and can be set to expire in 1 hour / 1 day / 30 days / never.
- **OAuth 1.0a** is also supported for multi-user apps (key + token pair is the common server-to-server path; Trello does not use OAuth 2.0).
- Auth header form also accepted: `Authorization: OAuth oauth_consumer_key="<key>", oauth_token="<token>"`.
- Always send over HTTPS; never embed long-lived tokens in client-side code.

## Core objects & key endpoints

Most objects support `GET` (read), `POST` (create), `PUT` (update), `DELETE`. IDs are 24-char hex.

| Object | Read | Create / Update |
|---|---|---|
| Board | `GET /boards/{id}` | `POST /boards`, `PUT /boards/{id}`, `DELETE /boards/{id}` |
| List | `GET /lists/{id}`, `GET /boards/{id}/lists` | `POST /lists` (needs `idBoard`), `PUT /lists/{id}`, `PUT /lists/{id}/closed` (archive) |
| Card | `GET /cards/{id}`, `GET /lists/{id}/cards`, `GET /boards/{id}/cards` | `POST /cards` (needs `idList`), `PUT /cards/{id}`, `DELETE /cards/{id}` |
| Checklist | `GET /checklists/{id}`, `GET /cards/{id}/checklists` | `POST /checklists` (needs `idCard`), `POST /checklists/{id}/checkItems`, `PUT /cards/{cardId}/checkItem/{id}` |
| Label | `GET /labels/{id}`, `GET /boards/{id}/labels` | `POST /labels` (needs `idBoard`), add to card `POST /cards/{id}/idLabels` |
| Member | `GET /members/{id|me}`, `GET /boards/{id}/members` | add to card `POST /cards/{id}/idMembers` |
| Custom field | `GET /boards/{id}/customFields` | set on card `PUT /cards/{cardId}/customField/{fieldId}/item` |
| Action (activity) | `GET /cards/{id}/actions`, `GET /boards/{id}/actions` | `POST /cards/{id}/actions/comments` (comment) |
| Webhook | `GET /webhooks/{id}`, `GET /tokens/{token}/webhooks` | `POST /webhooks`, `PUT /webhooks/{id}`, `DELETE /webhooks/{id}` |
| Organization (Workspace) | `GET /organizations/{id}` | `POST /organizations`, `PUT`, `DELETE` |
| Search | `GET /search?query=...` | — |

### Nested resources & field selection

- Fetch related data in one call via nested paths: `GET /boards/{id}/cards`, `/boards/{id}/lists`, `/cards/{id}/checklists`, `/cards/{id}/attachments`.
- Trim/expand payloads with query params: `fields=name,due`, `cards=open`, `card_fields=name`, `members=all`, `checklists=all`, `actions=commentCard`. Use these instead of N follow-up calls.

## Webhooks

- Create: `POST /webhooks` with `idModel` (board/list/card/member to watch), `callbackURL` (must respond `200` to a `HEAD` validation probe at creation), optional `description`.
- Trello POSTs a JSON payload to `callbackURL` on each change to the watched model; it also sends a `HEAD` for ongoing validation. Respond `200` quickly.
- Webhooks are tied to the token used to create them; list via `GET /tokens/{token}/webhooks`.

## Batch endpoint

- `GET /batch?urls=/boards/{id},/cards/{id}` — run up to **10** GET requests in one call. URLs are comma-separated, relative, GET-only; response is an array of `{200: ...}` / error objects in order. Use to cut round-trips and ease rate limits.

## Rate limits

- **300 requests / 10s per API key** and **100 requests / 10s per token**.
- Special: `/1/members/...` limited to **100 requests / 900s**.
- Over limit → **HTTP 429** with a message naming the breached limit. Back off (respect `Retry-After` when present), then retry with jitter. Free workspaces may have additional caps.

## Common workflows

1. **Create a card:** `POST /cards?idList=<listId>&name=<title>&desc=<body>&key=...&token=...` (optionally `idLabels`, `idMembers`, `due`, `pos=top|bottom`).
2. **Move a card to another list:** `PUT /cards/{id}?idList=<newListId>` (add `pos` to control order); cross-board move also needs `idBoard`.
3. **Add a checklist + items:** `POST /checklists?idCard=<cardId>&name=...` → `POST /checklists/{id}/checkItems?name=...`; tick via `PUT /cards/{cardId}/checkItem/{itemId}?state=complete`.
4. **Label a card:** ensure label exists (`GET /boards/{id}/labels` or `POST /labels`) → `POST /cards/{id}/idLabels?value=<labelId>`.
5. **Comment / assign:** `POST /cards/{id}/actions/comments?text=...`; `POST /cards/{id}/idMembers?value=<memberId>`.
6. **Bulk read a board:** `GET /boards/{id}?lists=open&cards=open&card_fields=name,idList,due` or use `/batch` for several boards.
7. **Register a webhook:** `POST /webhooks?idModel=<boardId>&callbackURL=https://...` (host must already return 200 to HEAD).

## Gotchas

- Token expiry: a token set to expire silently stops working — surface 401s as "re-authorize," not a code bug.
- Many "create" calls require a parent id (`idBoard` for lists/labels, `idCard` for checklists, `idList` for cards); missing it returns 400.
- Card labels: a card carries `idLabels`; manage membership via `/cards/{id}/idLabels`, not by editing the label object.
- Closing vs deleting: lists/boards are usually **archived** (`closed=true`) rather than hard-deleted; cards can be `DELETE`d.
- `id` short links (e.g. card URL `shortLink`) work in most card endpoints in place of the full id.

Safety: this skill defaults to read/draft/recommend. Creating, updating, moving, or deleting boards/lists/cards, registering webhooks, and any bulk mutation require explicit human approval before executing.

## References

- REST API reference: https://developer.atlassian.com/cloud/trello/rest/
- API introduction & auth: https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
- Rate limits: https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/
- Webhooks: https://developer.atlassian.com/cloud/trello/rest/api-group-webhooks/
- Rate limits (support): https://support.atlassian.com/trello/docs/api-rate-limits/
