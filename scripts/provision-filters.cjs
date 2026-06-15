#!/usr/bin/env node
/**
 * T-M6-01: Create AIGO JQL filters/queues via Jira REST API.
 * Idempotent — skips filters that already exist by name.
 * Usage: node scripts/provision-filters.cjs
 */

"use strict";

const https = require("https");
const { execSync } = require("child_process");
const { loadInstanceConfig } = require("./instance-config.cjs");

function parseArgs(argv) {
  const args = { config: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--config" && argv[i + 1]) {
      args.config = argv[i + 1];
      i++;
    }
  }
  return args;
}

function buildFilters(projectKey) {
  return [
    {
      name: "AIGO — Intake",
      description: "All AIGO issues in Intake status awaiting triage.",
      jql: `project = ${projectKey} AND status = "Intake" ORDER BY created DESC`,
      favourite: true,
    },
    {
      name: "AIGO — Claims Review",
      description: "AIGO issues flagged for health/clinical claims review.",
      jql: `project = ${projectKey} AND status = "Claims Review" ORDER BY priority DESC, created DESC`,
      favourite: true,
    },
    {
      name: "AIGO — Launch Readiness",
      description: "AIGO employer launch issues in Launch Prep status.",
      jql: `project = ${projectKey} AND status = "Launch Prep" ORDER BY created DESC`,
      favourite: true,
    },
    {
      name: "AIGO — Readout Needed",
      description: "AIGO issues labeled readout-needed for weekly growth readout.",
      jql: `project = ${projectKey} AND labels = "readout-needed" ORDER BY updated DESC`,
      favourite: true,
    },
    {
      name: "AIGO — Decision Needed",
      description: "AIGO issues stalled in Decision Needed status.",
      jql: `project = ${projectKey} AND status = "Decision Needed" ORDER BY updated ASC`,
      favourite: true,
    },
    {
      name: "AIGO — Blocked",
      description: "AIGO issues labeled blocked or with no activity in 7 days while in progress.",
      jql: `project = ${projectKey} AND (labels = "blocked" OR (status in ("Triage", "Spec Ready", "In Review") AND updated <= "-7d")) ORDER BY updated ASC`,
      favourite: true,
    },
    {
      name: "AIGO — Experiment Running",
      description: "AIGO experiments currently live in the Experiment Running status.",
      jql: `project = ${projectKey} AND status = "Experiment Running" ORDER BY created DESC`,
      favourite: true,
    },
  ];
}

function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) return process.env.ATLASSIAN_TOKEN.trim();
  if (process.platform === "darwin") {
    try {
      const raw = execSync(
        `security find-generic-password -l "acli" -w | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (raw) return raw;
    } catch (_) {}
  }
  return null;
}

function jiraCall({ method, url, body, token }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let config;
  try {
    config = loadInstanceConfig(args.config || undefined);
  } catch (err) {
    console.error(`ERROR: Failed to load instance config: ${err.message}`);
    process.exit(1);
  }

  const cloudId = config.cloudId;
  if (!cloudId) {
    console.error("ERROR: Missing cloudId. Set AIGO_CLOUD_ID or provide an instance config with cloudId.");
    process.exit(1);
  }

  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}`;
  const filters = buildFilters(config.projectKey || "AIGO");

  const token = resolveToken();
  if (!token) {
    console.error("No token found. Set ATLASSIAN_TOKEN or ensure acli is logged in.");
    process.exit(1);
  }

  // Get existing filters owned by me (search by name not available, so list and match)
  let existingFilters = [];
  try {
    const resp = await jiraCall({ method: "GET", url: `${baseUrl}/rest/api/3/filter/my?expand=jql`, token });
    existingFilters = Array.isArray(resp) ? resp : [];
  } catch (e) {
    console.warn("Could not list existing filters:", e.message);
  }
  const existingByName = new Map(existingFilters.map((f) => [f.name, f]));

  const results = [];

  for (const filter of filters) {
    if (existingByName.has(filter.name)) {
      const existing = existingByName.get(filter.name);
      console.log(`  EXISTS  "${filter.name}" (id: ${existing.id})`);
      results.push({ name: filter.name, action: "EXISTS", id: existing.id, jql: existing.jql });
    } else {
      try {
        const created = await jiraCall({
          method: "POST",
          url: `${baseUrl}/rest/api/3/filter`,
          token,
          body: {
            name: filter.name,
            description: filter.description,
            jql: filter.jql,
            favourite: filter.favourite,
          },
        });
        console.log(`  CREATED "${filter.name}" (id: ${created.id})`);
        results.push({ name: filter.name, action: "CREATED", id: created.id, jql: filter.jql });
      } catch (e) {
        console.error(`  ERROR   "${filter.name}": ${e.message}`);
        results.push({ name: filter.name, action: "ERROR", id: null, error: e.message, jql: filter.jql });
      }
    }
  }

  console.log("\nSummary:");
  console.log(JSON.stringify(results, null, 2));
  return results;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { parseArgs, buildFilters };
