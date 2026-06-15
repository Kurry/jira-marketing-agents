#!/usr/bin/env node
"use strict";

// scripts/check-rovo-visibility.cjs
// Verifies that all declared rovo:agent entries in manifest.yml are deployed
// and installed on the target site.
//
// Strategy:
//   1. Count rovo:agent keys in manifest.yml (ground truth of what SHOULD be there)
//   2. Run `forge install list` and check the target site shows "Up-to-date"
//   3. Cross-check: if (1) matches expected count AND (2) is Up-to-date → exit 0
//      Any mismatch or "Out-of-date" → exit 1 with a clear diagnostic
//
// The Atlassian REST API does not expose a "list deployed Rovo agents" endpoint
// accessible with standard OAuth scopes, so we infer visibility from the Forge
// deployment guarantee: a Forge app that is Up-to-date on a site exposes all
// modules declared in its manifest.yml to that site.
//
// Usage:
//   node scripts/check-rovo-visibility.cjs [--site <site>] [--expected <n>]
//
// Defaults:
//   --site       myhealthcaresite.atlassian.net (or JIRA_SITE env var)
//   --expected   19 (AIGO manifest agent count)
//
// Exit codes:
//   0 — all checks pass (agents are visible in Rovo)
//   1 — a check failed (see output for which one)

const fs = require("node:fs");
const path = require("node:path");
const { execSync, spawnSync } = require("node:child_process");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    site: process.env.JIRA_SITE || "myhealthcaresite.atlassian.net",
    expected: 19,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site" && argv[i + 1]) {
      args.site = argv[i + 1];
      i++;
    } else if (argv[i] === "--expected" && argv[i + 1]) {
      args.expected = parseInt(argv[i + 1], 10);
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Count rovo:agent keys in manifest.yml
// ---------------------------------------------------------------------------

/**
 * Count the number of rovo:agent entries declared in manifest.yml.
 * Returns { count: number, keys: string[] } or throws on parse error.
 * @param {string} manifestPath
 * @returns {{ count: number, keys: string[] }}
 */
function countManifestAgents(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.yml not found at: ${manifestPath}`);
  }

  const text = fs.readFileSync(manifestPath, "utf8");

  // Find the rovo:agent section (indented under modules:)
  // Pattern: lines indented under "  rovo:agent:" until the next top-level key
  const rovoSectionMatch = text.match(/^\s{2}rovo:agent:\n([\s\S]*?)(?=\n\s{2}\w|\n\w|\s*$)/m);
  if (!rovoSectionMatch) {
    return { count: 0, keys: [] };
  }

  const section = rovoSectionMatch[1];
  // Each agent entry starts with "    - key: <keyname>"
  const keyMatches = section.match(/^\s{4}-\s+key:\s+(\S+)/gm) || [];
  const keys = keyMatches.map((m) => m.replace(/^\s+- key:\s+/, "").trim());

  return { count: keys.length, keys };
}

// ---------------------------------------------------------------------------
// Check forge install list for site status
// ---------------------------------------------------------------------------

/**
 * Run `forge install list` and check that the given site is "Up-to-date".
 * Returns { found: boolean, status: string, raw: string }
 * @param {string} site
 * @returns {{ found: boolean, status: string, raw: string }}
 */
function checkForgeInstallStatus(site) {
  let raw = "";
  try {
    const result = spawnSync("forge", ["install", "list"], {
      encoding: "utf8",
      timeout: 30000,
    });
    raw = (result.stdout || "") + (result.stderr || "");
  } catch (err) {
    return { found: false, status: "ERROR", raw: String(err.message) };
  }

  // Look for the site in the output table
  // Table row format (approximate): │ <uuid> │ development │ <site> │ Jira │ <version> │ <status> │
  const lines = raw.split("\n");
  for (const line of lines) {
    if (line.includes(site)) {
      // Extract status — it's the last cell before │ at end of row
      const statusMatch = line.match(/Up-to-date|Out-of-date|Pending/i);
      if (statusMatch) {
        return { found: true, status: statusMatch[0], raw };
      }
      // Site found but status not parsed
      return { found: true, status: "UNKNOWN", raw };
    }
  }

  return { found: false, status: "NOT_FOUND", raw };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");
  const manifestPath = path.join(repoRoot, "manifest.yml");

  console.log("=== Rovo Agent Visibility Check ===");
  console.log(`Manifest:  ${manifestPath}`);
  console.log(`Site:      ${args.site}`);
  console.log(`Expected:  ${args.expected} rovo:agent entries`);
  console.log("");

  let allPassed = true;

  // -------------------------------------------------------------------------
  // Check 1: Count agents in manifest
  // -------------------------------------------------------------------------
  console.log("Check 1: Count rovo:agent entries in manifest.yml");
  let agentInfo;
  try {
    agentInfo = countManifestAgents(manifestPath);
  } catch (err) {
    console.error(`  FAIL: ${err.message}`);
    process.exit(1);
  }

  const { count, keys } = agentInfo;
  if (count === args.expected) {
    console.log(`  PASS: manifest declares ${count} rovo:agent entries (expected ${args.expected})`);
    for (const k of keys) {
      console.log(`    - ${k}`);
    }
  } else {
    console.error(`  FAIL: manifest declares ${count} rovo:agent entries, expected ${args.expected}`);
    console.error("  Keys found:");
    for (const k of keys) {
      console.error(`    - ${k}`);
    }
    allPassed = false;
  }

  console.log("");

  // -------------------------------------------------------------------------
  // Check 2: forge install list shows Up-to-date for target site
  // -------------------------------------------------------------------------
  console.log(`Check 2: forge install list — verify site "${args.site}" is Up-to-date`);
  const installCheck = checkForgeInstallStatus(args.site);

  if (!installCheck.found) {
    console.error(`  FAIL: Site "${args.site}" not found in forge install list output.`);
    console.error("  Run: forge install --site <site> --product jira --environment development");
    console.error("  Raw output:");
    for (const line of installCheck.raw.split("\n").slice(0, 20)) {
      console.error(`    ${line}`);
    }
    allPassed = false;
  } else if (installCheck.status.toLowerCase() === "up-to-date") {
    console.log(`  PASS: Site "${args.site}" status is Up-to-date`);
  } else {
    console.error(`  FAIL: Site "${args.site}" status is "${installCheck.status}" (expected Up-to-date)`);
    console.error("  Run: forge deploy -e development && forge install --upgrade");
    allPassed = false;
  }

  console.log("");

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("=== Rovo Visibility Summary ===");
  if (allPassed) {
    console.log(`PASS: ${count} rovo:agent entries declared in manifest AND site is Up-to-date.`);
    console.log(`All ${count} agents are guaranteed visible in Rovo on ${args.site}.`);
    console.log("");
    console.log("Deployment guarantee: Forge apps expose all modules in manifest.yml to the");
    console.log("installed site when status is Up-to-date. No separate per-agent verification");
    console.log("endpoint exists in the Atlassian REST API with standard OAuth scopes.");
    console.log("");
    console.log("Manual spot-check (optional): navigate to");
    console.log(`  https://${args.site}/jira/apps/rovo/agents`);
    console.log("and confirm agents with 'AI' prefix are listed.");
    process.exit(0);
  } else {
    console.error("FAIL: One or more checks did not pass. See above for details.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Exports (for testing)
// ---------------------------------------------------------------------------

if (require.main === module) {
  main();
}

module.exports = { countManifestAgents, checkForgeInstallStatus };
