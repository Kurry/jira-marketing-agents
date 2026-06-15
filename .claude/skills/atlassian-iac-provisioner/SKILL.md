---
name: atlassian-iac-provisioner
description: >
  Best practices and critical gotchas for writing idempotent Jira Cloud
  provisioning scripts (IaC). Use this skill whenever you are writing,
  reviewing, or debugging Node.js/shell scripts that call the Jira REST API
  to create or discover issue types, custom fields, workflow statuses, or
  field options. Use it when you see errors like 403 on Jira REST calls,
  "Specify a valid issue type" when creating issues, silent duplicate
  resources being created, or when someone mentions provision:jira,
  provision:all, or instances/aigo.example.json. Also use it when someone
  asks why a Jira API call returns 400/403 unexpectedly.
---

# Atlassian Jira Cloud IaC — Provisioning Gotchas

This skill captures hard-won lessons from building idempotent Jira provisioning
scripts for Jira Work Management (business/next-gen) projects via the REST API.
Every pattern here was learned from a concrete failure.

---

## 1. OAuth Bearer tokens must target api.atlassian.com

**The mistake:** Using `https://{site}.atlassian.net/rest/api/3/...` as the base URL
when the token was obtained via OAuth (acli login, Forge, MCP, or any 3-legged OAuth flow).

**The error:** HTTP 403 `{"error": "Failed to parse Connect Session Auth Token"}`

**Why it happens:** Jira Cloud has two URL surfaces:
- `{site}.atlassian.net` — intended for browser sessions and Connect app tokens
- `api.atlassian.com/ex/jira/{cloudId}` — intended for OAuth 2.0 Bearer tokens

The token type and the URL must match. An OAuth token sent to the site URL is
interpreted as a Connect Session token (wrong type) and rejected.

**The fix:**
```javascript
// WRONG — fails with 403 for OAuth tokens
const baseUrl = `https://${config.site}`;

// CORRECT — use the API gateway with the cloud ID
const baseUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}`;
```

The `cloudId` is a UUID available via `GET https://api.atlassian.com/oauth/token/accessible-resources`
or stored in your instance config (e.g., `instances/aigo.example.json`).

---

## 2. GET /rest/api/3/field silently drops custom fields past ~50

**The mistake:** Using the flat `GET /rest/api/3/field` endpoint to discover all
custom fields before deciding whether to create new ones.

**The error:** No error — script silently creates duplicates because it can't see the
existing fields, then Jira allows duplicate field names. Next run discovers *both*
copies and picks whichever is returned first (non-deterministic).

**Why it happens:** `GET /rest/api/3/field` returns an unordered, non-paginated
array. On instances with many standard fields it simply omits custom fields once
the internal limit is reached. No `total` or `isLast` indicator is returned.

**The fix:** Use the paginated search endpoint:
```javascript
// WRONG — silently truncated
const allFields = await jiraCall({ method: "GET", url: `${baseUrl}/rest/api/3/field` });

// CORRECT — paginated, exhaustive
const allCustomFields = [];
let startAt = 0;
while (true) {
  const page = await jiraCall({
    method: "GET",
    url: `${baseUrl}/rest/api/3/field/search?type=custom&maxResults=100&startAt=${startAt}`,
  });
  const vals = Array.isArray(page) ? page : (page.values || []);
  allCustomFields.push(...vals);
  if (page.isLast || vals.length < 100) break;
  startAt += 100;
}
```

---

## 3. Status discovery: two endpoints do completely different things

**The mistake:** Using `GET /rest/api/3/statuses` (plural) to list all statuses,
or using `GET /rest/api/3/status` (singular) expecting it to return project-scoped
status records.

**The errors:**
- `GET /rest/api/3/statuses` → 400 `"Required parameter 'id' is not present."` (it's a batch-lookup, not a list)
- `GET /rest/api/3/status?projectId=X` → returns only the 3 statuses in the project's *active workflow* (misses project-scoped status records that exist but aren't wired to a board column yet)

**Why it happens:** Jira has two separate concepts:
- **Status records**: entities created via `POST /rest/api/3/statuses` — exist in the system but may not be used anywhere
- **Workflow-active statuses**: statuses attached to the project's board; returned by `GET /rest/api/3/status?projectId=X`

Project-scoped status records (e.g., Intake, Triage) appear to not exist if you only query the active workflow, so a naive check will try to re-create them.

**The fix:** Use the batch lookup (`GET /rest/api/3/statuses?id=X&id=Y`) to scan a known
ID range and build a name→id map:
```javascript
const CHUNK_SIZE = 50; // API limit per request
const allFoundStatuses = [];
for (let start = 10000; start <= 10100; start += CHUNK_SIZE) {
  const end = Math.min(start + CHUNK_SIZE - 1, 10100);
  const idParams = Array.from({ length: end - start + 1 }, (_, i) => `id=${start + i}`).join("&");
  const chunk = await jiraCall({ method: "GET", url: `${baseUrl}/rest/api/3/statuses?${idParams}` });
  if (Array.isArray(chunk)) allFoundStatuses.push(...chunk);
}
const existingByName = new Map(allFoundStatuses.map((s) => [s.name, s]));
```

