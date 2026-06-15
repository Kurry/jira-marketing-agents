#!/usr/bin/env node
// generated_by: scripts/verify/forge-install.mjs (T-R-P5)
//
// Verify the Forge app is installed and Up-to-date on the staging site.
// Read-only. Writes evidence/verify/forge-install.json.
//
// Exit codes: 0 pass | 2 not Up-to-date / not installed | 3 forge unauthenticated
//
// T-NIH-07 classification: native-wrapper. Native owner (matrix row
// "Agent runtime" / Forge): the native `forge install list` CLI command (via
// scripts/lib/forge.mjs). This script does not re-derive install state — it
// asserts the native status string equals "Up-to-date". NOTE: lib/forge.mjs
// parses the CLI's box-drawing TABLE output; this is a brittle dependency on
// human-formatted output and should switch to a structured/--json flag if the
// Forge CLI exposes one (tracked as a thin-wrapper hardening follow-up).

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { envelope, writeEvidence } from "../lib/evidence.mjs";
import { wantsHelp, STAGING_SITE } from "../lib/staging.mjs";
import {
  getInstallations,
  findStagingInstall,
  classifyStatus,
  hasProductionInstall,
} from "../lib/forge.mjs";

const SCRIPT = "scripts/verify/forge-install.mjs";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = resolve(REPO_ROOT, "evidence", "verify", "forge-install.json");

if (wantsHelp()) {
  process.stdout.write(
    `${SCRIPT}\n\nAsserts the Forge app shows Up-to-date on ${STAGING_SITE} (development env).\n` +
      `Exit 0 pass, 2 fail, 3 forge unauthenticated.\n`,
  );
  process.exit(0);
}

const rows = getInstallations(); // exits 3 if unauthenticated
const row = findStagingInstall(rows);
const status = classifyStatus(row);
const pass = status === "Up-to-date";
const exitCode = pass ? 0 : 2;

const summary = pass
  ? `Forge app Up-to-date on ${STAGING_SITE}`
  : `Forge app NOT Up-to-date on ${STAGING_SITE} (status: ${status})`;

const env = envelope({
  generatedBy: SCRIPT,
  exitCode,
  summary,
  data: {
    pass,
    install_status: status,
    site: STAGING_SITE,
    installation: row,
    deployed_to_production: hasProductionInstall(rows),
  },
});

writeEvidence(OUT, env);
process.stderr.write(`[${SCRIPT}] ${summary}\n`);
process.stdout.write(JSON.stringify(env, null, 2) + "\n");
process.exit(exitCode);
