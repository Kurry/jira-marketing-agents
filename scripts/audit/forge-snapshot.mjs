#!/usr/bin/env node
// generated_by: scripts/audit/forge-snapshot.mjs
//
// Read-only audit of the Forge app: install status on the staging site and a
// structural count of the manifest (agents/actions/functions/webtrigger).
// Writes evidence/audit/forge.json. Never deploys, installs, or mutates.

import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SCRIPT = "scripts/audit/forge-snapshot.mjs";
const SITE = "myhealthcaresite.atlassian.net";
const FORGE_ENV = "development";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

function help() {
  process.stderr.write(
    `${SCRIPT}\n\n` +
      `Audits Forge install status (\`forge install list\`) and manifest.yml structure.\n` +
      `Read-only. Writes evidence/audit/forge.json.\n\n` +
      `Exit codes:\n` +
      `  0  success\n` +
      `  3  forge CLI not authenticated / not logged in\n` +
      `  2  unexpected failure (e.g. manifest unreadable)\n`,
  );
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  help();
  process.exit(0);
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// Parse `forge install list` table output. Returns the matching staging row or null.
function parseForgeInstallList(output) {
  const rows = [];
  for (const line of output.split("\n")) {
    // Table data rows are pipe-delimited with box-drawing borders.
    if (!line.includes("│")) continue;
    const cells = line
      .split("│")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 6) continue;
    // header row contains the literal column titles
    if (cells[0] === "Installation ID") continue;
    const [installationId, environment, site, apps, version, status] = cells;
    rows.push({ installationId, environment, site, apps, version, status });
  }
  return rows;
}

function getForgeInstall() {
  let output;
  try {
    output = execSync("forge install list", {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const combined = `${err.stdout || ""}${err.stderr || ""}${err.message || ""}`;
    if (/log in|not logged in|forge login|unauthenticated|authentication/i.test(combined)) {
      process.stderr.write(`[${SCRIPT}] forge CLI not authenticated. Run \`forge login\`.\n`);
      process.exit(3);
    }
    process.stderr.write(`[${SCRIPT}] forge install list failed: ${combined.slice(0, 500)}\n`);
    process.exit(2);
  }

  const rows = parseForgeInstallList(output);
  const stagingRows = rows.filter((r) => r.site === SITE);
  const prodRows = rows.filter((r) => /production/i.test(r.environment));
  const row = stagingRows.find((r) => r.environment === FORGE_ENV) || stagingRows[0] || null;

  let installStatus;
  if (!row) {
    installStatus = "not-installed";
  } else if (/up-to-date/i.test(row.status)) {
    installStatus = "Up-to-date";
  } else {
    installStatus = "outdated";
  }

  return {
    installStatus,
    row,
    deployedToProduction: prodRows.length > 0,
    allRows: rows,
  };
}

// Count manifest entries per module section by tracking the current top-level
// module key and matching `    - key:` lines (4-space indent) within it.
function auditManifest() {
  const manifestPath = resolve(REPO_ROOT, "manifest.yml");
  const text = readFileSync(manifestPath, "utf8");
  const lines = text.split("\n");

  let inModules = false;
  let currentModule = null;
  const counts = {};
  let hasWebtrigger = false;
  let webtriggerHandlerRegistered = false;

  for (const line of lines) {
    if (/^modules:\s*$/.test(line)) {
      inModules = true;
      continue;
    }
    if (inModules && /^\S/.test(line)) {
      // Dedented back to a top-level key: left the modules block.
      inModules = false;
      currentModule = null;
    }
    if (inModules) {
      // module key: two-space indent, e.g. "  rovo:agent:" or "  action:"
      const moduleMatch = line.match(/^ {2}([a-zA-Z][\w:]*):\s*$/);
      if (moduleMatch) {
        currentModule = moduleMatch[1];
        counts[currentModule] = counts[currentModule] || 0;
        if (currentModule === "webtrigger") hasWebtrigger = true;
        continue;
      }
      // entry key: four-space indent
      if (currentModule && /^ {4}- key:/.test(line)) {
        counts[currentModule] += 1;
      }
    }
  }

  webtriggerHandlerRegistered = /\bfn-agent-webtrigger\b/.test(text);

  return {
    rovo_agent_count: counts["rovo:agent"] || 0,
    action_count: counts["action"] || 0,
    function_count: counts["function"] || 0,
    webtrigger_count: counts["webtrigger"] || 0,
    has_webtrigger: hasWebtrigger,
    fn_agent_webtrigger_registered: webtriggerHandlerRegistered,
  };
}

function main() {
  const forge = getForgeInstall();
  const manifest = auditManifest();

  const summary =
    `Forge app: ${forge.installStatus} on ${SITE}, ` +
    `${manifest.rovo_agent_count} agents, ${manifest.action_count} actions`;

  const envelope = {
    generated_by: SCRIPT,
    generated_at: new Date().toISOString(),
    git_sha: git("rev-parse HEAD"),
    instance: "staging",
    exit_code: 0,
    summary,
    data: {
      install_status: forge.installStatus,
      site: SITE,
      deployed_to_production: forge.deployedToProduction,
      installation: forge.row,
      manifest: {
        rovo_agent_count: manifest.rovo_agent_count,
        action_count: manifest.action_count,
        function_count: manifest.function_count,
        webtrigger_count: manifest.webtrigger_count,
        has_webtrigger: manifest.has_webtrigger,
        fn_agent_webtrigger_registered: manifest.fn_agent_webtrigger_registered,
      },
      forge_env: FORGE_ENV,
    },
  };

  const outDir = resolve(REPO_ROOT, "evidence", "audit");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "forge.json"), JSON.stringify(envelope, null, 2) + "\n");

  process.stderr.write(`[${SCRIPT}] ${summary}\n`);
  if (forge.deployedToProduction) {
    process.stderr.write(`[${SCRIPT}] WARNING: app is installed in a production environment.\n`);
  }
  process.stderr.write(
    `[${SCRIPT}] manifest: ${manifest.function_count} functions, ` +
      `webtrigger=${manifest.has_webtrigger}, ` +
      `fn-agent-webtrigger registered=${manifest.fn_agent_webtrigger_registered}\n`,
  );

  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
  process.exit(0);
}

main();
