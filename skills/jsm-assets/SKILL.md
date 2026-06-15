---
name: jsm-assets
description: Query and manage Assets (formerly Insight) in Jira Service Management — object schemas, object types, attributes, objects, AQL (Assets Query Language), the Assets REST API, imports, and referencing assets from issues. Use when writing AQL queries, calling the Assets workspace API (api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1), finding a workspaceId, traversing object references with dot notation, or wiring an Assets object custom field to a JSM request.
---

# JSM Assets (formerly Insight)

Assets is JSM's CMDB. **Object schemas** contain **object types** (e.g. Laptop, Employee); each object type has **attributes**; **objects** are instances. **AQL** (Assets Query Language) queries objects. Assets requires a JSM Premium/Enterprise plan.

## Auth & base URL

- Base URL: `https://api.atlassian.com/jsm/assets/workspace/{workspaceId}/v1/...`. Auth via Basic (email + API token) or OAuth 2.0 3LO with Assets scopes (`read:cmdb-object:jira`, `write:cmdb-object:jira`, etc.).
- **Get the workspaceId:** call `GET https://<site>.atlassian.net/rest/servicedeskapi/assets/workspace` (returns `values[].workspaceId`). The workspaceId is stable per site.
- Note: there are two surfaces — the dedicated Assets API at `api.atlassian.com/jsm/assets/...` (primary) and a small `assets` group inside the JSM servicedeskapi.

## Core endpoints (under /workspace/{workspaceId}/v1)

| Action | Method + path |
|---|---|
| Query objects by AQL | `POST /object/aql` (body `{"qlQuery":"..."}`, `?startAt=&maxResults=`) |
| Get object | `GET /object/{id}` |
| Create object | `POST /object/create` |
| Update object | `PUT /object/{id}` |
| Delete object | `DELETE /object/{id}` |
| Object attributes (values) | `GET /object/{id}/attributes` |
| Object schemas | `GET /objectschema/list`, `GET /objectschema/{id}`, `.../objectschema/{id}/objecttypes` |
| Object types | `GET /objecttype/{id}`, `.../objecttype/{id}/attributes` |
| Object type attributes | `GET/POST /objecttypeattribute/{objectTypeId}` |
| AQL validation/navlist | `POST /object/navlist/aql` |
| Imports | `GET /importsource`, plus import-config and `POST` start-import endpoints |

## AQL syntax

`<attribute> <operator> <value/function>` joined with `AND`/`OR`/`NOT`. Operators: `=`, `!=`, `<` `>` `<=` `>=`, `LIKE`, `IN (...)`, `IS` / `IS NOT`, `HAVING`, `STARTSWITH`, `ENDSWITH`, `DOES NOT CONTAIN`.

```
objectType = "Laptop" AND Manufacturer = "Apple"
objectType = Office AND Name LIKE SYD
Name LIKE "Server" AND "Operating System" = "Linux"
"Belongs to Department".Name = HR        # dot notation traverses a reference attribute
Owner = currentUser()                     # functions: currentUser(), now(), user(), objectTypeAndChildren("...")
Created > now(-2w)
objectType IN ("Laptop", "Desktop")
```

- Quote attribute names and values that contain spaces with double quotes.
- **Keywords** (objectType, objectId, objectTypeId, Status, etc.) query object properties; bare names query attributes that must exist in the schema or the AQL is invalid.
- **Dot notation** (`<attr>.<attr>`) follows reference attributes across object types.
- `objectTypeAndChildren("Hardware")` matches a type and its descendants in the type hierarchy.

## Common workflows

1. **Find objects by AQL.** POST `/object/aql` `{"qlQuery":"objectType = Laptop AND Owner = currentUser()"}`; page with `startAt`/`maxResults`. Response caps `total` at 1000 and sets `hasMoreResults: true` beyond that.
2. **Discover a schema.** `GET /objectschema/list` -> pick schema -> `.../objectschema/{id}/objecttypes` -> `.../objecttype/{id}/attributes` to learn valid attribute names before writing AQL or creating objects.
3. **Create/update an object.** POST `/object/create` with `{"objectTypeId": <id>, "attributes":[{"objectTypeAttributeId": <id>, "objectAttributeValues":[{"value":"..."}]}]}`.
4. **Reference assets from an issue.** Add an **Assets object** custom field to a JSM request type and scope it with an AQL filter (e.g. `objectType = Laptop AND Owner = ${reporter}`); the field then stores object references on the issue.
5. **Bulk load.** Use **Imports** (CSV, external import sources) configured per object schema rather than scripting many `/object/create` calls.

## Gotchas / current changes

- The body key for AQL is `qlQuery` (not `jql`/`aql`).
- The old GET list-by-AQL endpoint was **deprecated (30 Sep 2024)** in favor of `POST /object/aql`; `total` is capped at 1000 with `hasMoreResults` for larger sets — paginate, don't rely on a true count.
- AQL is **not** JQL. Inside Jira you can use the `objectsByAql()` JQL function to filter issues by linked assets, but object queries themselves use AQL.
- Attribute names are case- and space-sensitive; an unknown attribute makes the whole AQL invalid.
- Assets is region/plan-gated (Premium+); the API 404s/403s if Assets is not provisioned for the site.

## Safety

Read/draft by default — AQL queries, schema/type/attribute reads, and `GET /object/{id}` are safe. Creating, updating, or deleting objects, running imports, and editing object types/attributes mutate the CMDB — require explicit human approval, and never bulk-delete or import into production without sign-off.

## References

- Assets REST API reference: https://developer.atlassian.com/cloud/assets/rest/intro/
- AQL group / object query: https://developer.atlassian.com/cloud/assets/rest/api-group-object/
- Assets REST API guide (workspaceId, workflow): https://developer.atlassian.com/cloud/assets/assets-rest-api-guide/workflow/
- AQL syntax (support): https://support.atlassian.com/assets/docs/use-assets-query-language-aql/
- Assets object custom field: https://support.atlassian.com/assets/docs/configure-the-assets-object-field/
