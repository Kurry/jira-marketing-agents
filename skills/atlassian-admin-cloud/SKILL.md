---
name: atlassian-admin-cloud
description: Administer an Atlassian cloud organization via admin.atlassian.com and the cloud admin REST APIs. Use when managing users/groups, SCIM provisioning, reading the audit-log events API, handling managed accounts, org API keys, data residency, security policies, or deciding whether an action is available via REST vs admin-UI-only.
---

# Atlassian Cloud Admin

Org-level administration of Atlassian cloud products. UI lives at **admin.atlassian.com**; programmatic surface is the cloud admin REST APIs. Many governance settings are **UI-only**.

## Auth & base URLs

- **Admin UI:** https://admin.atlassian.com (org → products, users, groups, security, billing).
- **Org API base:** `https://api.atlassian.com/admin/v1/orgs/{orgId}/...`
- **Auth:** org **API key** as `Authorization: Bearer <key>` (created in admin → Settings → API keys), or OAuth 2.0 with admin scopes (e.g. `read:events:admin`). Org API keys are tied to the org and should be treated as secrets.
- Get `orgId` from admin → Settings, or the org-listing endpoint.

## Cloud admin REST APIs

| API | Purpose | Base |
|---|---|---|
| Organizations REST API | Read org details, domains, manage users/groups, audit events | `/admin/v1/orgs/{orgId}` |
| User management REST API | Grant/remove access, manage group membership, suspend/restore | (admin user-management) |
| User provisioning (SCIM) REST API | Provision/deprovision users & groups from an IdP (SCIM 2.0) | (admin user-provisioning) |

### Useful endpoints
- `GET /admin/v1/orgs` — list orgs the key can access.
- `GET /admin/v1/orgs/{orgId}` — org detail.
- `GET /admin/v1/orgs/{orgId}/users` — managed users.
- `GET /admin/v1/orgs/{orgId}/groups`, `POST .../groups`, add/remove user to group.
- **Audit log:**
  - `GET /admin/v1/orgs/{orgId}/events` — filtered audit events (granular querying).
  - `GET /admin/v1/orgs/{orgId}/events-stream` — paginated, time-based polling.
  - `GET /admin/v1/orgs/{orgId}/events/{eventId}` — single event.
  - `GET /admin/v1/orgs/{orgId}/event-actions` — list of event action types.
- **SCIM:** standard SCIM 2.0 routes (`/Users`, `/Groups`) under the user-provisioning base, called by your IdP connector.

## What is API vs UI-only

| Action | Surface |
|---|---|
| List/read users, groups, domains | REST (org/user-management) |
| Add/remove user to group, suspend/restore access | REST (user-management) |
| Provision/deprovision via IdP | SCIM REST (driven by IdP) |
| Read audit log events | REST (events) |
| Delete a managed account | REST (user-management delete-managed-account) |
| Data residency (pin/move data location) | **Admin UI** (move is a scheduled operation, not a simple API write) |
| Security policies: SSO/SAML, enforced 2FA, password policy, session duration, IP allowlists, mobile/data-export policies | **Admin UI** (authentication policies) — largely not REST-writable |
| API key creation | **Admin UI** |
| Managed-account verification (domain claim) | **Admin UI** |

Be explicit with users: governance/security toggles are mostly clicked in admin.atlassian.com, not scripted.

## Common workflows

1. **Audit export pipeline:** poll `GET .../events-stream` with a time window, page via the cursor, store JSON downstream.
2. **Joiner/mover/leaver:** prefer **SCIM from the IdP** as source of truth; use user-management REST for ad-hoc grant/suspend.
3. **Deprovision:** suspend access (reversible) before deleting a managed account (irreversible).
4. **Group-driven access:** add user to a group whose product access encodes the entitlement, rather than per-user grants.

## Gotchas / current changes

- **Audit retention ~180 days** in-product — export to keep longer.
- Some audit event categories (e.g. certain login events) may require a specific org plan to surface via API.
- Managed accounts require **verified domains**; without verification the org can't govern those accounts.
- "Org" vs "site" vs "product" scoping matters — `orgId` is the top container; product/site config has separate Jira/Confluence admin APIs.

## Safety

Read/draft/recommend by default. **Deprovisioning or deleting managed accounts, suspending users, removing access, changing security/authentication policies, or altering data residency require explicit human approval** and should be confirmed against the org's change process. Never log API keys or PHI.

## References

- Cloud admin hub: https://developer.atlassian.com/cloud/admin/
- Organizations REST API: https://developer.atlassian.com/cloud/admin/organization/rest/
- Audit events API: https://developer.atlassian.com/cloud/admin/organization/rest/api-group-events/
- User management REST API: https://developer.atlassian.com/cloud/admin/user-management/rest/
- SCIM provisioning: https://developer.atlassian.com/cloud/admin/user-provisioning/about/
- Admin cookbook: https://developer.atlassian.com/cloud/admin/cookbook/
