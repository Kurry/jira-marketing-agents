---
name: forge-webtriggers-events
description: Forge triggers and async events — the webtrigger module (and forge webtrigger URLs, static vs dynamic), scheduledTrigger intervals, the trigger module for Jira/Confluence/app/lifecycle events with filters, and the @forge/events async queue plus consumer module. Use when invoking a Forge function from an HTTP request, scheduling recurring jobs, reacting to product events like avi:jira:updated:issue, filtering events, or offloading long work to a queue/consumer.
---

# Forge Web Triggers & Events

Four ways to invoke a Forge function outside a UI: HTTP (`webtrigger`), schedule (`scheduledTrigger`), product/app events (`trigger`), and your own async queue (`@forge/events` + `consumer`). All run without a user context for triggers/scheduled jobs — use `api.asApp()`, not `asUser()`.

## Web trigger — HTTP entry point

```yaml
modules:
  webtrigger:
    - key: incoming-hook
      function: hook-fn
      urlFormat: v2          # use v2 for new triggers (installation-based domain)
      response:
        type: static         # static = no egress (Runs on Atlassian eligible); dynamic = can egress
        outputs:
          - key: ok
            statusCode: 200
            contentType: application/json
            body: '{"status":"ok"}'
  function:
    - key: hook-fn
      handler: index.hook
```

Get the URL: `forge webtrigger create` (pick installation + function). URLs are **public and unauthenticated** by the platform — implement your own auth (e.g. check an `Authorization` header) inside the handler. `asUser` does not work in web triggers (no attached user).

```js
// static: pick a configured output by key
export async function hook() { return { outputKey: 'ok' }; }
// dynamic: return your own response (statusCode required)
export async function hook() {
  return { statusCode: 200, contentType: 'application/json', body: JSON.stringify(data) };
}
```

`static` triggers can only egress via declared `outputs`; `dynamic` can fetch/return anything (a major-version egress change). Prefer `static` where possible.

## Scheduled trigger — recurring jobs

```yaml
modules:
  scheduledTrigger:
    - key: hourly
      function: tick
      interval: hour         # fiveMinute | hour | day | week
  function:
    - key: tick
      handler: index.tick
      timeoutSeconds: 120    # up to 900 (15 min) for longer runs
```

Up to **5** scheduled triggers per app. First run ~5 min after deploy; invocations are distributed across the interval per installation. No user context (`principal` is not a user); return values are ignored; thrown errors are **not retried** — runs again next interval. Editing any scheduled trigger resets all start times. Handle possible duplicate invocations idempotently.

## Trigger — product / app / lifecycle events

```yaml
modules:
  trigger:
    - key: on-issue-updated
      function: main
      events:
        - avi:jira:updated:issue        # Atlassian product event
      filter:
        ignoreSelf: true                # drop events your own app caused
        expression: event.issue.fields?.issueType.name == 'Bug'
        onError: RECEIVE_AND_LOG        # IGNORE_AND_LOG (default) | IGNORE | RECEIVE_AND_LOG | RECEIVE
      payload:
        include:
          propertyPaths:
            - "issue.properties['my.key'].field"
  function:
    - key: main
      handler: index.run
```

```js
export async function run(event, context) {
  // event = product-event payload; context = { principal, installContext, ... }
}
```

Fires on Atlassian product events, Forge app events, app lifecycle events, and data-security-policy events. Delivery may be delayed up to ~3 min. `filter` needs at least `ignoreSelf` or `expression`. Can also be declared as a dynamic module (Jira/Confluence, EAP) to add/remove triggers at runtime — the Forge equivalent of a Connect dynamic webhook.

## Async events — @forge/events + consumer

Offload long or bursty work (>25s of function time, AI calls, imports) to a queue processed by a consumer with up to 900s timeout.

```yaml
modules:
  consumer:
    - key: my-consumer
      queue: my-queue
      function: consume     # @forge/events v2+ uses `function` (v1.x used `resolver`)
  function:
    - key: consume
      handler: consumer.handler
      timeoutSeconds: 600
```

```js
import { Queue } from '@forge/events';
const queue = new Queue({ key: 'my-queue' });

// Push: up to 50 events/request, <=200 KB total, delayInSeconds up to 900, optional concurrency
const { jobId } = await queue.push([{ body: { id: 1 } }, { body: { id: 2 } }]);

// Track / cancel
const stats = await queue.getJob(jobId).getStats();   // { success, inProgress, failed }
```

```js
import { AsyncEvent, InvocationError, InvocationErrorCode } from '@forge/events';
export async function handler(event) {
  // event.retryContext = { retryCount, retryReason, retryData, retentionWindow }
  if (rateLimited) {
    return new InvocationError({              // request a retry
      retryAfter: 30,                          // <= 900s
      retryReason: InvocationErrorCode.FUNCTION_UPSTREAM_RATE_LIMITED,
    });
  }
}
```

Delivery is **at-least-once** within a 24h retention window (extendable to 96h on platform errors); retries use exponential backoff up to ~15 min. Design consumers to be idempotent.

## Common workflows

1. External system -> Forge: `webtrigger` (auth in handler), prefer `static` egress.
2. Recurring job: `scheduledTrigger` (<=5, idempotent, no user).
3. React to Jira/Confluence changes: `trigger` with `events` + `filter` (`ignoreSelf` to avoid loops).
4. Long/bursty work: push to a `@forge/events` Queue, process in a `consumer` with raised `timeoutSeconds`; return `InvocationError` to retry.

## Gotchas

- Web trigger URLs are unauthenticated and public — never assume the platform secured them.
- Scheduled/web/trigger functions have no user; `asUser()` fails — use `asApp()`.
- Scheduled-trigger errors do not retry; product-event delivery can lag ~3 min; async events can be delivered more than once.
- Switching a web trigger between `static`/`dynamic` or `urlFormat` v1<->v2 changes URLs/versioning.
- `@forge/events` v1.x consumers use `resolver` (deprecated) vs v2+ `function` — match your package major version.

## Safety

These modules invoke code on external/scheduled/event input and can mutate Atlassian data. Authenticate web triggers, scope egress narrowly, keep handlers idempotent, and treat new egress (dynamic web triggers) or production rollout as major changes requiring explicit human approval and admin re-consent.

## References

- Web trigger module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/
- Scheduled trigger module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/scheduled-trigger/
- Trigger module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/trigger/
- Consumer module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/consumer/
- Async Events API: https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/
- Product events: https://developer.atlassian.com/platform/forge/events-reference/product_events/