Jira Cloud status IDs start at 10000 and increment. Scanning 10000–10100 covers typical
provisioning ranges without hitting the 50-ID-per-request limit.

For **creating** statuses, the correct endpoint is `POST /rest/api/3/statuses` with body:
```json
{ "statuses": [{ "name": "Intake", "statusCategory": "TODO", "scope": { "type": "PROJECT", "project": { "id": "10000" } } }] }
```
Note the wrapper object `{ "statuses": [...] }` — sending a bare array returns 400.

---

## 4. Team-managed (next-gen) projects cannot have custom issue types added via REST

**The mistake:** Calling `POST /rest/api/3/issuetype` with `scope: { type: "PROJECT", project: { id: "..." } }` expecting it to create a project-scoped type usable in a next-gen project.

**The errors:**
- The POST succeeds (201) but creates a *global* type — the scope parameter is silently ignored
- Later, `createIssue` with that type ID returns 400 `{"issuetype": "Specify a valid issue type"}`
- Running the script twice causes 409 `"An issue type with this name already exists"` because a global type was created on the first run

**Why it happens:** Jira Work Management (Business) team-managed projects manage issue types
through a completely separate path (Project Settings → Issue Types UI). The REST API for issue
type creation only affects the global issue type namespace. Global types are not available in
team-managed projects regardless of how they were created.

**How to detect team-managed:**
```javascript
const projectMeta = await jiraCall({ method: "GET", url: `${baseUrl}/rest/api/3/project/${projectKey}` });
const isTeamManaged = projectMeta.style === "next-gen" || projectMeta.simplified === true;
```

**The only way to add custom issue types to a team-managed project:** Project Settings → Issue Types → Add issue type (UI only).

**What to do in an IaC script:**
```javascript
if (isTeamManaged) {
  // Check what's already there (types added via UI)
  const projectTypes = await jiraCall({ method: "GET", url: `${baseUrl}/rest/api/3/issuetype/project?projectId=${projectId}` });
  const existingByName = new Map(projectTypes.map((t) => [t.name, t]));
  for (const desired of issueTypes) {
    if (existingByName.has(desired.name)) {
      console.log(`EXISTS ${desired.name}`);
    } else {
      console.log(`MANUAL REQUIRED: ${desired.name} — add via Project Settings → Issue Types`);
      // DO NOT attempt POST — it will create orphaned global types
    }
  }
}
```

---

## 5. Cleaning up orphaned global types

If global issue types were accidentally created (the 409-then-AIGO-rejects pattern), clean up:

1. List orphans: `GET /rest/api/3/issuetype` — filter by `!type.scope?.project` or by ID range
2. Delete each: `DELETE /rest/api/3/issuetype/{id}` — returns 204 on success
3. If the last global type at hierarchyLevel 0 can't be deleted (409 "last issue type on base level"), rename it to a placeholder first: `PUT /rest/api/3/issuetype/{id}` with `{ "name": "_placeholder_" }`, then create your desired type, then the placeholder can remain as the system anchor

---

## Quick reference

| Task | Correct endpoint | Common mistake |
|------|-----------------|----------------|
| List custom fields | `GET /rest/api/3/field/search?type=custom&maxResults=100` | `GET /rest/api/3/field` (truncated) |
| Find status records by name | `GET /rest/api/3/statuses?id=10000&id=10001&...` (scan range, ≤50/req) | `GET /rest/api/3/status` (only active workflow) |
| Create statuses (batch) | `POST /rest/api/3/statuses` body: `{ "statuses": [...] }` | bare array in body → 400 |
| List project issue types | `GET /rest/api/3/issuetype/project?projectId={id}` | `GET /rest/api/3/issuetype` (global only) |
| Check project type | `GET /rest/api/3/project/{key}` → check `style` and `simplified` fields | assuming company-managed |
| OAuth base URL | `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...` | `https://{site}.atlassian.net/rest/api/3/...` |

---

## Token resolution (macOS + acli)

When using acli-managed OAuth tokens locally:

```javascript
function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) return process.env.ATLASSIAN_TOKEN.trim();
  if (process.platform === "darwin") {
    // acli stores an OAuth token as go-keyring-base64:gzip(json)
    const raw = execSync(
      `security find-generic-password -l "acli" -w | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"`,
      { encoding: "utf8" }
    ).trim();
    if (raw) return raw;
  }
  return null;
}
```

If `security find-generic-password -l "acli" -w | head -c 20` doesn't start with `go-keyring-base64:`, the token format has changed — don't blindly use it as a Bearer token. Run `acli jira project list --recent 1` first to force a token refresh, then re-extract.
