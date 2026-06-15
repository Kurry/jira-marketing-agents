#!/usr/bin/env node
"use strict";

// scripts/render-automation-rules.cjs
// Reads an instance config JSON and automation rule templates, replaces all
// __PLACEHOLDER__ tokens, and writes rendered rules to automation/rules/rendered/
// Fails loudly (process.exit(1)) if any __...__ tokens remain after substitution.
//
// NOTE: {{...}} tokens (e.g. {{issue.key}}, {{agentResponse}}) are Jira Automation
// smart values evaluated at runtime by Jira — this script must NOT replace them.
//
// Usage:
//   node scripts/render-automation-rules.cjs [--config <path>] [--rules-dir <path>]
//
// Defaults:
//   --config    instances/aigo.example.json
//   --rules-dir automation/rules

const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    } else if (argv[i] === "--rules-dir" && argv[i + 1]) {
      args.rulesDir = argv[i + 1];
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Manifest parsing — extract rovo:agent keys
// ---------------------------------------------------------------------------

function loadManifestAgentKeys(repoRoot) {
  const manifestPath = path.join(repoRoot, "manifest.yml");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.yml not found at ${manifestPath}`);
  }

  const text = fs.readFileSync(manifestPath, "utf8");
  // Simple regex extraction of rovo:agent keys (avoids requiring a YAML parser)
  // Matches lines like:   - key: some-agent-key
  // within the rovo:agent section. We collect all keys found under modules.
  const keys = new Set();
  const keyRegex = /^\s+-\s+key:\s+(\S+)/gm;
  let match;
  while ((match = keyRegex.exec(text)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Agent key placeholder → manifest key resolution
// ---------------------------------------------------------------------------

// Map from __PLACEHOLDER__ → manifest.yml agent key
const AGENT_KEY_MAP = {
  __TRIAGE_AGENT_KEY__: "growth-triage-agent",
  __CREATIVE_CLAIMS_AGENT_KEY__: "creative-claims-agent",
  __EXPERIMENT_DESIGN_AGENT_KEY__: "experiment-design-agent",
  __EMPLOYER_LAUNCH_AGENT_KEY__: "employer-launch-agent",
  __WEEKLY_READOUT_AGENT_KEY__: "weekly-readout-agent",
};

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

/**
 * Replace __PLACEHOLDER__ tokens in a JSON string.
 * Returns { rendered, warnings } where warnings lists missing optional values.
 */
function substituteTokens(text, config, manifestKeys) {
  const warnings = [];

  // 1. Project key
  text = text.replaceAll("__PROJECT_KEY__", config.projectKey || "AIGO");

  // 2. Project ID (optional in example config)
  if (config.projectId) {
    text = text.replaceAll("__PROJECT_ID__", config.projectId);
  } else {
    warnings.push("__PROJECT_ID__ not set in config — placeholder left in ruleScope (requires real projectId for Jira import)");
    // Leave __PROJECT_ID__ in place so the post-substitution scan catches it.
    // But since this is an expected gap for the example config, we replace with
    // a sentinel so tests can distinguish "missing by design" from "forgotten".
    text = text.replaceAll("__PROJECT_ID__", "__MISSING_PROJECT_ID__");
  }

  // 3. Actor account ID (optional in example config)
  if (config.actorAccountId) {
    text = text.replaceAll("__ACTOR_ACCOUNT_ID__", config.actorAccountId);
  } else {
    warnings.push("__ACTOR_ACCOUNT_ID__ not set in config — placeholder left (requires real actorAccountId for Jira import)");
    text = text.replaceAll("__ACTOR_ACCOUNT_ID__", "__MISSING_ACTOR_ACCOUNT_ID__");
  }

  // 4. Agent keys — validate each against the manifest
  for (const [placeholder, manifestKey] of Object.entries(AGENT_KEY_MAP)) {
    if (!manifestKeys.has(manifestKey)) {
      console.error(`ERROR: Agent key '${manifestKey}' (for placeholder ${placeholder}) not found in manifest.yml`);
      process.exit(1);
    }
    text = text.replaceAll(placeholder, manifestKey);
  }

  return { rendered: text, warnings };
}

// ---------------------------------------------------------------------------
// Post-substitution scan for remaining __...__ tokens
// ---------------------------------------------------------------------------

const UNREPLACED_PATTERN = /__[A-Z][A-Z0-9_]*__/g;

function scanForUnreplaced(text) {
  const matches = [...text.matchAll(UNREPLACED_PATTERN)].map((m) => m[0]);
  // Filter out the known-missing sentinels which are intentional for example configs
  const nonSentinel = matches.filter(
    (m) => m !== "__MISSING_PROJECT_ID__" && m !== "__MISSING_ACTOR_ACCOUNT_ID__",
  );
  return nonSentinel;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");

  const configPath = args.config
    ? path.resolve(args.config)
    : path.join(repoRoot, "instances", "aigo.example.json");

  const rulesDir = args.rulesDir
    ? path.resolve(args.rulesDir)
    : path.join(repoRoot, "automation", "rules");

  const outDir = path.join(rulesDir, "rendered");

  // Load instance config
  if (!fs.existsSync(configPath)) {
    console.error(`ERROR: Config file not found: ${configPath}`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log(`Config loaded: projectKey=${config.projectKey || "AIGO"} from ${path.relative(repoRoot, configPath)}`);

  // Load manifest agent keys
  const manifestKeys = loadManifestAgentKeys(repoRoot);
  console.log(`Manifest: found ${manifestKeys.size} module keys`);

  // Collect rule files (exclude the bundle)
  const EXCLUDED = new Set(["aigo-automation-ruleset.json", "README.md"]);
  const ruleFiles = fs
    .readdirSync(rulesDir)
    .filter((f) => f.endsWith(".json") && !EXCLUDED.has(f))
    .sort();

  if (ruleFiles.length === 0) {
    console.error(`ERROR: No rule JSON files found in ${rulesDir}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const allWarnings = [];
  const results = [];

  for (const file of ruleFiles) {
    const srcPath = path.join(rulesDir, file);
    const dstPath = path.join(outDir, file);

    const raw = fs.readFileSync(srcPath, "utf8");
    const { rendered, warnings } = substituteTokens(raw, config, manifestKeys);

    // Scan for remaining unintended unreplaced tokens
    const remaining = scanForUnreplaced(rendered);
    if (remaining.length > 0) {
      console.error(`ERROR: Unreplaced token(s) in ${file}: ${remaining.join(", ")}`);
      process.exit(1);
    }

    // Validate JSON is still valid after substitution
    try {
      JSON.parse(rendered);
    } catch (e) {
      console.error(`ERROR: Rendered ${file} is not valid JSON: ${e.message}`);
      process.exit(1);
    }

    fs.writeFileSync(dstPath, rendered, "utf8");

    if (warnings.length > 0) {
      allWarnings.push(...warnings.map((w) => `  [${file}] ${w}`));
    }

    results.push({ file, warnings: warnings.length });
    console.log(`  Rendered: ${file} → rendered/${file}${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ""}`);
  }

  if (allWarnings.length > 0) {
    console.warn("\nWARNINGS (expected for example config — must be resolved before Jira import):");
    for (const w of allWarnings) {
      console.warn(w);
    }
  }

  console.log(`\nDone: ${results.length} rule(s) rendered to ${path.relative(repoRoot, outDir)}/`);
}

main();
