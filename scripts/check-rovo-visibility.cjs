#!/usr/bin/env node
"use strict";

// scripts/check-rovo-visibility.cjs
// Verifies the repo-local Rovo manifest contract and Forge installation status.
//
// Strategy:
//   1. Count rovo:agent keys in manifest.yml (ground truth of what SHOULD be
//      declared)
//   2. Run `forge install list --json` and check the target site shows
//      "Up-to-date"
//   3. Cross-check: if (1) matches expected count AND (2) is Up-to-date, exit 0.
//      Any mismatch or "Out-of-date" exits 1 with a clear diagnostic.
//
// This script does not perform UI inspection or call a public Rovo agent listing
// API. Passing output means manifest/install are verified; actual Rovo UI/API
// visibility remains a separate confirmation step.
//
// T-NIH-13: install-status discovery uses the DOCUMENTED `forge install list
// --json` flag. parseForgeInstallStatus consumes that JSON array
// ({ id, environment, site, product, majorVersion, appVersion, status }) so the
// box-drawing-table scrape is gone. (This is a .cjs CLI entrypoint; the ESM
// scripts/lib/forge.mjs is the shared wrapper for the .mjs IaC scripts.)
//
// Usage:
//   node scripts/check-rovo-visibility.cjs [--config <path>] [--site <site>] [--expected <n>]
//
// Defaults:
//   --config     optional JSON instance config
//   --site       config.site (or JIRA_SITE/AIGO_JIRA_SITE env var)
//   --expected   19 (AIGO manifest agent count)
//
// Exit codes:
//   0 - manifest count and Forge install status checks pass
//   1 - a check failed (see output for which one)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadInstanceConfig } = require("./instance-config.cjs");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const repoRoot = path.resolve(__dirname, "..");
  const args = {
    config: process.env.AIGO_INSTANCE_CONFIG || "",
    site: process.env.JIRA_SITE || process.env.AIGO_JIRA_SITE || "",
    expected: 19,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    } else if (argv[i] === "--site" && argv[i + 1]) {
      args.site = argv[i + 1];
      i++;
    } else if (argv[i] === "--expected" && argv[i + 1]) {
      args.expected = parseInt(argv[i + 1], 10);
      i++;
    }
  }
  if (!args.site) {
    const config = loadInstanceConfig(args.config || undefined);
    args.site = config.site;
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
 * Parse `forge install list --json` output for the target site status.
 * The CLI emits a JSON array of objects
 *   { id, environment, site, product, majorVersion, appVersion, status }.
 * Tolerates leading non-JSON noise (e.g. the Node-version warning) by slicing
 * from the first "[".
 * Returns { found: boolean, status: string, raw: string }
 * @param {string} raw
 * @param {string} site
 * @returns {{ found: boolean, status: string, raw: string }}
 */
function parseForgeInstallStatus(raw, site) {
  const start = raw.indexOf("[");
  if (start === -1) {
    return { found: false, status: "NOT_FOUND", raw };
  }
  let rows;
  try {
    rows = JSON.parse(raw.slice(start));
  } catch {
    return { found: false, status: "ERROR", raw };
  }
  if (!Array.isArray(rows)) {
    return { found: false, status: "NOT_FOUND", raw };
  }
  const match = rows.find((r) => r && r.site === site);
  if (!match) {
    return { found: false, status: "NOT_FOUND", raw };
  }
  return { found: true, status: match.status || "UNKNOWN", raw };
}

/**
 * Run `forge install list --json` and check that the given site is
 * "Up-to-date". Returns { found: boolean, status: string, raw: string }
 * @param {string} site
 * @returns {{ found: boolean, status: string, raw: string }}
 */
function checkForgeInstallStatus(site) {
  let raw = "";
  try {
    const result = spawnSync("forge", ["install", "list", "--json"], {
      encoding: "utf8",
      timeout: 30000,
    });
    // --json output is on stdout; the Node-version warning goes to stderr.
    raw = result.stdout || "";
    if (result.error) {
      const combined = raw + (result.stderr || "");
      return { found: false, status: "ERROR", raw: combined || String(result.error.message) };
    }
    if (!raw.trim()) {
      raw = result.stderr || "";
    }
  } catch (err) {
    return { found: false, status: "ERROR", raw: String(err.message) };
  }

  return parseForgeInstallStatus(raw, site);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(
    [
      "scripts/check-rovo-visibility.cjs",
      "",
      "Verifies manifest rovo:agent count and Forge install status",
      "(`forge install list --json`) for the target site.",
      "",
      "Usage:",
      "  node scripts/check-rovo-visibility.cjs [--config <path>] [--site <site>] [--expected <n>]",
      "",
      "Exit codes: 0 checks pass | 1 a check failed",
    ].join("\n"),
  );
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }
  const args = parseArgs(argv);
  const repoRoot = path.resolve(__dirname, "..");
  const manifestPath = path.join(repoRoot, "manifest.yml");

  if (!args.site) {
    console.error("ERROR: No Jira site configured. Pass --site <site> or set site in --config.");
    process.exit(1);
  }

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
