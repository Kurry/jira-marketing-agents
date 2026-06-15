#!/usr/bin/env node
"use strict";

// scripts/provision-jira.cjs
// Idempotent Jira provisioning script for the AIGO project.
// Creates issue types, custom fields, workflow statuses, and field options
// by first checking what already exists (GET by name) and only POSTing what
// is missing. Running twice against the same instance is a no-op.
//
// NIH classification (T-NIH-07): documented-API-gap.
// This script binds to the documented Jira Cloud REST API v3. The
// Atlassian-native first-choice owners are ACLI (`jira field`, `jira project`)
// and a golden company-managed template project (see the Native Tool Fit
// Matrix in specs/atlassian-native-tools.md). REST is used here only where
// ACLI/template cloning do not yet cover the operation (e.g. project-scoped
// status records, paginated field search). Keep these REST calls thin and
// tied to documented endpoints; do not depend on private Atlassian endpoints.
//
// Usage:
//   node scripts/provision-jira.cjs [--config <path>] [--dry-run]
//
// Defaults:
//   --config   instances/aigo.example.json
//   --dry-run  validate config shape only, no API calls, exit 0

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, config: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Config validation (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Validate that a config object has all required fields.
 * Returns null if valid, or an error string if invalid.
 * @param {object} config
 * @returns {string|null}
 */
function validateConfig(config) {
  if (!config || typeof config !== "object") {
    return "Config must be a JSON object";
  }
  if (!config.cloudId) {
    return "Config missing required field: cloudId";
  }
  if (!config.projectId) {
    return "Config missing required field: projectId";
  }
  if (!config.jiraConfig || typeof config.jiraConfig !== "object") {
    return "Config missing required field: jiraConfig";
  }

  const { jiraConfig } = config;

  // Validate issueTypes
  if (!Array.isArray(jiraConfig.issueTypes) || jiraConfig.issueTypes.length === 0) {
    return "jiraConfig.issueTypes must be a non-empty array";
  }
  for (const it of jiraConfig.issueTypes) {
    if (!it.name) return `issueType missing required field: name (got: ${JSON.stringify(it)})`;
    if (!it.description) return `issueType '${it.name}' missing required field: description`;
    if (!it.type) return `issueType '${it.name}' missing required field: type`;
  }

  // Validate customFields
  if (!Array.isArray(jiraConfig.customFields) || jiraConfig.customFields.length === 0) {
    return "jiraConfig.customFields must be a non-empty array";
  }
  for (const cf of jiraConfig.customFields) {
    if (!cf.name) return `customField missing required field: name (got: ${JSON.stringify(cf)})`;
    if (!cf.type) return `customField '${cf.name}' missing required field: type`;
    if (!cf.searcherKey) return `customField '${cf.name}' missing required field: searcherKey`;
    if (!cf.forgeVar) return `customField '${cf.name}' missing required field: forgeVar`;
  }

  // Validate workflowStatuses
  if (!Array.isArray(jiraConfig.workflowStatuses) || jiraConfig.workflowStatuses.length === 0) {
    return "jiraConfig.workflowStatuses must be a non-empty array";
  }
  for (const ws of jiraConfig.workflowStatuses) {
    if (!ws.name) return `workflowStatus missing required field: name (got: ${JSON.stringify(ws)})`;
    if (!ws.statusCategory) return `workflowStatus '${ws.name}' missing required field: statusCategory`;
  }

  // Validate fieldOptions (optional but if present must be an object)
  if (jiraConfig.fieldOptions !== undefined && typeof jiraConfig.fieldOptions !== "object") {
    return "jiraConfig.fieldOptions must be an object if present";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Idempotency diffing (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Given a list of existing items and desired items, return only the items
 * that are missing from the existing list.
 *
 * @param {Array} existing - items already present (each has a key)
 * @param {Array} desired - items we want to ensure exist
 * @param {function} keyFn - function(item) => string key to match on
 * @returns {Array} items from desired that are not in existing
 */
function diffItems(existing, desired, keyFn) {
  const existingKeys = new Set(existing.map(keyFn));
  return desired.filter((item) => !existingKeys.has(keyFn(item)));
}

// ---------------------------------------------------------------------------
// Auth resolution
// ---------------------------------------------------------------------------

function resolveToken() {
  // Supported path: ATLASSIAN_TOKEN env var (documented Atlassian API token / OAuth bearer).
  // 1. Try env var
  if (process.env.ATLASSIAN_TOKEN) {
    return process.env.ATLASSIAN_TOKEN.trim();
  }

  // 2. EXPERIMENTAL / non-default fallback: read ACLI's stored credential out of the
  //    macOS keychain. This depends on ACLI's PRIVATE, undocumented credential storage
  //    format (go-keyring base64 + gzip + JSON access_token) and is OS-specific and
  //    fragile — Atlassian may change it without notice. Do not treat it as the
  //    supported portability path; prefer ATLASSIAN_TOKEN above.
  // 2. On darwin, try keychain via acli stored credential
  if (process.platform === "darwin") {
    try {
      const raw = execSync(
        "security find-generic-password -l \"acli\" -w 2>&1 | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d['access_token'])\"",
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (raw) return raw;
    } catch {
      // fall through
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Make a Jira Cloud REST API call using the built-in Node.js https module.
 * Returns parsed JSON body.
 * @param {object} opts
 * @param {string} opts.method
 * @param {string} opts.url
 * @param {string} opts.token - Bearer token
 * @param {object|null} opts.body - request body (will be JSON-serialized)
 * @returns {Promise<{status: number, body: any}>}
 */
function jiraRequest({ method, url, token, body = null }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const https = require("node:https");
    const bodyStr = body ? JSON.stringify(body) : null;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (bodyStr) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          let parsed_body;
          try {
            parsed_body = data ? JSON.parse(data) : null;
          } catch {
            parsed_body = data;
          }
          resolve({ status: res.statusCode, body: parsed_body });
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Make a Jira request, exit 1 on non-2xx response.
 */
async function jiraCall({ method, url, token, body = null, description = "" }) {
  let result;
  try {
    result = await jiraRequest({ method, url, token, body });
  } catch (err) {
    console.error(`\nERROR: Network error${description ? ` (${description})` : ""}: ${err.message}`);
    process.exit(1);
  }

  if (result.status < 200 || result.status >= 300) {
    console.error(`\nERROR: Jira API returned ${result.status}${description ? ` (${description})` : ""}`);
    console.error("Response body:", JSON.stringify(result.body, null, 2));
    process.exit(1);
  }

  return result.body;
}

// ---------------------------------------------------------------------------
// Phase 1: Issue types
// ---------------------------------------------------------------------------

async function provisionIssueTypes(config, token, baseUrl) {
  const { projectId, projectKey, jiraConfig } = config;
  const results = [];

  console.log("\n--- Phase 1: Issue Types ---");

  // Detect project style. Team-managed (next-gen/business) projects do NOT support
  // custom issue type creation via REST — POST /rest/api/3/issuetype with scope.PROJECT
  // is silently converted to a global type, and global types are NOT usable in
  // team-managed projects. Project Settings → Issue Types UI is the only path.
  const projectMeta = await jiraCall({
    method: "GET",
    url: `${baseUrl}/rest/api/3/project/${projectKey || projectId}`,
    token,
    description: `GET /rest/api/3/project/${projectKey || projectId}`,
  });

  const isTeamManaged = projectMeta.style === "next-gen" || projectMeta.simplified === true;

  if (isTeamManaged) {
    // Check which canonical types the project already has (manually added via UI)
    const projectTypes = await jiraCall({
      method: "GET",
      url: `${baseUrl}/rest/api/3/issuetype/project?projectId=${projectId}`,
      token,
      description: "GET /rest/api/3/issuetype/project",
    });

    const existingByName = new Map(
      (Array.isArray(projectTypes) ? projectTypes : []).map((it) => [it.name, it])
    );

    for (const desired of jiraConfig.issueTypes) {
      if (existingByName.has(desired.name)) {
        const found = existingByName.get(desired.name);
        console.log(`  EXISTS  ${desired.name} (id: ${found.id})`);
        results.push({ phase: "issueTypes", name: desired.name, action: "EXISTS", id: found.id });
      } else {
        // Cannot create via API — team-managed projects require Project Settings UI.
        // Proven: POST /rest/api/3/issuetype with scope.PROJECT silently creates a
        // GLOBAL type that is unusable in team-managed projects (HTTP 400 on issue create).
        console.log(`  MANUAL  ${desired.name} — add via Project Settings → Issue Types`);
        results.push({ phase: "issueTypes", name: desired.name, action: "MANUAL_REQUIRED", id: null });
      }
    }

    const manualCount = results.filter((r) => r.action === "MANUAL_REQUIRED").length;
    if (manualCount > 0) {
      console.log(`\n  ⚠  ${manualCount} issue type(s) require manual addition:`);
      console.log(`     Go to ${projectMeta.self?.split("/rest")[0] || "https://myhealthcaresite.atlassian.net"}`);
      console.log(`     → AIGO → Project Settings → Issue Types → Add issue types`);
    }
  } else {
    // Company-managed project: create project-scoped types via REST
    const projectTypes = await jiraCall({
      method: "GET",
      url: `${baseUrl}/rest/api/3/issuetype/project?projectId=${projectId}`,
      token,
      description: "GET /rest/api/3/issuetype/project",
    });

    const existingByName = new Map(
      (Array.isArray(projectTypes) ? projectTypes : []).map((it) => [it.name, it])
    );

    for (const desired of jiraConfig.issueTypes) {
      if (existingByName.has(desired.name)) {
        const found = existingByName.get(desired.name);
        console.log(`  EXISTS  ${desired.name} (id: ${found.id})`);
        results.push({ phase: "issueTypes", name: desired.name, action: "EXISTS", id: found.id });
      } else {
        const created = await jiraCall({
          method: "POST",
          url: `${baseUrl}/rest/api/3/issuetype`,
          token,
          body: {
            name: desired.name,
            description: desired.description,
            type: desired.type || "standard",
            scope: {
              type: "PROJECT",
              project: { id: projectId },
            },
          },
          description: `POST issuetype '${desired.name}'`,
        });
        console.log(`  CREATED ${desired.name} (id: ${created.id})`);
        results.push({ phase: "issueTypes", name: desired.name, action: "CREATED", id: created.id });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Phase 2: Custom fields
// ---------------------------------------------------------------------------

async function provisionCustomFields(config, token, baseUrl) {
  const { jiraConfig } = config;
  const results = [];
  const fieldIdMap = {}; // fieldName → id (for later phases)

  console.log("\n--- Phase 2: Custom Fields ---");

  // GET all custom fields using the paginated search endpoint.
  // The flat GET /rest/api/3/field response is not paginated and silently omits
  // custom fields beyond ~50; /rest/api/3/field/search handles arbitrary counts.
  const allCustomFields = [];
  let startAt = 0;
  const pageSize = 100;
  while (true) {
    const page = await jiraCall({
      method: "GET",
      url: `${baseUrl}/rest/api/3/field/search?type=custom&maxResults=${pageSize}&startAt=${startAt}`,
      token,
      description: `GET /rest/api/3/field/search?startAt=${startAt}`,
    });
    const vals = Array.isArray(page) ? page : (page.values || []);
    allCustomFields.push(...vals);
    if (page.isLast || vals.length < pageSize) break;
    startAt += pageSize;
  }
  const existingByName = new Map(allCustomFields.map((f) => [f.name, f]));

  for (const desired of jiraConfig.customFields) {
    if (existingByName.has(desired.name)) {
      const found = existingByName.get(desired.name);
      console.log(`  EXISTS  ${desired.name} (id: ${found.id})`);
      results.push({ phase: "customFields", name: desired.name, action: "EXISTS", id: found.id, forgeVar: desired.forgeVar });
      fieldIdMap[desired.name] = found.id;
    } else {
      const body = {
        name: desired.name,
        type: desired.type,
        searcherKey: desired.searcherKey,
      };
      if (desired.description) body.description = desired.description;

      const created = await jiraCall({
        method: "POST",
        url: `${baseUrl}/rest/api/3/field`,
        token,
        body,
        description: `POST customField '${desired.name}'`,
      });
      console.log(`  CREATED ${desired.name} (id: ${created.id})`);
      results.push({ phase: "customFields", name: desired.name, action: "CREATED", id: created.id, forgeVar: desired.forgeVar });
      fieldIdMap[desired.name] = created.id;
    }
  }

  return { results, fieldIdMap };
}

// ---------------------------------------------------------------------------
// Phase 3: Workflow statuses
// ---------------------------------------------------------------------------

async function provisionWorkflowStatuses(config, token, baseUrl) {
  const { projectId, jiraConfig } = config;
  const results = [];

  console.log("\n--- Phase 3: Workflow Statuses ---");

  // Jira has TWO separate status concerns:
  //   A) Status RECORDS — the status entity exists in the system (checked via GET /rest/api/3/statuses?id=X)
  //   B) Status WORKFLOW — the status is wired into the project's board/workflow columns
  //
  // GET /rest/api/3/status?projectId=X returns only statuses in the project's ACTIVE workflow (concern B).
  // Project-scoped status records that were created but not added to the board don't appear there.
  //
  // Strategy: scan a range of IDs using the batch lookup to find all status records, then compare by name.
  // Scan known ID ranges in chunks of 50 (API limit) to find all project-scoped status records.
  // Project-scoped statuses don't appear in GET /rest/api/3/status (which only returns active
  // workflow statuses), but are accessible via the batch lookup by ID.
  //
  // NIH note (documented-API-gap): the ID-range scan below is a workaround for a
  // documented Jira REST gap — there is no public endpoint that lists project-scoped
  // status RECORDS that have not yet been wired into a workflow. The fixed range is a
  // heuristic, not a stable contract; treat it as gap-compensation, not a native primitive.
  const SCAN_START = 10000;
  const SCAN_END = 10100;
  const CHUNK_SIZE = 50;
  const allFoundStatuses = [];

  for (let start = SCAN_START; start <= SCAN_END; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, SCAN_END);
    const idParams = Array.from({ length: end - start + 1 }, (_, i) => `id=${start + i}`).join("&");
    const chunk = await jiraCall({
      method: "GET",
      url: `${baseUrl}/rest/api/3/statuses?${idParams}`,
      token,
      description: `GET /rest/api/3/statuses (scan ids ${start}-${end})`,
    });
    if (Array.isArray(chunk)) allFoundStatuses.push(...chunk);
  }
  const existingByName = new Map(allFoundStatuses.map((s) => [s.name, s]));

  const toCreate = jiraConfig.workflowStatuses.filter((ws) => !existingByName.has(ws.name));
  const alreadyExist = jiraConfig.workflowStatuses.filter((ws) => existingByName.has(ws.name));

  for (const ws of alreadyExist) {
    const found = existingByName.get(ws.name);
    console.log(`  EXISTS  ${ws.name} (id: ${found.id})`);
    results.push({ phase: "workflowStatuses", name: ws.name, action: "EXISTS", id: found.id });
  }

  if (toCreate.length > 0) {
    // POST /rest/api/3/statuses body format: { statuses: [{ name, statusCategory, scope }] }
    const body = {
      statuses: toCreate.map((ws) => ({
        name: ws.name,
        statusCategory: ws.statusCategory,
        scope: {
          type: "PROJECT",
          project: { id: projectId },
        },
      })),
    };

    const created = await jiraCall({
      method: "POST",
      url: `${baseUrl}/rest/api/3/statuses`,
      token,
      body,
      description: `POST /rest/api/3/statuses (batch ${toCreate.length})`,
    });

    const createdArr = Array.isArray(created) ? created : (created && Array.isArray(created.statuses) ? created.statuses : []);
    const createdByName = new Map(createdArr.map((s) => [s.name, s]));

    for (const ws of toCreate) {
      const c = createdByName.get(ws.name);
      const id = c ? c.id : "unknown";
      console.log(`  CREATED ${ws.name} (id: ${id})`);
      results.push({ phase: "workflowStatuses", name: ws.name, action: "CREATED", id });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Phase 4: Field options
// ---------------------------------------------------------------------------

async function provisionFieldOptions(config, token, baseUrl, fieldIdMap) {
  const { jiraConfig } = config;
  const results = [];

  if (!jiraConfig.fieldOptions || Object.keys(jiraConfig.fieldOptions).length === 0) {
    console.log("\n--- Phase 4: Field Options (none configured) ---");
    return results;
  }

  console.log("\n--- Phase 4: Field Options ---");

  for (const [fieldName, desiredOptions] of Object.entries(jiraConfig.fieldOptions)) {
    const fieldId = fieldIdMap[fieldName];
    if (!fieldId) {
      console.log(`  SKIPPED ${fieldName} — field not found in Phase 2 results`);
      continue;
    }

    // GET field contexts
    let contextsResp;
    try {
      contextsResp = await jiraCall({
        method: "GET",
        url: `${baseUrl}/rest/api/3/field/${fieldId}/context`,
        token,
        description: `GET context for field '${fieldName}' (${fieldId})`,
      });
    } catch {
      console.log(`  SKIPPED ${fieldName} — could not retrieve contexts`);
      continue;
    }

    const contexts = contextsResp && Array.isArray(contextsResp.values) ? contextsResp.values : [];
    if (contexts.length === 0) {
      console.log(`  SKIPPED ${fieldName} — no contexts found`);
      continue;
    }

    const contextId = contexts[0].id;

    // GET existing options for this context
    const existingOptsResp = await jiraCall({
      method: "GET",
      url: `${baseUrl}/rest/api/3/field/${fieldId}/context/${contextId}/option`,
      token,
      description: `GET options for field '${fieldName}' context ${contextId}`,
    });

    const existingOpts = existingOptsResp && Array.isArray(existingOptsResp.values)
      ? existingOptsResp.values
      : [];
    const existingOptNames = new Set(existingOpts.map((o) => o.value));

    const missingOpts = desiredOptions.filter((o) => !existingOptNames.has(o));

    for (const opt of desiredOptions) {
      if (existingOptNames.has(opt)) {
        const found = existingOpts.find((o) => o.value === opt);
        console.log(`  EXISTS  ${fieldName}:${opt} (id: ${found ? found.id : "?"})`);
        results.push({ phase: "fieldOptions", name: `${fieldName}:${opt}`, action: "EXISTS", id: found ? found.id : null });
      }
    }

    if (missingOpts.length > 0) {
      const created = await jiraCall({
        method: "POST",
        url: `${baseUrl}/rest/api/3/field/${fieldId}/context/${contextId}/option`,
        token,
        body: { options: missingOpts.map((o) => ({ value: o })) },
        description: `POST options for field '${fieldName}'`,
      });

      const createdOpts = created && Array.isArray(created.options) ? created.options : [];
      const createdByValue = new Map(createdOpts.map((o) => [o.value, o]));

      for (const opt of missingOpts) {
        const c = createdByValue.get(opt);
        const id = c ? c.id : "unknown";
        console.log(`  CREATED ${fieldName}:${opt} (id: ${id})`);
        results.push({ phase: "fieldOptions", name: `${fieldName}:${opt}`, action: "CREATED", id });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Phase 5: Output forge-vars.sh
// ---------------------------------------------------------------------------

function writeForgeVarsScript(repoRoot, customFieldResults) {
  const outDir = path.join(repoRoot, "evidence", "jira-config");
  fs.mkdirSync(outDir, { recursive: true });

  const lines = [
    "#!/usr/bin/env bash",
    "# AUTO-GENERATED by scripts/provision-jira.cjs",
    "# Run this script to set Forge environment variables for AIGO custom fields.",
    "# Review the IDs below before running — confirm against your Jira instance.",
    "",
  ];

  for (const result of customFieldResults) {
    if (!result.forgeVar || !result.id) continue;
    lines.push(
      `forge variables set ${result.forgeVar} ${result.id} --environment development`
    );
  }

  lines.push("");
  const scriptPath = path.join(outDir, "forge-vars.sh");
  fs.writeFileSync(scriptPath, lines.join("\n"), "utf8");
  console.log(`\nWrote forge vars script: ${path.relative(repoRoot, scriptPath)}`);
  return scriptPath;
}

// ---------------------------------------------------------------------------
// Evidence output
// ---------------------------------------------------------------------------

function writeProvisionOutput(repoRoot, allResults) {
  const outDir = path.join(repoRoot, "evidence", "jira-config");
  fs.mkdirSync(outDir, { recursive: true });

  const output = {
    timestamp: new Date().toISOString(),
    phases: {
      issueTypes: allResults.filter((r) => r.phase === "issueTypes"),
      customFields: allResults.filter((r) => r.phase === "customFields"),
      workflowStatuses: allResults.filter((r) => r.phase === "workflowStatuses"),
      fieldOptions: allResults.filter((r) => r.phase === "fieldOptions"),
    },
    items: allResults,
  };

  const outPath = path.join(outDir, "provision-output.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote provision output: ${path.relative(repoRoot, outPath)}`);
  return outPath;
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

function printSummaryTable(allResults) {
  console.log("\n=== Provision Summary ===");
  console.log(
    String("Phase").padEnd(20) +
    String("Name").padEnd(50) +
    String("Action").padEnd(10) +
    "ID"
  );
  console.log("-".repeat(100));
  for (const r of allResults) {
    console.log(
      String(r.phase || "").padEnd(20) +
      String(r.name || "").padEnd(50) +
      String(r.action || "").padEnd(10) +
      String(r.id || "")
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");

  const configPath = args.config
    ? path.resolve(args.config)
    : path.join(repoRoot, "instances", "aigo.example.json");

  // Load config
  if (!fs.existsSync(configPath)) {
    console.error(`ERROR: Config file not found: ${configPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error(`ERROR: Failed to parse config JSON: ${err.message}`);
    process.exit(1);
  }

  // Validate config
  const validationError = validateConfig(config);
  if (validationError) {
    console.error(`ERROR: Config validation failed: ${validationError}`);
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("DRY RUN: config valid");
    console.log(`  cloudId:   ${config.cloudId}`);
    console.log(`  projectId: ${config.projectId}`);
    console.log(`  issueTypes:       ${config.jiraConfig.issueTypes.length}`);
    console.log(`  customFields:     ${config.jiraConfig.customFields.length}`);
    console.log(`  workflowStatuses: ${config.jiraConfig.workflowStatuses.length}`);
    const optionCount = config.jiraConfig.fieldOptions
      ? Object.values(config.jiraConfig.fieldOptions).reduce((s, v) => s + v.length, 0)
      : 0;
    console.log(`  fieldOptions:     ${optionCount} total options`);
    process.exit(0);
  }

  // Resolve auth token
  const token = resolveToken();
  if (!token) {
    console.error(
      "ERROR: No Atlassian token found. Set ATLASSIAN_TOKEN env var or store credentials via acli on macOS."
    );
    process.exit(1);
  }

  // OAuth tokens must target api.atlassian.com (not site.atlassian.net directly)
  const baseUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}`;
  console.log(`Provisioning Jira at ${baseUrl} (projectId: ${config.projectId})`);

  const allResults = [];

  // Phase 1: Issue types
  const issueTypeResults = await provisionIssueTypes(config, token, baseUrl);
  allResults.push(...issueTypeResults);

  // Phase 2: Custom fields
  const { results: customFieldResults, fieldIdMap } = await provisionCustomFields(config, token, baseUrl);
  allResults.push(...customFieldResults);

  // Phase 3: Workflow statuses
  const statusResults = await provisionWorkflowStatuses(config, token, baseUrl);
  allResults.push(...statusResults);

  // Phase 4: Field options
  const optionResults = await provisionFieldOptions(config, token, baseUrl, fieldIdMap);
  allResults.push(...optionResults);

  // Phase 5: Output forge-vars.sh
  writeForgeVarsScript(repoRoot, customFieldResults);

  // Evidence
  writeProvisionOutput(repoRoot, allResults);

  // Summary
  printSummaryTable(allResults);

  console.log("\nDone.");
}

// ---------------------------------------------------------------------------
// Exports (for testing pure functions without hitting the network)
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
}

module.exports = { validateConfig, diffItems };
