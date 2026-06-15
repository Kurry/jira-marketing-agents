#!/usr/bin/env node
// generated_by: scripts/audit/forge-snapshot.mjs
//
// Read-only audit of the Forge app: install status on the staging site and a
// structural count of the manifest (agents/actions/functions/webtrigger).
// Writes evidence/audit/forge.json. Never deploys, installs, or mutates.
//
// T-NIH-07 classification: native-wrapper (audit harness). Native owner
// (matrix row "Agent runtime" / Forge): the native `forge install list --json`
// CLI. Install-status discovery is delegated to scripts/lib/forge.mjs
// (getInstallations / findStagingInstall / classifyStatus / hasProductionInstall)
// — the single shared Forge CLI wrapper; this script no longer re-implements
// CLI output parsing.
// Remaining NIH caveat: auditManifest() hand-rolls a line-based YAML scanner
//   (indent regexes) instead of parsing manifest.yml with the `yaml` dependency
//   the repo already uses elsewhere. It is audit-only/non-authoritative
//   (manifest contract tests own correctness).

import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  getInstallations,
  findStagingInstall,
  classifyStatus,
  hasProductionInstall,
} from "../lib/forge.mjs";
import { STAGING_SITE, FORGE_ENV } from "../lib/staging.mjs";

const SCRIPT = "scripts/audit/forge-snapshot.mjs";
const SITE = STAGING_SITE;

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

// Resolve Forge install status via the shared lib/forge.mjs wrapper
// (`forge install list --json`). getInstallations() exits 3 if the CLI is
// unauthenticated and 2 on unexpected failure.
function getForgeInstall() {
  const rows = getInstallations();
  const row = findStagingInstall(rows);
  const installStatus = classifyStatus(row);
  return {
    installStatus,
    row,
    deployedToProduction: hasProductionInstall(rows),
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
