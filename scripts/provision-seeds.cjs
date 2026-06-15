#!/usr/bin/env node
"use strict";

// scripts/provision-seeds.cjs
// Creates seed issues in Jira and re-types any existing ones to their canonical
// issue type. Idempotent: running twice against the same instance is a no-op.
//
// Usage:
//   node scripts/provision-seeds.cjs [--config <path>] [--dry-run]
//
// Defaults:
//   --config   instances/aigo.example.json
//   --dry-run  validate CSV + issue-type names, no API calls, exit 0
//
// T-NIH-07 label: native-wrapper.
//   Native owner: ACLI `jira workitem create` / bulk-via-CSV (matrix row
//   "Project/work item operations") over Jira REST `/rest/api/3/issue` and
//   `/search/jql`. Creating and retyping work items is a native Jira primitive,
//   and ACLI already accepts CSV bulk import — the same shape this script reads.
//   The custom logic here (CSV parse, normalize-summary idempotency diff,
//   issue-type retype) only exists because the script self-owns import rather
//   than delegating to `acli jira workitem create --from-csv`. Preferred
//   reduction: seed issues belong to a golden company-managed template project
//   (T-NIH-04) so a clone carries the canonical-type coverage, or drive bulk
//   create through ACLI; keep this as a fallback for sites without a template.
//   The seed *content* (summaries mapped to AIGO issue types) is Twin-specific,
//   but the create/retype mechanism is Atlassian-native. No private endpoints.

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
 * Validate that the config has the fields needed by this script.
 * @param {object} config
 * @returns {string|null} error string, or null if valid
 */
