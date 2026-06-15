// scripts/lib/forge.mjs — shared Forge CLI wrapper for IaC scripts.
//
// This is the SINGLE place any IaC script talks to the Forge CLI for install
// status or webtrigger discovery. Other scripts must import from here rather
// than re-implementing CLI output parsing.
//
// Provides:
//   - parseInstallListJson(jsonStr) : parse `forge install list --json` → rows[]
//   - parseInstallList(text)        : back-compat shim, delegates to the JSON path
//   - getInstallations()            : run `forge install list --json`, return rows
//                                     (exit 3 if forge CLI is not authenticated)
//   - findStagingInstall(rows)      : pick the development row for the staging site
//   - getWebtriggerUrl()            : resolve the agent webtrigger URL from
//                                     WEBTRIGGER_URL env or `forge webtrigger list`
//
// Read-only: never deploys, installs, or mutates. Mutation happens only through
// the deploy/install npm scripts and the addAnalysisComment Forge action.
//
// T-NIH-07 classification: native-wrapper. Native owner (matrix row
// "Agent runtime" / Forge): the native `forge install list` and
// `forge webtrigger list` CLI commands. This module wraps those native
// commands; it does not re-implement install/webtrigger discovery.
//
// install list: uses the DOCUMENTED `--json` flag (Forge CLI reference
//   /platform/forge/cli-reference/install-list — verified via ctx7 and the
//   local `forge install list --help`). The JSON contract is an array of
//   objects { id, environment, site, product, majorVersion, appVersion,
//   status }; we normalize to the stable internal row shape below.
//
// getWebtriggerUrl: EXPERIMENTAL / brittle dependency. `forge webtrigger list`
//   has NO `--json` flag (verified via ctx7 and the local
//   `forge webtrigger list --help`: only -f/-s/-p/-e). It emits a box-drawing
//   TABLE; we scrape the first https URL out of it. This is the only available
//   surface — tracked as a platform gap in evidence/blockers/forge-json.json.
//   Switch to a structured flag if/when Forge exposes one for webtrigger list.

import { execSync } from "node:child_process";
import { STAGING_SITE, FORGE_ENV } from "./staging.mjs";

const WEBTRIGGER_MODULE_KEY = "agent-webtrigger";

/** Run a forge subcommand, returning combined stdout. Throws on failure. */
function runForge(args) {
  return execSync(`forge ${args}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Detect the "not logged in" condition from a forge error blob. */
function isAuthError(text) {
  return /log in|not logged in|forge login|unauthenticated|authentication|FORGE_EMAIL|FORGE_API_TOKEN/i.test(
    text,
  );
}

/**
 * Parse `forge install list --json` output into the stable internal row shape.
 * The CLI emits an array of objects with keys
 *   { id, environment, site, product, majorVersion, appVersion, status }
 * which we normalize to { installationId, environment, site, apps, version,
 * status } so downstream consumers stay decoupled from the CLI field names.
 *
 * Tolerates leading non-JSON noise (e.g. the Node-version warning the CLI
 * prints to stderr can leak onto stdout in some shells) by slicing from the
 * first "[".
 * @returns {Array<{installationId,environment,site,apps,version,status}>}
 */
export function parseInstallListJson(jsonStr) {
  const start = jsonStr.indexOf("[");
  if (start === -1) return [];
  const parsed = JSON.parse(jsonStr.slice(start));
  if (!Array.isArray(parsed)) return [];
  return parsed.map((r) => ({
    installationId: r.id ?? r.installationId ?? "",
    environment: r.environment ?? "",
    site: r.site ?? "",
    apps: r.product ?? r.apps ?? "",
    version: r.appVersion ?? r.version ?? "",
    status: r.status ?? "",
  }));
}

/**
 * Back-compat shim: previously parsed the box-drawing table. Now delegates to
 * the JSON parser. Retained so any external caller of parseInstallList keeps
 * working when handed `forge install list --json` output.
 * @returns {Array<{installationId,environment,site,apps,version,status}>}
 */
export function parseInstallList(output) {
  return parseInstallListJson(output);
}

/**
 * Run `forge install list --json` and return parsed rows.
 * Exits 3 if the forge CLI is not authenticated.
 */
export function getInstallations() {
  let output;
  try {
    output = runForge("install list --json");
  } catch (err) {
    const combined = `${err.stdout || ""}${err.stderr || ""}${err.message || ""}`;
    if (isAuthError(combined)) {
      process.stderr.write("forge CLI not authenticated. Run `forge login`.\n");
      process.exit(3);
    }
    process.stderr.write(`forge install list failed: ${combined.slice(0, 500)}\n`);
    process.exit(2);
  }
  return parseInstallListJson(output);
}

/**
 * From parsed install rows, find the staging-site / development-env install.
 * @returns {object|null} the matching row, or null if not installed there.
 */
export function findStagingInstall(rows) {
  const stagingRows = rows.filter((r) => r.site === STAGING_SITE);
  return stagingRows.find((r) => r.environment === FORGE_ENV) || stagingRows[0] || null;
}

/** Normalize an install row's status into a stable token. */
export function classifyStatus(row) {
  if (!row) return "not-installed";
  if (/up-to-date/i.test(row.status)) return "Up-to-date";
  return "outdated";
}

/** True if any install row targets a production environment. */
export function hasProductionInstall(rows) {
  return rows.some((r) => /production/i.test(r.environment));
}

/**
 * Resolve the agent webtrigger URL.
 * Order:
 *   1. WEBTRIGGER_URL env var (operator-provided override)
 *   2. `forge webtrigger list` for the agent-webtrigger module on staging
 * The list subcommand is fully flag-driven (non-interactive) but has NO --json
 * flag (confirmed: only -f/-s/-p/-e), so we scrape the first https URL out of
 * its box-drawing table. This table scrape is the documented gap recorded in
 * evidence/blockers/forge-json.json.
 * @returns {string|null}
 */
export function getWebtriggerUrl() {
  const fromEnv = process.env.WEBTRIGGER_URL;
  if (fromEnv) return fromEnv.trim();

  try {
    const out = runForge(
      `webtrigger list -f ${WEBTRIGGER_MODULE_KEY} ` +
        `-s ${STAGING_SITE} -p Jira -e ${FORGE_ENV}`,
    );
    for (const line of out.split("\n")) {
      if (!line.includes("│")) continue;
      const match = line.match(/https?:\/\/\S+/);
      if (match) return match[0].replace(/[│\s]+$/, "");
    }
  } catch {
    /* fall through — caller decides how to handle a missing URL */
  }
  return null;
}

export { STAGING_SITE, FORGE_ENV };
