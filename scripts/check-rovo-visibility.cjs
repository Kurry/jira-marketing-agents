#!/usr/bin/env node
"use strict";

// scripts/check-rovo-visibility.cjs
// Verifies the repo-local Rovo manifest contract and Forge installation status.
//
// Strategy:
//   1. Count rovo:agent keys in manifest.yml (ground truth of what SHOULD be
//      declared)
//   2. Run `forge install list` and check the target site shows "Up-to-date"
//   3. Cross-check: if (1) matches expected count AND (2) is Up-to-date, exit 0.
//      Any mismatch or "Out-of-date" exits 1 with a clear diagnostic.
//
// This script does not perform UI inspection or call a public Rovo agent listing
// API. Passing output means manifest/install are verified; actual Rovo UI/API
// visibility remains a separate confirmation step.
//
// Usage:
//   node scripts/check-rovo-visibility.cjs [--site <site>] [--expected <n>]
//
// Defaults:
//   --site       myhealthcaresite.atlassian.net (or JIRA_SITE env var)
//   --expected   19 (AIGO manifest agent count)
//
// Exit codes:
//   0 - manifest count and Forge install status checks pass
//   1 - a check failed (see output for which one)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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
  const lines = text.split("\n");

  let inRovoSection = false;
  const keys = [];

  for (const line of lines) {
    // Detect start of the rovo:agent section (exactly 2-space indent in modules:)
    if (line === "  rovo:agent:") {
      inRovoSection = true;
      continue;
    }
    if (!inRovoSection) continue;

    // Exit the section when we hit a peer-level module key (2-space indent + non-space)
    // or a top-level key (no indent). Blank lines are fine; stay in section.
    if (line.length > 0 && !/^\s/.test(line)) {
      break; // top-level key (e.g., "permissions:")
    }
    if (/^\s{2}\S/.test(line)) {
      break; // sibling module under modules: (e.g., "  action:")
    }

    // Each agent entry: "    - key: <keyname>"
    const keyMatch = line.match(/^\s{4}-\s+key:\s+(\S+)/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }

  return { count: keys.length, keys };
}

// ---------------------------------------------------------------------------
// Check forge install list for site status
// ---------------------------------------------------------------------------

/**
 * Parse `forge install list` output for the target site status.
 * Returns { found: boolean, status: string, raw: string }
 * @param {string} raw
 * @param {string} site
 * @returns {{ found: boolean, status: string, raw: string }}
 */
function parseForgeInstallStatus(raw, site) {
  // Look for the site in the output table
  // Table row format (approximate): | <uuid> | development | <site> | Jira | <version> | <status> |
  const lines = raw.split("\n");
  for (const line of lines) {
    if (line.includes(site)) {
      // Extract status from the row containing the target site.
      const statusMatch = line.match(/\b(Up-to-date|Out-of-date|Pending)\b/i);
      if (statusMatch) {
        return { found: true, status: statusMatch[0], raw };
      }
      // Site found but status not parsed
      return { found: true, status: "UNKNOWN", raw };
    }
  }

  return { found: false, status: "NOT_FOUND", raw };
}

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
    if (result.error) {
      return { found: false, status: "ERROR", raw: raw || String(result.error.message) };
    }
  } catch (err) {
    return { found: false, status: "ERROR", raw: String(err.message) };
  }

  return parseForgeInstallStatus(raw, site);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");
  const manifestPath = path.join(repoRoot, "manifest.yml");

  console.log("=== Rovo Manifest/Install Check ===");
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
  console.log(`Check 2: forge install list - verify site "${args.site}" is Up-to-date`);
  const installCheck = checkForgeInstallStatus(args.site);

  if (installCheck.status === "ERROR") {
    console.error("  FAIL: Unable to run or parse `forge install list`.");
    console.error("  Raw output:");
    for (const line of installCheck.raw.split("\n").slice(0, 20)) {
      console.error(`    ${line}`);
    }
    allPassed = false;
  } else if (!installCheck.found) {
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
  console.log("=== Rovo Manifest/Install Summary ===");
  if (allPassed) {
    console.log(`PASS: manifest declares ${count} rovo:agent entries and Forge reports ${args.site} Up-to-date.`);
    console.log("This proves only manifest agent count plus Forge installation status.");
    console.log("UI/API confirmation is pending for actual Rovo visibility.");
    console.log("");
    console.log("Confirmation step: inspect the Rovo UI, or use a public Atlassian agent");
    console.log("listing API if Atlassian exposes one for this tenant.");
    console.log(`  https://${args.site}/jira/apps/rovo/agents`);
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

module.exports = { countManifestAgents, parseForgeInstallStatus, checkForgeInstallStatus };