function validateSeedsConfig(config) {
  if (!config || typeof config !== "object") return "Config must be a JSON object";
  if (!config.projectKey) return "Config missing required field: projectKey";
  if (!config.seedLabel) return "Config missing required field: seedLabel";
  if (!config.cloudId) return "Config missing required field: cloudId";
  if (!config.projectId) return "Config missing required field: projectId";
  if (!config.jiraConfig || !Array.isArray(config.jiraConfig.issueTypes)) {
    return "Config missing required field: jiraConfig.issueTypes (must be array)";
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSV parsing (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of objects.
 * Handles double-quoted fields (commas and newlines inside quotes supported).
 * First row is the header.
 * @param {string} csvText
 * @returns {Array<object>}
 */
function parseCsv(csvText) {
  const lines = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') {
      if (inQuote && csvText[i + 1] === '"') {
        // escaped double-quote
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "\n" && !inQuote) {
      lines.push(current);
      current = "";
    } else if (ch === "\r" && !inQuote) {
      // skip \r
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length === 0) return [];

  const headers = splitCsvRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCsvRow(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Split a single CSV row into fields, respecting quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvRow(line) {
  const fields = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// ---------------------------------------------------------------------------
// Seed row mapping (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Map a raw CSV row (with column names from aigo-seed-issues.csv) to a
 * normalized seed object. The CSV uses: summary, issueType, description, label.
 * @param {object} row
 * @returns {{ summary: string, issueTypeName: string, description: string, labels: string[] }}
 */
function mapCsvRow(row) {
  return {
    summary: row.summary || "",
    issueTypeName: row.issueType || row.issueTypeName || "Task",
    description: row.description || "",
    labels: row.label ? [row.label] : (row.labels ? row.labels.split(";").map((l) => l.trim()).filter(Boolean) : []),
  };
}

// ---------------------------------------------------------------------------
// Idempotency diff (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Given existing issues and desired seeds, compute what to create vs retype vs skip.
 *
 * @param {Array<{key: string, summary: string, issueTypeName: string}>} existing
 * @param {Array<{summary: string, issueTypeName: string}>} desired
 * @returns {{ toCreate: Array, toRetype: Array<{key: string, oldType: string, newType: string, seed: object}>, toSkip: Array }}
 */
function diffSeeds(existing, desired) {
  const existingByNormalizedSummary = new Map(
    existing.map((e) => [normalizeSummary(e.summary), e])
  );

  const toCreate = [];
  const toRetype = [];
  const toSkip = [];

  for (const seed of desired) {
    const key = normalizeSummary(seed.summary);
    if (existingByNormalizedSummary.has(key)) {
      const found = existingByNormalizedSummary.get(key);
      if (found.issueTypeName !== seed.issueTypeName) {
        toRetype.push({ key: found.key, oldType: found.issueTypeName, newType: seed.issueTypeName, seed });
      } else {
        toSkip.push({ key: found.key, seed });
      }
    } else {
      toCreate.push(seed);
    }
  }

  return { toCreate, toRetype, toSkip };
}

/**
 * Normalize summary for comparison: lowercase, trim, collapse whitespace.
 * @param {string} s
 * @returns {string}
 */
function normalizeSummary(s) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Auth resolution (same style as provision-jira.cjs)
// ---------------------------------------------------------------------------

function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) {
    return process.env.ATLASSIAN_TOKEN.trim();
  }

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
// HTTP helpers (same style as provision-jira.cjs)
// ---------------------------------------------------------------------------

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
// Evidence output
// ---------------------------------------------------------------------------

function writeSeedsOutput(repoRoot, output) {
  const outDir = path.join(repoRoot, "evidence", "jira-config");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "seeds-output.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\nWrote seeds output: ${path.relative(repoRoot, outPath)}`);
  return outPath;
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

function printSeedsSummaryTable(created, retyped, skipped) {
  console.log("\n=== Seed Provision Summary ===");
  console.log(
    String("Action").padEnd(10) +
    String("Key").padEnd(12) +
    "Summary"
  );
  console.log("-".repeat(80));

  for (const c of created) {
    console.log(String("CREATED").padEnd(10) + String(c.key || "").padEnd(12) + c.summary);
  }
  for (const r of retyped) {
    console.log(String("RETYPED").padEnd(10) + String(r.key || "").padEnd(12) + `${r.seed.summary} (${r.oldType} → ${r.newType})`);
  }
  for (const s of skipped) {
    console.log(String("SKIPPED").padEnd(10) + String(s.key || "").padEnd(12) + s.seed.summary);
  }

  console.log(`\nTotal: ${created.length} created, ${retyped.length} retyped, ${skipped.length} skipped`);
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
  const validationError = validateSeedsConfig(config);
  if (validationError) {
    console.error(`ERROR: Config validation failed: ${validationError}`);
    process.exit(1);
  }

  const { projectKey, seedLabel, jiraConfig } = config;

  // Resolve seed CSV path
  const seedTemplatePath = config.seedTemplate
    ? path.resolve(repoRoot, config.seedTemplate)
    : path.join(repoRoot, "automation", "seed", "aigo-seed-issues.csv");

  if (!fs.existsSync(seedTemplatePath)) {
    console.error(`ERROR: Seed CSV not found: ${seedTemplatePath}`);
    process.exit(1);
  }

  // Parse CSV
  const csvText = fs.readFileSync(seedTemplatePath, "utf8");
  let rawRows;
  try {
    rawRows = parseCsv(csvText);
  } catch (err) {
    console.error(`ERROR: Failed to parse seed CSV: ${err.message}`);
    process.exit(1);
  }

  if (rawRows.length === 0) {
    console.error("ERROR: Seed CSV has no data rows");
    process.exit(1);
  }

  const seedRows = rawRows.map(mapCsvRow);
  console.log(`Parsed ${seedRows.length} seed rows from ${path.relative(repoRoot, seedTemplatePath)}`);

  // Build known issue type name set from config
  const knownIssueTypeNames = new Set(jiraConfig.issueTypes.map((it) => it.name));

  // Dry-run: validate only
  if (args.dryRun) {
    console.log("\nDRY RUN: validating CSV and issue type names...");
    const unknown = seedRows
      .map((r) => r.issueTypeName)
      .filter((n) => n !== "Task" && !knownIssueTypeNames.has(n));

    if (unknown.length > 0) {
      // In dry-run, warn but don't fail for unknown types — the CSV uses "Task"
      // as the Jira-compatible import type and carries the intended type in the description.
      console.log(`  NOTE: ${unknown.length} seed row(s) use issue type names not in jiraConfig.issueTypes (may be intentional):`);
      for (const n of [...new Set(unknown)]) {
        console.log(`    - ${n}`);
      }
    } else {
      console.log("  All seed issue type names are valid.");
    }

    console.log(`\nDRY RUN complete: ${seedRows.length} seed rows, ${rawRows.length} CSV rows parsed.`);
    console.log(`  projectKey:  ${projectKey}`);
    console.log(`  seedLabel:   ${seedLabel}`);
    console.log(`  csvPath:     ${path.relative(repoRoot, seedTemplatePath)}`);
    process.exit(0);
  }

  // Resolve auth
  const token = resolveToken();
  if (!token) {
    console.error(
      "ERROR: No Atlassian token found. Set ATLASSIAN_TOKEN env var or store credentials via acli on macOS."
    );
    process.exit(1);
  }

  const baseUrl = config.cloudId
    ? `https://api.atlassian.com/ex/jira/${config.cloudId}`
    : `https://${config.site}`;
  console.log(`\nProvisioning seeds in Jira at ${baseUrl} (project: ${projectKey})`);

  // GET project-scoped issue types (team-managed projects use /issuetype/project)
  console.log("\nFetching issue types from Jira...");
  const allIssueTypes = await jiraCall({
    method: "GET",
    url: `${baseUrl}/rest/api/3/issuetype/project?projectId=${config.projectId || projectId}`,
    token,
    description: "GET /rest/api/3/issuetype/project",
  });

  const issueTypeIdByName = new Map(
    (Array.isArray(allIssueTypes) ? allIssueTypes : []).map((it) => [it.name, it.id])
  );

  // GET existing seed issues
  console.log(`\nFetching existing seed issues (label: ${seedLabel})...`);
  const searchUrl = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(`project = ${projectKey} AND labels = ${seedLabel}`)}&maxResults=50&fields=summary,issuetype`;
  const searchResult = await jiraCall({
    method: "GET",
    url: searchUrl,
    token,
    description: `JQL search for label:${seedLabel}`,
  });

  const existingIssues = (searchResult && Array.isArray(searchResult.issues)
    ? searchResult.issues
    : []
  ).map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary,
    issueTypeName: issue.fields.issuetype ? issue.fields.issuetype.name : "",
  }));

  console.log(`Found ${existingIssues.length} existing seed issues.`);

  // Diff
  const { toCreate, toRetype, toSkip } = diffSeeds(existingIssues, seedRows);

  const created = [];
  const retyped = [];
  const skipped = [...toSkip];

  // Create missing seeds
  for (const seed of toCreate) {
    const issueTypeName = seed.issueTypeName;
    // Use "Task" as the fallback if type not found in Jira yet
    const issueTypeId = issueTypeIdByName.get(issueTypeName) || issueTypeIdByName.get("Task");
    if (!issueTypeId) {
      console.error(`ERROR: Cannot find issue type id for '${issueTypeName}' or 'Task' in Jira`);
      process.exit(1);
    }

    const body = {
      fields: {
        project: { key: projectKey },
        summary: seed.summary,
        issuetype: { id: issueTypeId },
        description: seed.description
          ? {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: seed.description }] }],
            }
          : undefined,
        labels: seed.labels.length > 0 ? seed.labels : [seedLabel],
      },
    };

    const result = await jiraCall({
      method: "POST",
      url: `${baseUrl}/rest/api/3/issue`,
      token,
      body,
      description: `POST issue: ${seed.summary}`,
    });

    console.log(`  CREATED ${result.key}: ${seed.summary}`);
    created.push({ key: result.key, summary: seed.summary, issueTypeName });
  }

  // Retype mis-typed seeds
  for (const item of toRetype) {
    const newTypeId = issueTypeIdByName.get(item.newType);
    if (!newTypeId) {
      console.log(`  SKIP retype ${item.key}: type '${item.newType}' not found in Jira, leaving as '${item.oldType}'`);
      skipped.push({ key: item.key, seed: item.seed });
      continue;
    }

    await jiraCall({
      method: "PUT",
      url: `${baseUrl}/rest/api/3/issue/${item.key}`,
      token,
      body: { fields: { issuetype: { id: newTypeId } } },
      description: `PUT retype ${item.key} to ${item.newType}`,
    });

    console.log(`  RETYPED ${item.key}: ${item.oldType} → ${item.newType}`);
    retyped.push(item);
  }

  // Evidence
  const output = {
    timestamp: new Date().toISOString(),
    projectKey,
    seedLabel,
    created,
    retyped,
    skipped: skipped.map((s) => ({ key: s.key, summary: s.seed.summary })),
  };
  writeSeedsOutput(repoRoot, output);

  // Summary
  printSeedsSummaryTable(created, retyped, skipped);

  console.log("\nDone.");
}

// ---------------------------------------------------------------------------
// Exports (for testing pure functions)
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
}

module.exports = {
  validateSeedsConfig,
  parseCsv,
  splitCsvRow,
  mapCsvRow,
  diffSeeds,
  normalizeSummary,
};
