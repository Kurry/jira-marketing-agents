#!/usr/bin/env node
/**
 * T-M6-02: Create AIGO dashboards via Jira REST API.
 * Idempotent — skips dashboards that already exist by name.
 * Usage:
 *   node scripts/provision-dashboards.cjs [--dry-run]
 *   npm run provision:dashboards
 *
 * Exit codes:
 *   0 — success (or dry-run)
 *   1 — fatal error
 *   2 — auth error
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { execSync } = require("node:child_process");
const { loadInstanceConfig } = require("./instance-config.cjs");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, config: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    }
  }
  return args;
}

function normalizeSiteHost(site) {
  return String(site || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
}

function dashboardUrl(site, dashboardId) {
  const host = normalizeSiteHost(site);
  return host ? `https://${host}/jira/dashboards/${dashboardId}` : "";
}

// Filter IDs provisioned by T-M6-01 (provision-filters.cjs)
// These are used as savedFilterId references in dashboard gadgets.
const FILTER_IDS = {
  intake: process.env.AIGO_FILTER_INTAKE || "10000",
  claimsReview: process.env.AIGO_FILTER_CLAIMS || "10001",
  launchReadiness: process.env.AIGO_FILTER_LAUNCH || "10002",
  readoutNeeded: process.env.AIGO_FILTER_READOUT || "10003",
  decisionNeeded: process.env.AIGO_FILTER_DECISION || "10004",
  blocked: process.env.AIGO_FILTER_BLOCKED || "10005",
  experimentRunning: process.env.AIGO_FILTER_EXPERIMENT || "10006",
};

// ---------------------------------------------------------------------------
// Dashboard definitions
// Each dashboard gets a name, description, and share settings.
// Gadgets are defined separately — Jira REST v3 supports adding gadgets
// after dashboard creation via POST /rest/api/3/dashboard/{id}/gadget.
// ---------------------------------------------------------------------------

const DASHBOARDS = [
  {
    name: "AIGO — Weekly Growth State",
    description:
      "Weekly growth ops snapshot: active issues by status, decision-needed queue, readout-needed, and recent completions.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color1",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.decisionNeeded,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color3",
        position: { column: 0, row: 1 },
        properties: {
          filterId: FILTER_IDS.readoutNeeded,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color2",
        position: { column: 1, row: 0 },
        properties: {
          filterId: FILTER_IDS.intake,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color5",
        position: { column: 1, row: 1 },
        properties: {
          filterId: FILTER_IDS.blocked,
          numofresults: "10",
        },
      },
    ],
  },
  {
    name: "AIGO — Claims Bottlenecks",
    description:
      "Health/clinical claims review queue: issues awaiting compliance review, risk distribution, and age-in-queue.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color6",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.claimsReview,
          numofresults: "20",
        },
      },
    ],
  },
  {
    name: "AIGO — Experiments",
    description:
      "Active experiments, decision-needed experiments, and recently completed tests.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color3",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.experimentRunning,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color4",
        position: { column: 1, row: 0 },
        properties: {
          filterId: FILTER_IDS.decisionNeeded,
          numofresults: "10",
        },
      },
    ],
  },
  {
    name: "AIGO — Employer Launches",
    description:
      "Employer launch pipeline: in launch prep, readiness scores, blockers, and upcoming go/no-go decisions.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color2",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.launchReadiness,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color5",
        position: { column: 1, row: 0 },
        properties: {
          filterId: FILTER_IDS.blocked,
          numofresults: "10",
        },
      },
    ],
  },
  {
    name: "AIGO — Signup Funnel Issues",
    description:
      "Signup funnel friction and bug queue: active issues by status, blocked funnel issues, and triage backlog.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color1",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.intake,
          numofresults: "15",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color6",
        position: { column: 1, row: 0 },
        properties: {
          filterId: FILTER_IDS.blocked,
          numofresults: "10",
        },
      },
    ],
  },
  {
    name: "AIGO — Research Insights",
    description:
      "Research briefs and positioning updates: synthesis backlog, decision-needed research, and recent Decision Memos.",
    editPermissions: [],
    sharePermissions: [{ type: "loggedin" }],
    gadgets: [
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color3",
        position: { column: 0, row: 0 },
        properties: {
          filterId: FILTER_IDS.readoutNeeded,
          numofresults: "10",
        },
      },
      {
        moduleKey: "com.atlassian.jira.gadgets:filter-results-gadget",
        color: "color4",
        position: { column: 1, row: 0 },
        properties: {
          filterId: FILTER_IDS.decisionNeeded,
          numofresults: "10",
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) return process.env.ATLASSIAN_TOKEN.trim();
  if (process.platform === "darwin") {
    try {
      return execSync(
        "security find-generic-password -l \"acli\" -w 2>/dev/null | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d['access_token'])\"",
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
    } catch {
      // fall through
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function jiraRequest({ method, path: reqPath, token, cloudId, body = null }) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (bodyStr) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(
      {
        hostname: "api.atlassian.com",
        port: 443,
        path: `/ex/jira/${cloudId}${reqPath}`,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => {
          let parsed;
          try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun;
  const repoRoot = path.resolve(__dirname, "..");
  let config;
  try {
    config = loadInstanceConfig(args.config || undefined);
  } catch (err) {
    console.error(`ERROR: Failed to load instance config: ${err.message}`);
    process.exit(1);
  }

  const cloudId = config.cloudId;
  const projectKey = config.projectKey || "AIGO";
  const site = config.site;

  console.log("=== AIGO Dashboard Provisioner (T-M6-02) ===");
  console.log(`Dashboards to create: ${DASHBOARDS.length}`);
  console.log(`Site: ${site || "(not configured)"}`);
  console.log(`Project: ${projectKey}`);
  console.log(`Dry run: ${dryRun}`);

  if (dryRun) {
    console.log("\nDRY RUN — dashboards to create:");
    for (const d of DASHBOARDS) {
      console.log(`  - ${d.name}`);
      console.log(`    ${d.description}`);
      console.log(`    Gadgets: ${d.gadgets.length}`);
    }
    process.exit(0);
  }

  const token = resolveToken();
  if (!token) {
    console.error("ERROR: No Atlassian token. Set ATLASSIAN_TOKEN or authenticate via acli.");
    process.exit(2);
  }

  if (!cloudId) {
    console.error("ERROR: Missing cloudId. Set AIGO_CLOUD_ID or provide an instance config with cloudId.");
    process.exit(1);
  }

  // List existing dashboards (my dashboards — idempotency check)
  console.log("\nFetching existing dashboards...");
  const listResp = await jiraRequest({ method: "GET", path: "/rest/api/3/dashboard?maxResults=100", token, cloudId });
  if (listResp.status === 401 || listResp.status === 403) {
    console.error(`ERROR: Auth failed (HTTP ${listResp.status}). Check ATLASSIAN_TOKEN or acli credentials.`);
    process.exit(2);
  }

  const existingNames = new Set(
    (listResp.body?.dashboards || []).map((d) => d.name).filter(Boolean)
  );
  console.log(`  Found ${existingNames.size} existing dashboard(s).`);

  const results = [];

  for (const dashboard of DASHBOARDS) {
    if (existingNames.has(dashboard.name)) {
      console.log(`  SKIPPED (exists): ${dashboard.name}`);
      results.push({ name: dashboard.name, status: "skipped" });
      continue;
    }

    // Create the dashboard
    const createBody = {
      name: dashboard.name,
      description: dashboard.description,
      sharePermissions: dashboard.sharePermissions,
      editPermissions: dashboard.editPermissions,
    };

    const createResp = await jiraRequest({
      method: "POST",
      path: "/rest/api/3/dashboard",
      token,
      cloudId,
      body: createBody,
    });

    if (createResp.status !== 200 && createResp.status !== 201) {
      console.error(`  ERROR: Failed to create "${dashboard.name}" (HTTP ${createResp.status})`);
      console.error(`    ${JSON.stringify(createResp.body).slice(0, 200)}`);
      results.push({ name: dashboard.name, status: "error", httpStatus: createResp.status });
      continue;
    }

    const dashboardId = createResp.body?.id;
    console.log(`  CREATED: ${dashboard.name} (ID: ${dashboardId})`);

    // Add gadgets
    const gadgetResults = [];
    for (const gadget of dashboard.gadgets) {
      const gadgetResp = await jiraRequest({
        method: "POST",
        path: `/rest/api/3/dashboard/${dashboardId}/gadget`,
        token,
        cloudId,
        body: {
          moduleKey: gadget.moduleKey,
          color: gadget.color,
          position: gadget.position,
          properties: gadget.properties,
        },
      });

      if (gadgetResp.status === 200 || gadgetResp.status === 201) {
        gadgetResults.push({ moduleKey: gadget.moduleKey, status: "created" });
      } else {
        // Gadget API can return 404 on some instances — non-fatal
        gadgetResults.push({
          moduleKey: gadget.moduleKey,
          status: `http-${gadgetResp.status}`,
          note: "Gadget may need manual configuration in the Jira UI",
        });
      }
    }

    results.push({
      name: dashboard.name,
      id: dashboardId,
      url: dashboardUrl(site, dashboardId),
      status: "created",
      gadgets: gadgetResults,
    });
  }

  // Write evidence
  const evidenceDir = path.join(repoRoot, "evidence", "jira-config");
  fs.mkdirSync(evidenceDir, { recursive: true });

  const evidencePath = path.join(evidenceDir, "dashboards.md");
  const created = results.filter((r) => r.status === "created");
  const skipped = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");

  const md = [
    "# AIGO Dashboards",
    "",
    `Provisioned: ${new Date().toISOString().slice(0, 10)} (T-M6-02)`,
    `Site: ${site || "(not configured)"}`,
    `Project: ${projectKey}`,
    `Script: \`scripts/provision-dashboards.cjs\` (idempotent — re-run is safe)`,
    "",
    "## Created Dashboards",
    "",
    "| Dashboard Name | Jira ID | URL | Gadgets |",
    "|---|---|---|---|",
    ...results.map((r) =>
      r.id
        ? `| ${r.name} | ${r.id} | ${r.url ? `[Open](${r.url})` : "—"} | ${(r.gadgets || []).length} |`
        : `| ${r.name} | — | — | ${r.status} |`
    ),
    "",
    "## Dashboard Purposes",
    "",
    ...DASHBOARDS.map((d) => `- **${d.name}** — ${d.description}`),
    "",
    "## Notes",
    "",
    "- All dashboards are shared with logged-in users.",
    "- Gadgets use the filter IDs from T-M6-01 (provision-filters.cjs).",
    "- If gadgets show HTTP errors, add them manually: Dashboard → Edit → Add gadget → 'Filter Results'.",
    "- To re-provision after site wipe: re-run `node scripts/provision-dashboards.cjs`.",
    "",
    `## Raw Results`,
    "",
    "```json",
    JSON.stringify(results, null, 2),
    "```",
  ].join("\n");

  fs.writeFileSync(evidencePath, md, "utf8");
  console.log(`\nEvidence written: evidence/jira-config/dashboards.md`);

  // Summary
  console.log("\n=== Dashboard Provision Summary ===");
  console.log(`  Created: ${created.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Errors:  ${errors.length}`);

  if (errors.length > 0) {
    console.error("\nSome dashboards failed — check evidence/jira-config/dashboards.md for details.");
    process.exit(1);
  }

  console.log("\nDone.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
}

module.exports = { parseArgs, normalizeSiteHost, dashboardUrl };
