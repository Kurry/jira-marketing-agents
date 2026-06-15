#!/usr/bin/env node
"use strict";

// scripts/provision-all.cjs
// Top-level orchestrator: provisions a full AIGO Jira instance in one shot.
// Each step calls a subscript or external command as a child process.
//
// Usage:
//   node scripts/provision-all.cjs [--config <path>] [--dry-run] [--env <forge-env>] [--site <site>]
//
// Defaults:
//   --config   instances/aigo.example.json
//   --env      development
//   --dry-run  only runs Steps 1–2 (config validation + forge lint), no mutations
//
// Exit codes:
//   0 — success
//   1 — step failed (which step is printed)

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadInstanceConfig, envForConfig } = require("./instance-config.cjs");

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    dryRun: false,
    config: null,
    env: process.env.FORGE_ENV || process.env.AIGO_FORGE_ENV || null,
    site: process.env.JIRA_SITE || process.env.AIGO_JIRA_SITE || null,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else if (argv[i] === "--env" && argv[i + 1]) {
      args.env = argv[i + 1];
      i++;
    } else if (argv[i] === "--site" && argv[i + 1]) {
      args.site = argv[i + 1];
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

/**
 * Run a command as a child process.
 * @param {string} label - human-readable step name
 * @param {string} cmd - command to run
 * @param {string[]} args - arguments
 * @param {object} [opts] - spawnSync options override
 * @param {object} [options]
 * @param {boolean} [options.allowExitCode2] - treat exit code 2 as a soft warning (not fatal)
 * @returns {{ ok: boolean, code: number, stderr: string }}
 */
function runStep(label, cmd, args, opts = {}, options = {}) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: ${label}`);
  console.log(`CMD:  ${cmd} ${args.join(" ")}`);
  console.log("=".repeat(60));

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    encoding: "utf8",
    ...opts,
  });

  const code = result.status;

  if (code === 0) {
    console.log(`  ✓ Step passed: ${label}`);
    return { ok: true, code: 0, stderr: "" };
  }

  if (code === 2 && options.allowExitCode2) {
    console.log(`  ⚠ Step returned code 2 (manual action required): ${label}`);
    return { ok: true, code: 2, stderr: result.stderr || "" };
  }

  console.error(`\nERROR: Step failed: ${label} (exit code: ${code})`);
  return { ok: false, code: code ?? 1, stderr: result.stderr || "" };
}

/**
 * Run a Node.js script as a child process.
 * @param {string} label
 * @param {string} scriptPath - relative to repoRoot
 * @param {string[]} extraArgs
 * @param {string} repoRoot
 * @param {object} [options]
 * @returns {{ ok: boolean, code: number }}
 */
function runNodeScript(label, scriptPath, extraArgs, repoRoot, options = {}) {
  return runStep(
    label,
    process.execPath,
    [scriptPath, ...extraArgs],
    { cwd: repoRoot, env: options.env || process.env },
    { allowExitCode2: options.allowExitCode2 }
  );
}

/**
 * Run an npm script.
 * @param {string} label
 * @param {string} script - npm script name
 * @param {string} repoRoot
 * @param {object} [options]
 */
function runNpmScript(label, script, repoRoot, options = {}) {
  // Use npm run <script> — cross-platform
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return runStep(
    label,
    npm,
    ["run", script],
    { cwd: repoRoot, env: options.env || process.env },
    { allowExitCode2: options.allowExitCode2 }
  );
}

/**
 * Run a forge CLI command.
 * @param {string} label
 * @param {string[]} forgeArgs
 * @param {string} repoRoot
 * @param {object} [options]
 */
function runForge(label, forgeArgs, repoRoot, options = {}) {
  return runStep(
    label,
    "forge",
    forgeArgs,
    { cwd: repoRoot, env: options.env || process.env },
    { allowExitCode2: options.allowExitCode2 }
  );
}

// ---------------------------------------------------------------------------
// Detect "already installed" from forge install stderr
// ---------------------------------------------------------------------------

/**
 * Run forge install, but skip if already installed (detected via output text).
 * Returns { ok: boolean, skipped: boolean }
 */
function runForgeInstall(site, forgeEnv, repoRoot, env = process.env) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: forge install`);
  console.log(`CMD:  forge install --site ${site} --product jira --environment ${forgeEnv}`);
  console.log("=".repeat(60));

  const result = spawnSync(
    "forge",
    ["install", "--site", site, "--product", "jira", "--environment", forgeEnv],
    { cwd: repoRoot, encoding: "utf8", env }
  );

  const combined = (result.stdout || "") + (result.stderr || "");
  const alreadyInstalled = /already installed/i.test(combined);

  if (result.status === 0 || alreadyInstalled) {
    if (alreadyInstalled) {
      console.log("  ✓ Already installed — skipping install step.");
    } else {
      console.log("  ✓ Install succeeded.");
    }
    return { ok: true, skipped: alreadyInstalled };
  }

  console.error(`\nERROR: forge install failed (exit code: ${result.status})`);
  if (result.stderr) console.error(result.stderr);
  return { ok: false, skipped: false };
}

