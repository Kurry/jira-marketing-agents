---
name: forge-platform
description: Atlassian Forge app fundamentals — manifest.yml structure, the Forge CLI, @forge/api product fetch, @forge/bridge, storage, egress/remotes, scopes, lifecycle and limits. Use when scaffolding or deploying a Forge app, editing manifest.yml, choosing modules/scopes, calling Jira/Confluence REST as app vs user, configuring storage or remotes, debugging forge deploy/install/tunnel, or asking about Forge environments, runtime versions, or platform quotas.
---

# Forge Platform

Atlassian Forge is the serverless platform for building Atlassian Cloud apps (Jira, Confluence, JSM, Bitbucket, Compass, Rovo). Apps are declared in `manifest.yml`, run on a managed Node.js runtime, and are deployed/installed via the Forge CLI. This is the general platform reference; for this repo's operational runbook see `forge-rovo-jira-ops`.

## manifest.yml structure

Three required top-level keys: `app`, `modules`, `permissions`. Optional: `resources`, `remotes`, `endpoint`, `providers`, `environment`, `translations`, `connectModules`. Max manifest size 200 KB.

```yaml
app:
  id: "ari:cloud:ecosystem::app/<uuid>"   # set by forge register/create
  runtime:
    name: nodejs22.x            # nodejs24.x recommended; 20/22/24 supported
  licensing:
    enabled: true               # optional, for Marketplace paid apps
permissions:
  scopes:
    - read:jira-work            # least-privilege; declare only what you use
    - write:jira-work
  external:
    fetch:
      backend:
        - "https://api.example.com"   # egress allowlist (also see remotes)
modules:
  jira:issuePanel:
    - key: my-panel
      resource: main
      title: My Panel
  function:
    - key: handler
      handler: index.run
      timeoutSeconds: 60        # optional, 1-900; default 55s
resources:
  - key: main
    path: static/build
```

- `runtime.name`: prefer `nodejs24.x` (or `nodejs22.x`). Legacy JS sandbox runtime is removed — all apps must be on a current runtime.
- `runtime.memoryMB` (128-1024, default 512) and `runtime.architecture` (`x86_64` default, `arm64` cheaper/faster, not on Gov Cloud).
- `resources` map module UIs to a built static dir (UI Kit / Custom UI).
- `remotes` declare external services for egress (and data-residency egress config); `endpoint` declares Forge Remote routes.

## Permissions and scopes

- Scopes are OAuth 2.0 scopes (e.g. `read:jira-work`, `write:jira-work`, `manage:jira-configuration`, `read:confluence-content.all`, `read:chat:rovo`).
- Adding or widening a scope triggers a **major version** and requires admins to re-consent on upgrade. Keep scopes minimal.
- `permissions.external.fetch` plus `remotes` gate all outbound egress; undeclared egress is blocked.

## Forge CLI

```bash
forge register                 # claim an app id (writes app.id into manifest)
forge create                   # scaffold a new app from a template
forge deploy                   # build + deploy code to an environment
forge deploy -e production     # environments: development (default) | staging | production
forge install                  # install the deployed app onto a site (interactive)
forge install --upgrade        # apply a new major version / re-consent scopes
forge install list             # show installations and Up-to-date status
forge tunnel                   # run functions locally against a live install (dev only)
forge lint                     # validate manifest + common issues
forge logs                     # fetch function invocation logs
forge webtrigger               # print a web trigger URL (see forge-webtriggers-events)
forge variables set --encrypt  # set environment variables / secrets per environment
```

Flow: `register` (once) -> `deploy` -> `install`. Code changes need `deploy`; new scopes/major versions need `install --upgrade`.

## Product fetch — @forge/api

Call Jira/Confluence REST from a function. `asApp()` uses the app's own identity (app scopes, runs without a user, e.g. in triggers/scheduled jobs). `asUser()` runs as the invoking user (respects their permissions; not available where there is no user, like web triggers or scheduled triggers).

```js
import api, { route } from '@forge/api';

// As the app (system identity)
const res = await api.asApp().requestJira(route`/rest/api/3/issue/${key}`);
const issue = await res.json();

// As the requesting user
await api.asUser().requestJira(route`/rest/api/3/issue/${key}/comment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ body: adfDoc }),
});
```

Always build paths with the `route` tagged template to avoid injection. Use `asApp()` for background work; use `asUser()` when actions must honor the user's permissions.

## UI — @forge/bridge

Frontend (UI Kit or Custom UI) talks to the backend and product via `@forge/bridge`:

```js
import { invoke, requestJira, view } from '@forge/bridge';
const data = await invoke('resolverKey', { id });   // call a Forge resolver
const ctx = await view.getContext();                // module/product context
```

`@forge/react` powers UI Kit components; Custom UI hosts your own static bundle and uses the bridge for product/data access. `@forge/bridge` and `@forge/react` are never packaged into backend functions.

## Storage

- **Key-Value store** and **Entity store** (custom entities + indexes declared under `app.storage`) for structured, queryable app data.
- **Cache** for short-lived data. Use `@forge/kvs` / storage APIs; see Storage reference.
- Do not persist customer data to local disk or beyond a single invocation.

## App lifecycle and limits

- Environments: `development`, `staging`, `production`; promote by deploying to each.
- Versioning: code-only changes are minor; new egress, new scopes, or new dynamic capabilities are major and force admin re-consent.
- Limits: per-invocation timeout (default 55s, up to 900s on `timeoutSeconds`), function memory, invocation quotas, and manifest size (200 KB). Check the platform quotas page before designing high-volume jobs.

## Gotchas

- Forge evolves fast; several Jira/Rovo modules are **Preview** or **EAP** (shorter deprecation windows, not always production-safe). Note status before relying on them.
- `asUser()` fails in contexts with no user (web/scheduled triggers) — use `asApp()` there.
- Egress is deny-by-default: declare every external host in `external.fetch`/`remotes` or fetch is blocked.
- A missing/placeholder `app.id` blocks deploy — run `forge register` first.

## Safety

Forge apps can mutate Atlassian data. Default to least-privilege scopes and read-only where possible. Adding write scopes, new egress, or deploying to `production` is a major change requiring admin re-consent — treat it as requiring explicit human approval.

## References

- Manifest reference: https://developer.atlassian.com/platform/forge/manifest-reference/
- Permissions/scopes: https://developer.atlassian.com/platform/forge/manifest-reference/permissions/
- CLI reference: https://developer.atlassian.com/platform/forge/cli-reference/
- Product Fetch API: https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api/
- Storage reference: https://developer.atlassian.com/platform/forge/storage-reference/
- Platform quotas and limits: https://developer.atlassian.com/platform/forge/platform-quotas-and-limits/
