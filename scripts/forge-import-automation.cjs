#!/usr/bin/env node
"use strict";

// scripts/forge-import-automation.cjs
// Reads rendered rule JSON files and invokes the fn-import-automation Forge
// function via `forge invoke function`. All rules are imported DISABLED.
//
// Usage:
//   node scripts/forge-import-automation.cjs [--config <path>] [--dry-run]
//
// Prerequisites:
//   forge deploy -e development   (must be deployed with fn-import-automation)
//   forge install                 (app must be installed on the target site)
//
// Exit codes:
//   0 — all rules imported (or dry-run)
//   1 — fatal / partial failure

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");

  const configPath = args.config
    ? path.resolve(args.config)
    : path.join(repoRoot, "instances", "aigo.example.json");

  if (!fs.existsSync(configPath)) {
    console.error(`ERROR: Config file not found: ${configPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error(`ERROR: Failed to parse config: ${err.message}`);
    process.exit(1);
  }

  if (!config.cloudId) {
    console.error("ERROR: Config missing cloudId");
    process.exit(1);
  }

  const renderedDir = path.join(repoRoot, "automation", "rules", "rendered");
  if (!fs.existsSync(renderedDir)) {
    console.error(`ERROR: Rendered rules directory not found: ${renderedDir}`);
    console.error("Run: node scripts/render-automation-rules.cjs --config " + configPath);
    process.exit(1);
  }

  const renderedFiles = fs
    .readdirSync(renderedDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (renderedFiles.length === 0) {
    console.error(`ERROR: No rendered rule JSON files in ${renderedDir}`);
    process.exit(1);
  }

  // Collect all rule objects from rendered files
  const allRules = [];
  for (const file of renderedFiles) {
    const filePath = path.join(renderedDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.error(`ERROR: Cannot parse ${file}: ${err.message}`);
      process.exit(1);
    }

    let rules;
    if (Array.isArray(parsed)) {
      rules = parsed;
    } else if (parsed && Array.isArray(parsed.rules)) {
      rules = parsed.rules;
    } else if (parsed && typeof parsed === "object" && parsed.name) {
      rules = [parsed];
    } else {
      console.error(`ERROR: ${file}: unrecognised format — expected {rules:[...]} or a rule object`);
      process.exit(1);
    }

    for (const r of rules) {
      if (r.state !== "DISABLED") {
        console.error(`ERROR: Rule '${r.name}' in ${file} has state '${r.state}' — must be DISABLED before import`);
        process.exit(1);
      }
    }

    allRules.push(...rules);
    console.log(`  Loaded ${rules.length} rule(s) from ${file}`);
  }

  console.log(`\nTotal rules to import: ${allRules.length}`);

  if (args.dryRun) {
    console.log("\nDRY RUN: payload built. Would import via Jira REST:");
    for (const r of allRules) {
      console.log(`  - ${r.name} [${r.state}]`);
    }
    console.log("\nRe-run without --dry-run to invoke the Jira REST import.");
    process.exit(0);
  }

  // `forge invoke function` was removed from Forge CLI — delegate to provision-automation.cjs
  // which uses the Jira REST API directly (requires ATLASSIAN_TOKEN or acli credentials).
  console.log("\nDelegating to provision-automation.cjs (Jira REST import)...");

  try {
    execFileSync(
      process.execPath,
      [path.join(repoRoot, "scripts", "provision-automation.cjs")],
      {
        encoding: "utf8",
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env },
      }
    );
  } catch (err) {
    // provision-automation.cjs already printed detailed error + manual steps
    process.exit(err.status ?? 1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