// ---------------------------------------------------------------------------
// Apply forge variables from forge-vars.sh
// ---------------------------------------------------------------------------

/**
 * Source the generated forge-vars.sh and run each `forge variables set` command.
 * Returns { ok: boolean }
 */
function applyForgeVars(forgeVarsPath, repoRoot, env = process.env) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("STEP: Apply forge variables");
  console.log(`FILE: ${forgeVarsPath}`);
  console.log("=".repeat(60));

  if (!fs.existsSync(forgeVarsPath)) {
    console.log(`  NOTE: forge-vars.sh not found at ${forgeVarsPath} — skipping.`);
    console.log("  Run npm run provision:jira first to generate it.");
    return { ok: true };
  }

  const script = fs.readFileSync(forgeVarsPath, "utf8");
  const forgeSetLines = script
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("forge variables set"));

  if (forgeSetLines.length === 0) {
    console.log("  No forge variable set commands found — nothing to apply.");
    return { ok: true };
  }

  let allOk = true;
  for (const line of forgeSetLines) {
    // Parse: forge variables set KEY VALUE --environment ENV
    const parts = line.split(/\s+/);
    // parts[0]=forge parts[1]=variables parts[2]=set parts[3]=KEY parts[4]=VALUE parts[5+]=flags
    const varArgs = parts.slice(1); // drop "forge"
    console.log(`  Running: forge ${varArgs.join(" ")}`);
    const result = spawnSync("forge", varArgs, { cwd: repoRoot, stdio: "inherit", env });
    if (result.status !== 0) {
      console.error(`  ERROR: forge ${varArgs.join(" ")} failed (exit ${result.status})`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log(`  ✓ Applied ${forgeSetLines.length} forge variable(s).`);
  }
  return { ok: allOk };
}

function selectProvisionConfig(configPath, args) {
  const config = loadInstanceConfig(configPath);
  if (args.site) config.site = String(args.site).trim();
  if (args.env) config.forgeEnvironment = String(args.env).trim();
  return config;
}

function buildChildEnv(config, configPath) {
  return {
    ...envForConfig(config),
    AIGO_INSTANCE_CONFIG: configPath,
  };
}

// ---------------------------------------------------------------------------
// Manual steps
// ---------------------------------------------------------------------------

function printManualSteps() {
  console.log(`
${"=".repeat(60)}
=== Manual steps required (UI steps — cannot be automated) ===
${"=".repeat(60)}

1. Jira UI: AIGO → Project Settings → Issue Types
   → Add all 14 canonical types if not already created by provision:jira:
     AI Growth Request, Creative Request, Experiment, Segmentation Request,
     Personalization Journey, Employer Launch, Campaign, Dashboard Request,
     Signup Funnel Issue, Research Brief, Claims Review, Decision Memo,
     Positioning Update, Bug / Tracking Issue

2. Jira UI: AIGO → Project Settings → Board
   → Add these 8 statuses to board columns:
     Intake, Triage, Spec Ready, In Review, Claims Review,
     Experiment Running, Decision Needed, Launch Prep

3. Browser: verify all 19 Rovo agents visible at
   <your-site>.atlassian.net → Apps → Rovo → Agents
   (look for agents starting with "AI Growth Ops")

4. Run first manual agent test (test cases T-M4-01 through T-M4-06):
   - T-M4-01: Create AIGO issue, verify Intake Triage comment
   - T-M4-02: Creative Request with prohibited claim → verify Claims flag
   - T-M4-03: Experiment issue → verify spec comment
   - T-M4-04: Employer Launch → verify readiness score
   - T-M4-05: Weekly readout rule → verify Decision Memo
   - T-M4-06: Duplicate issue → verify duplicate flag comment

${"=".repeat(60)}
`);
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

  let config;
  try {
    config = selectProvisionConfig(configPath, args);
  } catch (err) {
    console.error(`ERROR: Failed to load instance config: ${err.message}`);
    process.exit(1);
  }

  const childEnv = buildChildEnv(config, configPath);
  const forgeEnv = config.forgeEnvironment;
  const site = config.site;

  console.log("=".repeat(60));
  console.log("AIGO Provision-All Orchestrator");
  console.log("=".repeat(60));
  console.log(`Config:    ${configPath}`);
  console.log(`Forge env: ${forgeEnv}`);
  console.log(`Site:      ${site || "(from config or JIRA_SITE)"}`);
  console.log(`Dry run:   ${args.dryRun}`);

  // -------------------------------------------------------------------------
  // Step 1: Validate config
  // -------------------------------------------------------------------------
  const step1 = runNodeScript(
    "Step 1: Validate config (provision-jira --dry-run)",
    "scripts/provision-jira.cjs",
    ["--config", configPath, "--dry-run"],
    repoRoot,
    { env: childEnv }
  );
  if (!step1.ok) {
    console.error("\nFAIL at Step 1: Config validation. Fix config before continuing.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 2: forge lint
  // -------------------------------------------------------------------------
  const step2 = runForge("Step 2: forge lint (validate manifest)", ["lint"], repoRoot, { env: childEnv });
  if (!step2.ok) {
    console.error("\nFAIL at Step 2: forge lint. Fix manifest.yml before continuing.");
    process.exit(1);
  }

  // Dry-run exits after Steps 1–2
  if (args.dryRun) {
    console.log("\nDRY RUN complete: Steps 1 (config) and 2 (forge lint) passed. No mutations.");
    printManualSteps();
    process.exit(0);
  }

  // -------------------------------------------------------------------------
  // Step 3: forge deploy
  // -------------------------------------------------------------------------
  const step3 = runForge(
    `Step 3: forge deploy -e ${forgeEnv}`,
    ["deploy", "-e", forgeEnv],
    repoRoot,
    { env: childEnv }
  );
  if (!step3.ok) {
    console.error(`\nFAIL at Step 3: forge deploy -e ${forgeEnv}.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 4: forge install
  // -------------------------------------------------------------------------
  const installSite = site;

  if (!installSite) {
    console.error("\nERROR: No --site provided and config has no 'site' field. Cannot run forge install.");
    console.error("Set JIRA_SITE env var or pass --site <site>");
    process.exit(1);
  }

  const step4 = runForgeInstall(installSite, forgeEnv, repoRoot, childEnv);
  if (!step4.ok) {
    console.error(`\nFAIL at Step 4: forge install --site ${installSite}.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 5: provision Jira configuration
  // -------------------------------------------------------------------------
  const step5 = runNodeScript(
    "Step 5: node scripts/provision-jira.cjs (issue types, fields, statuses, options)",
    "scripts/provision-jira.cjs",
    ["--config", configPath],
    repoRoot,
    { env: childEnv }
  );
  if (!step5.ok) {
    console.error("\nFAIL at Step 5: provision:jira.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 6: Apply forge variables from evidence/jira-config/forge-vars.sh
  // -------------------------------------------------------------------------
  const forgeVarsPath = path.join(repoRoot, "evidence", "jira-config", "forge-vars.sh");
  const step6 = applyForgeVars(forgeVarsPath, repoRoot, childEnv);
  if (!step6.ok) {
    console.error("\nFAIL at Step 6: apply forge variables.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 7: forge deploy (re-deploy with new variables)
  // -------------------------------------------------------------------------
  const step7 = runForge(
    `Step 7: forge deploy -e ${forgeEnv} (re-deploy with new variables)`,
    ["deploy", "-e", forgeEnv],
    repoRoot,
    { env: childEnv }
  );
  if (!step7.ok) {
    console.error(`\nFAIL at Step 7: forge re-deploy -e ${forgeEnv}.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 8: provision seed issues
  // -------------------------------------------------------------------------
  const step8 = runNodeScript(
    "Step 8: node scripts/provision-seeds.cjs",
    "scripts/provision-seeds.cjs",
    ["--config", configPath],
    repoRoot,
    { env: childEnv }
  );
  if (!step8.ok) {
    console.error("\nFAIL at Step 8: provision:seeds.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 8b: npm run provision:filters (JQL saved filters)
  // -------------------------------------------------------------------------
  const step8b = runNpmScript(
    "Step 8b: npm run provision:filters (create 7 JQL saved filters)",
    "provision:filters",
    repoRoot,
    { env: childEnv, allowExitCode2: true }
  );
  if (!step8b.ok) {
    console.error("\nFAIL at Step 8b: provision:filters.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 8c: npm run provision:dashboards (6 dashboards)
  // -------------------------------------------------------------------------
  const step8c = runNpmScript(
    "Step 8c: npm run provision:dashboards (create 6 Jira dashboards)",
    "provision:dashboards",
    repoRoot,
    { env: childEnv, allowExitCode2: true }
  );
  if (!step8c.ok) {
    console.error("\nFAIL at Step 8c: provision:dashboards.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 9: npm run provision:automation
  // Renders and validates rules, then stops at the native Jira Automation
  // import/audit-log gate. Exit code 2 means manual/native import is required.
  // -------------------------------------------------------------------------
  const step9 = runNodeScript(
    "Step 9: node scripts/provision-automation.cjs (render/validate Automation rules)",
    "scripts/provision-automation.cjs",
    ["--config", configPath],
    repoRoot,
    { env: childEnv, allowExitCode2: true }
  );
  if (!step9.ok) {
    console.error("\nFAIL at Step 9: provision:automation.");
    console.error("Import rules manually via native Jira Automation after validation passes.");
    console.error("See docs/OPERATOR_PROMPTS.md → 'Import automation rules (T-M3-02)'.");
    process.exit(1);
  }
  if (step9.code === 2) {
    console.log("  NOTE: Automation import requires native Jira Automation UI/API steps — see docs/OPERATOR_PROMPTS.md.");
  }

  // -------------------------------------------------------------------------
  // Step 10: npm run test:smoke:jira
  // -------------------------------------------------------------------------
  const step10 = runNpmScript(
    "Step 10: npm run test:smoke:jira (verify)",
    "test:smoke:jira",
    repoRoot,
    { env: childEnv }
  );
  if (!step10.ok) {
    console.error("\nFAIL at Step 10: smoke test.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 11: npm run check:rovo (Rovo manifest/install verification)
  // -------------------------------------------------------------------------
  const step11 = runNpmScript(
    "Step 11: npm run check:rovo (verify Rovo manifest count and Forge install status)",
    "check:rovo",
    repoRoot,
    { env: childEnv }
  );
  if (!step11.ok) {
    console.error("\nFAIL at Step 11: Rovo manifest/install check.");
    console.error("Run 'npm run check:rovo' for details. If manifest/install checks fail, re-deploy and re-install.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 12: Print manual steps
  // -------------------------------------------------------------------------
  printManualSteps();

  console.log("=".repeat(60));
  console.log("provision-all complete.");
  console.log("=".repeat(60));
}

// ---------------------------------------------------------------------------
// Exports (for testing)
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
}

module.exports = { parseArgs, selectProvisionConfig, buildChildEnv };
