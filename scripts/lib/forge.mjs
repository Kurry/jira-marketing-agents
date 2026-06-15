// scripts/lib/forge.mjs — shared Forge CLI wrapper for IaC scripts.
//
// Provides:
//   - parseInstallList(text)  : parse `forge install list` table → rows[]
//   - getInstallations()      : run `forge install list`, return parsed rows
//                               (exit 3 if forge CLI is not authenticated)
//   - findStagingInstall(rows): pick the development row for the staging site
//   - getWebtriggerUrl()      : resolve the agent webtrigger URL from
//                               WEBTRIGGER_URL env or `forge webtrigger`
//
// Read-only: never deploys, installs, or mutates. Mutation happens only through
// the deploy/install npm scripts and the addAnalysisComment Forge action.
//
// T-NIH-07 classification: native-wrapper. Native owner (matrix row
// "Agent runtime" / Forge): the native `forge install list` and
// `forge webtrigger list` CLI commands. This module wraps those native
// commands; it does not re-implement install/webtrigger discovery.
// EXPERIMENTAL / brittle dependency: parseInstallList and getWebtriggerUrl
// parse the CLI's box-drawing TABLE output (split on "│"), which is
// human-formatted and may change between Forge CLI releases. Prefer a
// structured/JSON output flag if/when the Forge CLI exposes one; until then
// this string-parsing is the only available surface and is treated as a thin,
// version-sensitive wrapper rather than a stable contract.

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
 * Parse the box-drawing table emitted by `forge install list`.
 * Columns: Installation ID | Environment | Site | Atlassian apps | App version | Status
 * @returns {Array<{installationId,environment,site,apps,version,status}>}
 */
export function parseInstallList(output) {
  const rows = [];
  for (const line of output.split("\n")) {
    if (!line.includes("│")) continue;
    const cells = line
      .split("│")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 6) continue;
    if (cells[0] === "Installation ID") continue; // header row
    const [installationId, environment, site, apps, version, status] = cells;
    rows.push({ installationId, environment, site, apps, version, status });
  }
  return rows;
}

/**
 * Run `forge install list` and return parsed rows.
 * Exits 3 if the forge CLI is not authenticated.
 */
export function getInstallations() {
  let output;
  try {
    output = runForge("install list");
  } catch (err) {
    const combined = `${err.stdout || ""}${err.stderr || ""}${err.message || ""}`;
    if (isAuthError(combined)) {
      process.stderr.write("forge CLI not authenticated. Run `forge login`.\n");
      process.exit(3);
    }
    process.stderr.write(`forge install list failed: ${combined.slice(0, 500)}\n`);
    process.exit(2);
  }
  return parseInstallList(output);
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
 * The list subcommand is fully flag-driven (non-interactive); it emits a
 * box-drawing table with an ID | Module Key | URL row.
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
