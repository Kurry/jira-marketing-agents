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

  const payload = JSON.stringify({
    cloudId: config.cloudId,
    rules: allRules,
    dryRun: args.dryRun,
  });

  if (args.dryRun) {
    console.log("\nDRY RUN: payload built. Would invoke fn-import-automation with:");
    for (const r of allRules) {
      console.log(`  - ${r.name} [${r.state}]`);
    }
    console.log("\nRe-run without --dry-run to invoke the Forge function.");
    process.exit(0);
  }

  console.log("\nInvoking fn-import-automation via `forge invoke function`...");
  console.log("(Requires: forge deploy -e development already run)");

  let output;
  try {
    output = execFileSync(
      "forge",
      ["invoke", "function", "fn-import-automation", "--payload", payload],
      {
        encoding: "utf8",
        cwd: repoRoot,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (err) {
    console.error("\nERROR: forge invoke function failed.");
    console.error(err.stdout || "");
    console.error(err.stderr || "");
    console.error(
      "\nTroubleshooting:\n" +
        "  1. forge deploy -e development\n" +
        "  2. forge install list  (confirm app is installed)\n" +
        "  3. Check that manifest.yml includes fn-import-automation\n" +
        "  4. If scope error: forge deploy after adding manage:jira-configuration to manifest.yml"
    );
    process.exit(1);
  }

  console.log("\n=== Forge function response ===");
  console.log(output);

  let result;
  try {
    // forge invoke output may include log lines before the JSON — grab last JSON block
    const jsonMatch = output.match(/(\{[\s\S]*\})\s*$/);
    if (jsonMatch) result = JSON.parse(jsonMatch[1]);
  } catch {
    // Non-JSON response is fine; already printed above
  }

  if (result) {
    if (result.dryRun) {
      console.log("\nDRY RUN confirmed by function — no rules imported.");
    } else {
      console.log(`\nImported: ${result.imported ?? "?"} | Failed: ${result.failed ?? "?"}`);

      if (result.failed > 0) {
        console.error("\nSome rules failed to import:");
        for (const e of result.errors || []) {
          console.error(`  - ${e.name} (HTTP ${e.status})`);
        }

        // Evidence
        const evidenceDir = path.join(repoRoot, "evidence", "automation");
        fs.mkdirSync(evidenceDir, { recursive: true });
        const outPath = path.join(evidenceDir, "forge-import-output.json");
        fs.writeFileSync(outPath, JSON.stringify({ ...result, timestamp: new Date().toISOString() }, null, 2));
        console.log(`\nWrote evidence: ${path.relative(repoRoot, outPath)}`);
        process.exit(1);
      }
    }
  }

  // Write success evidence
  const evidenceDir = path.join(repoRoot, "evidence", "automation");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, "forge-import-output.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        cloudId: config.cloudId,
        ruleCount: allRules.length,
        ruleNames: allRules.map((r) => r.name),
        importMethod: "forge-function",
        result: result ?? output,
      },
      null,
      2
    )
  );
  console.log(`\nEvidence written: ${path.relative(repoRoot, outPath)}`);
  console.log("\nDone. All rules imported as DISABLED — enable via T-M3-03 after audit log review.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
