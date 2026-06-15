#!/usr/bin/env node
"use strict";

// scripts/provision-automation.cjs
// Renders and validates Jira Automation rule JSON for native Jira Automation
// import. The supported path stops before mutation because Atlassian does not
// expose a stable public import surface for every tenant.
//
// Usage:
//   node scripts/provision-automation.cjs [--config <path>] [--dry-run]
//   AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1 node scripts/provision-automation.cjs
//
// Defaults:
//   --config   instances/aigo.example.json
//   --dry-run  validate rendered rule JSONs, no API calls, exit 0
//
// Exit codes:
//   0 — validation success (or dry-run passed)
//   1 — fatal error
//   2 — manual Jira Automation import required

const fs = require("node:fs");
const path = require("node:path");
const { execSync, spawnSync } = require("node:child_process");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, config: null, experimentalApiImport: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else if (argv[i] === "--experimental-api-import") {
      args.experimentalApiImport = true;
    }
  }
  if (process.env.AIGO_EXPERIMENTAL_AUTOMATION_IMPORT === "1") {
    args.experimentalApiImport = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Rendered rule validation (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Validate a parsed rule object: must have a name and state === "DISABLED".
 * @param {object} rule
 * @returns {string|null} error string or null if valid
 */
function validateRule(rule) {
  if (!rule || typeof rule !== "object") return "Rule must be a JSON object";
  if (!rule.name || typeof rule.name !== "string") return "Rule missing required field: name";
  if (rule.state !== "DISABLED") {
    return `Rule '${rule.name}' must have state "DISABLED" before import (got: ${JSON.stringify(rule.state)})`;
  }
  return null;
}

/**
 * Validate a rendered rule file's top-level JSON wrapper.
 * The file may be a bare rule object OR { version, rules: [...] }.
 * Returns the flat array of rule objects.
 * @param {object} parsed
 * @param {string} filename
 * @returns {{ rules: object[], error: string|null }}
 */
function extractRules(parsed, filename) {
  if (Array.isArray(parsed)) {
    return { rules: parsed, error: null };
  }
  if (parsed && Array.isArray(parsed.rules)) {
    return { rules: parsed.rules, error: null };
  }
  // Single rule object
  if (parsed && typeof parsed === "object" && parsed.name) {
    return { rules: [parsed], error: null };
  }
  return { rules: [], error: `${filename}: cannot extract rules — expected {rules:[...]} or a rule object` };
}

/**
 * Idempotency check: given existing rule names and desired rules,
 * return only the rules whose name does NOT already exist.
 * @param {Set<string>} existingNames
 * @param {object[]} desiredRules
 * @returns {object[]}
 */
function filterNewRules(existingNames, desiredRules) {
  return desiredRules.filter((r) => !existingNames.has(r.name));
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

// ---------------------------------------------------------------------------
// Evidence output
// ---------------------------------------------------------------------------

function writeAutomationOutput(repoRoot, output) {
  const outDir = path.join(repoRoot, "evidence", "automation");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "import-output.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\nWrote automation import output: ${path.relative(repoRoot, outPath)}`);
  return outPath;
}

function printManualImportSteps({ baseUrl, renderedDir, repoRoot }) {
  console.log("\nManual import required.");
  console.log("Jira Automation rule JSON has been rendered and validated, but the");
  console.log("supported repo path does not call private/internal Atlassian import APIs.");
  console.log("");
  console.log("Native import steps:");
  console.log(`  1. Open ${baseUrl} → Project settings → Automation → Import rules`);
  console.log(`  2. Upload JSON from: ${path.relative(repoRoot, renderedDir)}/`);
  console.log("  3. Review rule actor, project scope, and any Rovo agent selections.");
  console.log("  4. Keep rules DISABLED until each rule is reviewed.");
  console.log("  5. Enable one rule at a time, trigger it on a seed issue, and capture");
  console.log("     the native Jira Automation audit-log row.");
  console.log("");
  console.log("Experimental escape hatch:");
  console.log("  AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1 node scripts/provision-automation.cjs");
  console.log("  This is not the supported portability path.");
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

  if (!config.cloudId) {
    console.error("ERROR: Config missing required field: cloudId");
    process.exit(1);
  }

  const renderedDir = path.join(repoRoot, "automation", "rules", "rendered");

  // Step 1: Run render step (unless rendered files already exist and we just need dry-run)
  console.log("Step 1: Rendering automation rules...");
  const renderResult = spawnSync(
    process.execPath,
    ["scripts/render-automation-rules.cjs", "--config", configPath],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (renderResult.status !== 0) {
    console.error("ERROR: render-automation-rules.cjs failed. Cannot import rules.");
    process.exit(1);
  }

  // Step 2: Check rendered rules exist
  if (!fs.existsSync(renderedDir)) {
    console.error(`ERROR: Rendered rules directory not found: ${renderedDir}`);
    process.exit(1);
  }

  const renderedFiles = fs
    .readdirSync(renderedDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (renderedFiles.length === 0) {
    console.error(`ERROR: No rendered rule JSON files found in ${renderedDir}`);
    process.exit(1);
  }

  console.log(`Found ${renderedFiles.length} rendered rule file(s): ${renderedFiles.join(", ")}`);

  // Step 3: Parse and validate all rendered rules
  const allRules = [];
  for (const file of renderedFiles) {
    const filePath = path.join(renderedDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`ERROR: Failed to parse rendered rule file ${file}: ${err.message}`);
      process.exit(1);
    }

    const { rules, error } = extractRules(parsed, file);
    if (error) {
      console.error(`ERROR: ${error}`);
      process.exit(1);
    }

    for (const rule of rules) {
      const ruleErr = validateRule(rule);
      if (ruleErr) {
        console.error(`ERROR: ${ruleErr} (in ${file})`);
        process.exit(1);
      }
    }

    allRules.push(...rules);
    console.log(`  Validated: ${file} (${rules.length} rule(s))`);
  }

  console.log(`\nTotal rules to import: ${allRules.length}`);

  // Dry-run: stop here
  if (args.dryRun) {
    console.log(`\nDRY RUN: all ${allRules.length} rule(s) validated (all DISABLED). No API calls made.`);
    for (const rule of allRules) {
      console.log(`  - ${rule.name} [${rule.state}]`);
    }
    process.exit(0);
  }

  const { cloudId } = config;
  const baseUrl = cloudId
    ? `https://api.atlassian.com/ex/jira/${cloudId}`
    : `https://${config.site}`;

  if (!args.experimentalApiImport) {
    printManualImportSteps({ baseUrl, renderedDir, repoRoot });
    writeAutomationOutput(repoRoot, {
      timestamp: new Date().toISOString(),
      cloudId,
      importMethod: "manual-required",
      supportedPath: "native-jira-automation-import",
      renderedFiles,
      validatedRules: allRules.map((r) => r.name),
      imported: [],
      skipped: [],
      errors: ["Native Jira Automation import and audit-log verification required"],
    });
    process.exit(2);
  }

  console.log("\nEXPERIMENTAL: API import requested.");
  console.log("This path is not the supported portability path and may use undocumented Atlassian endpoints.");

  // Resolve auth
  const token = resolveToken();
  if (!token) {
    console.error(
      "ERROR: No Atlassian token found. Set ATLASSIAN_TOKEN env var or store credentials via acli on macOS."
    );
    process.exit(1);
  }

  // Step 4: GET existing rules for idempotency
  console.log("\nFetching existing automation rules (idempotency check)...");
  let existingNames = new Set();

  // Try primary endpoint
  let existingResult;
  try {
    existingResult = await jiraRequest({
      method: "GET",
      url: `${baseUrl}/rest/api/3/automation/service/1.0/rules?maxResults=100`,
      token,
    });

    if (existingResult.status === 200 && existingResult.body) {
      const rules = existingResult.body.values || existingResult.body.rules || existingResult.body;
      if (Array.isArray(rules)) {
        existingNames = new Set(rules.map((r) => r.name).filter(Boolean));
        console.log(`  Found ${existingNames.size} existing rule(s).`);
      }
    } else if (existingResult.status === 401 || existingResult.status === 403) {
      console.log(`  NOTE: Cannot list existing rules (HTTP ${existingResult.status}) — will attempt import without dedup check.`);
    } else {
      console.log(`  NOTE: Existing rules list returned HTTP ${existingResult.status} — skipping dedup check.`);
    }
  } catch (err) {
    console.log(`  NOTE: Could not fetch existing rules (${err.message}) — skipping dedup check.`);
  }

  // Filter to only new rules
  const newRules = filterNewRules(existingNames, allRules);
  const skippedRules = allRules.filter((r) => existingNames.has(r.name));

  if (skippedRules.length > 0) {
    console.log(`\nSkipping ${skippedRules.length} rule(s) already present:`);
    for (const r of skippedRules) {
      console.log(`  SKIPPED (exists): ${r.name}`);
    }
  }

  if (newRules.length === 0) {
    console.log("\nAll rules already exist — nothing to import.");
    writeAutomationOutput(repoRoot, {
      timestamp: new Date().toISOString(),
      cloudId,
      imported: [],
      skipped: skippedRules.map((r) => r.name),
      errors: [],
    });
    process.exit(0);
  }

  console.log(`\nImporting ${newRules.length} new rule(s)...`);

  // Step 5: Experimental API import. This is intentionally outside the
  // supported portability path; prefer native Jira Automation import/audit logs.
  const ENDPOINTS = [
    {
      label: "experimental REST v3 candidate",
      url: `${baseUrl}/rest/api/3/automation/service/1.0/rules/imports`,
    },
    {
      label: "experimental private gateway fallback",
      url: `${baseUrl}/gateway/api/automation/internal-api/jira/${cloudId}/pro/rest/GLOBAL/rules/import`,
    },
  ];

  let importedRuleIds = [];
  let importSucceeded = false;

  for (const endpoint of ENDPOINTS) {
    console.log(`\n  Trying ${endpoint.label}: ${endpoint.url}`);

    let result;
    try {
      result = await jiraRequest({
        method: "POST",
        url: endpoint.url,
        token,
        body: newRules,
      });
    } catch (err) {
      console.log(`    Network error: ${err.message} — trying next endpoint...`);
      continue;
    }

    if (result.status === 401 || result.status === 403) {
      console.log(`\nNOTE: Automation import returned HTTP ${result.status} on all endpoints.`);
      console.log("The Jira Automation REST API requires specific admin scopes or an OAuth 2.0 app token.");
      console.log("\nManual import steps:");
      console.log(`  1. Open ${baseUrl} → Project Settings → Automation → ... → Import rules`);
      console.log(`  2. Upload each JSON from: ${path.relative(repoRoot, renderedDir)}/`);
      console.log("  3. Review placeholder values — rules with __MISSING_* are example-config stubs.");
      console.log("  4. Rules are imported DISABLED — enable only after audit log review.");

      writeAutomationOutput(repoRoot, {
        timestamp: new Date().toISOString(),
        cloudId,
        importMethod: "manual-required",
        imported: [],
        skipped: skippedRules.map((r) => r.name),
        errors: [`HTTP ${result.status} on all import endpoints — manual import required`],
      });

      process.exit(2);
    }

    if (result.status === 200 || result.status === 201) {
      const body = result.body;
      // Parse created rule IDs from response (format varies by endpoint)
      if (body && Array.isArray(body.rules)) {
        importedRuleIds = body.rules.map((r) => r.id || r.ruleId).filter(Boolean);
      } else if (body && Array.isArray(body)) {
        importedRuleIds = body.map((r) => r.id || r.ruleId).filter(Boolean);
      } else if (body && body.id) {
        importedRuleIds = [body.id];
      }
      importSucceeded = true;
      console.log(`    Success (HTTP ${result.status}). Imported rule IDs: ${importedRuleIds.join(", ") || "(none parsed)"}`);
      break;
    }

    console.log(`    HTTP ${result.status} — trying next endpoint...`);
  }

  if (!importSucceeded) {
    console.error("\nERROR: All import endpoints failed. Check ATLASSIAN_TOKEN and Jira admin permissions.");
    writeAutomationOutput(repoRoot, {
      timestamp: new Date().toISOString(),
      cloudId,
      importMethod: "failed",
      imported: [],
      skipped: skippedRules.map((r) => r.name),
      errors: ["All import endpoints failed"],
    });
    process.exit(1);
  }

  // Evidence
  writeAutomationOutput(repoRoot, {
    timestamp: new Date().toISOString(),
    cloudId,
    importMethod: "api",
    imported: newRules.map((r, i) => ({
      name: r.name,
      state: r.state,
      id: importedRuleIds[i] || null,
    })),
    skipped: skippedRules.map((r) => r.name),
    errors: [],
  });

  // Summary
  console.log("\n=== Automation Import Summary ===");
  for (const r of newRules) {
    console.log(`  IMPORTED [DISABLED]: ${r.name}`);
  }
  for (const r of skippedRules) {
    console.log(`  SKIPPED (exists):    ${r.name}`);
  }

  console.log(`\nTotal: ${newRules.length} imported, ${skippedRules.length} skipped.`);
  console.log("All rules are imported as DISABLED — enable only after audit log review.");
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
  validateRule,
  extractRules,
  filterNewRules,
};
