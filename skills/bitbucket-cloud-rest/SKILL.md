---
name: bitbucket-cloud-rest
description: Call the Bitbucket Cloud REST API 2.0 for workspaces, repositories, pull requests, commits, branches, pipelines, and webhooks. Use when scripting Bitbucket Cloud, creating/merging/approving/declining PRs, listing commits or branches, triggering pipelines, managing webhooks, handling values+next pagination, or choosing auth (API tokens, access tokens, OAuth) amid the app-password deprecation.
---

# Bitbucket Cloud REST API 2.0

REST API for Bitbucket Cloud. JSON over HTTPS.

## Auth & base URL

- **Base URL:** `https://api.bitbucket.org/2.0/`
- **API tokens (recommended, replaces app passwords):** Basic auth where username = your **Atlassian account email**, password = the **API token**. Tokens require an expiry (max 1 year) and carry privilege scopes. Created at id.atlassian.com.
- **Access tokens (repository / project / workspace):** bound to a resource, not a user. Send as `Authorization: Bearer <token>`. Best for CI/CD and integrations scoped to one repo/workspace.
- **OAuth 2.0:** for apps acting on behalf of users; `Authorization: Bearer <access_token>`. Scopes like `repository`, `repository:write`, `pullrequest`, `pullrequest:write`, `pipeline`, `webhook`, `account`.
- **App passwords: DEPRECATED.** Creation disabled Sept 9 2025; brownouts begin Jun 9 2026; fully disabled **Jul 28 2026**. Migrate to API tokens. (Atlassian account passwords for API/Git were already disabled Mar 2022.)

## Core endpoints

Paths are relative to `https://api.bitbucket.org/2.0/`. `{workspace}` and `{repo_slug}` identify the repo.

| Area | Endpoint |
|---|---|
| Workspaces | `GET /workspaces`, `GET /workspaces/{workspace}` |
| Repositories | `GET /repositories/{workspace}`, `GET|POST|PUT|DELETE /repositories/{workspace}/{repo_slug}` |
| Pull requests | `GET|POST /repositories/{workspace}/{repo_slug}/pullrequests` |
| PR detail | `GET|PUT /repositories/{workspace}/{repo_slug}/pullrequests/{id}` |
| PR merge | `POST .../pullrequests/{id}/merge` |
| PR approve | `POST|DELETE .../pullrequests/{id}/approve` |
| PR decline | `POST .../pullrequests/{id}/decline` |
| PR request-changes | `POST|DELETE .../pullrequests/{id}/request-changes` |
| Commits | `GET .../commits`, `GET .../commit/{sha}` |
| Branches (refs) | `GET .../refs/branches`, `POST|DELETE .../refs/branches/{name}` |
| Pipelines | `GET|POST .../pipelines/`, `GET .../pipelines/{uuid}`, `POST .../pipelines/{uuid}/stopPipeline` |
| Webhooks | `GET|POST .../hooks`, `GET|PUT|DELETE .../hooks/{uid}` |

## Pagination

Responses are paginated objects:
```json
{ "size": 142, "page": 1, "pagelen": 10,
  "next": "https://api.bitbucket.org/2.0/...?page=2",
  "previous": null,
  "values": [ ... ] }
```
- Iterate by following `next` verbatim until it is absent — do **not** construct page numbers (the cursor can be an opaque hash). `pagelen` is adjustable (commonly up to 100). `size`/`page` may be omitted on some iterator endpoints.

## Common workflows

1. **Create a PR:** `POST .../pullrequests` with `{ "title", "source": {"branch":{"name":"feature"}}, "destination": {"branch":{"name":"main"}} }`.
2. **Approve then merge:** `POST .../pullrequests/{id}/approve`, then `POST .../pullrequests/{id}/merge` (optionally `{"merge_strategy":"squash","close_source_branch":true}`). Sending a `message`/body on merge has had quirks — keep merge payloads minimal.
3. **Decline a PR:** `POST .../pullrequests/{id}/decline`.
4. **Trigger a pipeline:** `POST .../pipelines/` with a `target` (branch + optional selector/variables).
5. **Register a webhook:** `POST .../hooks` with `url`, `active`, and `events` (e.g. `pullrequest:created`, `repo:push`).
6. **List commits on a branch:** `GET .../commits/{branch}` and follow `next`.

## Gotchas / current changes

- **401 on Basic auth** usually means an app password (deprecated) or using a real password — switch to an API token with email as username.
- API tokens always expire (≤1 year); plan rotation.
- Access tokens cannot be used for interactive Git over HTTPS the same way as user creds; scope them to the resource.
- Some collection endpoints support `q` (BBQL filtering) and `sort`; use them to avoid deep pagination.

## Safety

Read/draft by default. Merging/declining PRs, deleting branches/repos/webhooks, force-pushing, and triggering production pipelines are mutating actions requiring explicit human approval.

## References

- REST API: https://developer.atlassian.com/cloud/bitbucket/rest/
- Using API tokens: https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/
- App password deprecation: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/
- Changelog: https://developer.atlassian.com/cloud/bitbucket/changelog/
- Webhooks: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-webhooks/
