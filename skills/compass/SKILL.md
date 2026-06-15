---
name: compass
description: Query and configure Atlassian Compass (software catalog) via its GraphQL API, REST metrics endpoint, and compass.yml config-as-code. Use when working with Compass components (services/libraries/apps), scorecards, metrics & metric sources, custom fields, component relationships/dependencies, the catalog, cloudId lookup, createComponent mutations, or Forge data-provider apps.
---

# Compass

Atlassian Compass is a developer-experience platform with a software catalog of components (services, libraries, apps), scorecards for health, and metrics. Primary programmatic surface is GraphQL; metrics ingestion is REST.

## Auth & base URLs

- **GraphQL (OAuth 2.0 / 3LO apps):** `POST https://api.atlassian.com/graphql`
- **GraphQL (browser session / API token on a tenant):** `https://<site>.atlassian.net/gateway/api/graphql`
- **GraphQL explorer (interactive, signed-in):** https://developer.atlassian.com/cloud/compass/graphql/explorer/
- **Metrics REST:** `POST https://api.atlassian.com/compass/v1/metrics`
- **Forge apps:** use the GraphQL API toolkit (`@atlassian/forge-graphql`) — calls the gateway with the app's identity; no manual endpoint/token wiring.
- Most operations require `cloudId` (per Atlassian site). Look it up first (see workflow).

## Core objects

| Object | Notes |
|---|---|
| Component | A catalog entry. `typeId` is one of `SERVICE`, `LIBRARY`, `APPLICATION`, `CAPABILITY`, `CLOUD_RESOURCE`, `DATA_PIPELINE`, `MACHINE_LEARNING_MODEL`, `UI_ELEMENT`, `WEBSITE`, `OTHER`. `name` + `typeId` are mandatory. |
| Relationship | Directed link between components (e.g. `DEPENDS_ON`). Models dependencies. |
| Scorecard | Set of criteria measuring component health; components are scored against it. |
| Metric (metric definition) | Quantifiable measure; predefined or custom. |
| Metric source | Per-component binding that receives metric values (created before pushing values). |
| Custom field (field definition) | Org-defined typed attributes attached to components. |
| Event source | Endpoint for ingesting deployment/build/other events used to derive metrics. |

## Key GraphQL operations

- `tenantContexts(hostNames: [...]) { cloudId }` — resolve cloudId.
- `compass.createComponent(cloudId, input)` — create component.
- `compass.updateComponent` / `deleteComponent` — mutate (delete is destructive).
- `compass.createComponentRelationship` — wire dependencies.
- `compass.createMetricSource` / `createCustomFieldDefinition` — set up metrics/fields.
- Scorecard types/queries exist (e.g. `CompassScorecard`); confirm exact mutation names in the GraphQL reference before relying on them.
- Full reference: https://developer.atlassian.com/cloud/compass/graphql/

## compass.yml (config as code)

A `compass.yml` checked into a repo declares a component declaratively and binds it to that repo. Connecting the repo makes Compass manage the component from the file.

Typical structure:
```yaml
# compass.yml
name: payments-service
description: Handles checkout payments
configVersion: 1
typeId: SERVICE
fields:
  tier: 1
links:
  - type: REPOSITORY
    url: https://bitbucket.org/acme/payments
relationships:
  DEPENDS_ON:
    - <component-ari>
```
Components managed by config-as-code are edited via the file, not the UI; disconnecting hands control back to the UI. See: https://developer.atlassian.com/cloud/compass/config-as-code/structure-and-contents-of-a-compass-yml-file/

## Common workflows

1. **Create a component via API:** open the GraphQL explorer → query `tenantContexts` for `cloudId` → run `createComponent` mutation with `name` + `typeId`.
2. **Push metric values:** create a metric source for the component, then `POST /compass/v1/metrics` with the metric definition id, value, and timestamp (cURL/CI works).
3. **Model dependencies:** create both components, then `createComponentRelationship` with `DEPENDS_ON`.
4. **Manage via repo:** add `compass.yml`, connect the repo, let Compass reconcile.
5. **Forge integration:** scaffold a Compass app (`forge create`), use the GraphQL toolkit to read/write catalog data and a data-provider module to feed events/metrics.

## Gotchas / current changes

- **Transition to DX:** Atlassian has stated Compass scorecards and catalog functionality will transition into the DX Engineering Intelligence Platform. Confirm current product status and migration path before building net-new on scorecards.
- Recommended ceiling ~20,000 components per site before performance degradation.
- `typeId` enum values are exact; an invalid value is the most common create error.
- Mutations return a `success` boolean plus errors — check both, don't assume HTTP 200 means it worked.

## Safety

Read/draft/recommend by default. Deleting components, relationships, scorecards, or custom-field definitions, or bulk catalog mutations, require explicit human approval.

## References

- Compass docs: https://developer.atlassian.com/cloud/compass/
- Create components via API: https://developer.atlassian.com/cloud/compass/components/create-components-using-the-api/
- GraphQL reference: https://developer.atlassian.com/cloud/compass/graphql/
- Metrics REST: https://developer.atlassian.com/cloud/compass/rest/api-group-metrics/
- Scorecards: https://developer.atlassian.com/cloud/compass/scorecards/use-metrics-with-scorecards/
- compass.yml: https://developer.atlassian.com/cloud/compass/config-as-code/structure-and-contents-of-a-compass-yml-file/
