#!/usr/bin/env node
/**
 * T-M2-08: Extended AIGO project readiness check.
 *
 * Checks:
 *   1. Issue types — all 14 canonical types present in the project
 *   2. Seed count — at least minSeedCount issues labeled aigo-seed
 *   3. Seed type coverage — one seed per canonical issue type
 *   4. Status coverage — expected statuses observed or found via REST
 *   5. Custom fields — all 6 AIGO fields exist (REST, paginated)
 *   6. Rovo agents — manifest.yml declares exactly 19 agents
 *   7. Automation rules — rendered rule files exist (offline check)
 *
 * Set AIGO_READINESS_WARN_ONLY=1 to report without failing (exit 0).
 * Set ATLASSIAN_TOKEN or ensure acli is logged in for REST checks.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { spawnSync, execSync } = require("node:child_process");
const { loadInstanceConfig } = require("./instance-config.cjs");

const config = loadInstanceConfig();
const projectKey = config.projectKey;
const projectId = config.projectId;
const cloudId = config.cloudId;
const seedLabel = config.seedLabel;
const minSeedCount = config.minSeedCount;
const warnOnly = process.env.AIGO_READINESS_WARN_ONLY === "1";

const BASE_URL = `https://api.atlassian.com/ex/jira/${cloudId}`;

// Canonical 14 issue types (T-M2-01)
const CANONICAL_ISSUE_TYPES = [
  "AI Growth Request",
  "Creative Request",
  "Experiment",
  "Segmentation Request",
  "Personalization Journey",
  "Employer Launch",
  "Campaign",
  "Dashboard Request",
  "Signup Funnel Issue",
  "Research Brief",
  "Claims Review",
  "Decision Memo",
  "Positioning Update",
  "Bug / Tracking Issue",
];

// Provisioned AIGO workflow statuses (T-M2-05)
const EXPECTED_STATUS_NAMES = [
  "Intake",
  "Triage",
  "Spec Ready",
  "In Review",
  "Claims Review",
  "Experiment Running",
  "Decision Needed",
  "Launch Prep",
];

// Required custom fields (T-M2-04)
const REQUIRED_CUSTOM_FIELDS = [
  "Segment",
  "Primary Metric",
  "Claims Risk",
  "Experiment ID",
  "Workflow Area",
  "Priority Score",
];

const EXPECTED_AGENT_COUNT = 19;

const AGENT_KEYS = [
  "growth-triage-agent",
  "requirements-gap-agent",
  "epic-breakdown-agent",
  "duplicate-detector-agent",
  "sprint-risk-agent",
  "acceptance-criteria-agent",
  "qa-testcase-agent",
  "experiment-design-agent",
  "creative-claims-agent",
  "employer-launch-agent",
  "dashboard-spec-agent",
  "funnel-friction-agent",
  "weekly-readout-agent",
  "creative-generation-agent",
  "audience-builder-agent",
  "campaign-orchestration-agent",
  "landing-page-agent",
  "referral-loop-agent",
  "activation-agent",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runAcli(args) {
  const result = spawnSync("acli", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw new Error(`Failed to run acli: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(`acli ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
  return result.stdout;
}

function parseJson(label, raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${label} JSON: ${error.message}`);
  }
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function issueFieldName(issue, fieldName) {
  const value = issue.fields?.[fieldName] ?? issue[fieldName];
  if (value && typeof value === "object" && "name" in value) return value.name;
  return typeof value === "string" ? value : undefined;
}

function formatList(values) {
  return values.length ? values.join(", ") : "none";
}

function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) return process.env.ATLASSIAN_TOKEN.trim();
  if (process.platform === "darwin") {
    try {
      return execSync(
        `security find-generic-password -l "acli" -w | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
    } catch (_) {}
  }
  return null;
}

function jiraRest({ method, url, token }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : {});
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main (async so we can await REST calls)
// ---------------------------------------------------------------------------

async function main() {
  const failures = [];
  const warnings = [];
  const repoRoot = path.join(__dirname, "..");

  console.log(`\n=== AIGO Readiness Check — project ${projectKey} ===\n`);

  // -------------------------------------------------------------------------
  // CHECK 1: Issue types
  // -------------------------------------------------------------------------
  console.log("1. Issue types...");
  let project;
  try {
    project = parseJson("project", runAcli(["jira", "project", "view", "--key", projectKey, "--json"]));
  } catch (e) {
    failures.push(`Could not fetch project via acli: ${e.message}`);
    project = {};
  }

  const projectIssueTypes = new Set((project.issueTypes || []).map((t) => t.name));
  const missingIssueTypes = CANONICAL_ISSUE_TYPES.filter((t) => !projectIssueTypes.has(t));
  if (missingIssueTypes.length) {
    failures.push(`Missing canonical issue types (add via Project Settings → Issue Types): ${formatList(missingIssueTypes)}`);
  }
  console.log(`   Project: ${project.name || projectKey} (style=${project.style}, simplified=${project.simplified})`);
  console.log(`   Issue types present: ${formatList(sorted(projectIssueTypes))}`);
  console.log(`   Missing: ${missingIssueTypes.length ? formatList(missingIssueTypes) : "none"}`);

  // -------------------------------------------------------------------------
  // CHECK 2 + 3: Seed count and per-type coverage
  // -------------------------------------------------------------------------
  console.log("\n2. Seed issues...");
  let seedIssues = [];
  try {
    const raw = runAcli([
      "jira", "workitem", "search",
      "--jql", `project = ${projectKey} AND labels = ${seedLabel} ORDER BY key ASC`,
      "--fields", "key,summary,status,issuetype,labels",
      "--limit", "100",
      "--json",
    ]);
    const parsed = parseJson("seed issues", raw);
    seedIssues = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    failures.push(`Could not fetch seed issues via acli: ${e.message}`);
  }

  if (seedIssues.length < minSeedCount) {
    failures.push(`Expected ≥${minSeedCount} seed issues labeled "${seedLabel}"; found ${seedIssues.length}.`);
  }

  const observedStatuses = new Set();
  const observedSeedIssueTypes = new Set();
  for (const issue of seedIssues) {
    const s = issueFieldName(issue, "status");
    const t = issueFieldName(issue, "issuetype");
    if (s) observedStatuses.add(s);
    if (t) observedSeedIssueTypes.add(t);
  }

  console.log(`   Seed count: ${seedIssues.length} (min: ${minSeedCount})`);
  console.log(`   Seed issue types observed: ${formatList(sorted(observedSeedIssueTypes))}`);
  console.log(`   Seed statuses observed: ${formatList(sorted(observedStatuses))}`);

  // Per-type coverage (only meaningful after issue types are configured)
  if (missingIssueTypes.length === 0) {
    const missingCoverage = CANONICAL_ISSUE_TYPES.filter((t) => !observedSeedIssueTypes.has(t));
    if (missingCoverage.length) {
      failures.push(`Seed coverage gap — no seed for: ${formatList(missingCoverage)}`);
    } else {
      console.log(`   Seed coverage: all 14 canonical types have at least one seed ✓`);
    }
  } else {
    warnings.push("Skipping per-type seed coverage check — issue types not yet configured.");
  }

  if (observedSeedIssueTypes.size === 1 && observedSeedIssueTypes.has("Task") && missingIssueTypes.length) {
    warnings.push("All seeds are 'Task' — expected while custom issue types are pending operator setup.");
  }

  // -------------------------------------------------------------------------
  // CHECK 4: Status coverage via REST
  // -------------------------------------------------------------------------
  console.log("\n3. Workflow statuses...");
  const token = resolveToken();
  if (!token) {
    warnings.push("No OAuth token — skipping REST-based status/field checks. Set ATLASSIAN_TOKEN or use acli login.");
  } else {
    try {
      // Scan IDs 10000-10050 in chunks to find project-scoped status records
      const foundStatuses = [];
      const CHUNK = 50;
      for (let start = 10000; start <= 10050; start += CHUNK) {
        const end = Math.min(start + CHUNK - 1, 10050);
        const ids = Array.from({ length: end - start + 1 }, (_, i) => `id=${start + i}`).join("&");
        const chunk = await jiraRest({ method: "GET", url: `${BASE_URL}/rest/api/3/statuses?${ids}`, token });
        if (Array.isArray(chunk)) foundStatuses.push(...chunk);
      }
      const foundStatusNames = new Set(foundStatuses.map((s) => s.name));
      const missingStatuses = EXPECTED_STATUS_NAMES.filter((s) => !foundStatusNames.has(s));

      if (missingStatuses.length) {
        failures.push(`Missing workflow statuses in Jira: ${formatList(missingStatuses)}`);
      }
      console.log(`   Statuses found (REST scan): ${formatList(sorted(foundStatusNames))}`);
      console.log(`   Missing: ${missingStatuses.length ? formatList(missingStatuses) : "none"}`);
    } catch (e) {
      warnings.push(`Could not verify statuses via REST: ${e.message}`);
    }

    // -------------------------------------------------------------------------
    // CHECK 5: Custom fields
    // -------------------------------------------------------------------------
    console.log("\n4. Custom fields...");
    try {
      const allCustomFields = [];
      let startAt = 0;
      while (true) {
        const page = await jiraRest({
          method: "GET",
          url: `${BASE_URL}/rest/api/3/field/search?type=custom&maxResults=100&startAt=${startAt}`,
          token,
        });
        const vals = Array.isArray(page) ? page : (page.values || []);
        allCustomFields.push(...vals);
        if (page.isLast || vals.length < 100) break;
        startAt += 100;
      }
      const fieldNames = new Set(allCustomFields.map((f) => f.name));
      const missingFields = REQUIRED_CUSTOM_FIELDS.filter((f) => !fieldNames.has(f));

      if (missingFields.length) {
        failures.push(`Missing AIGO custom fields: ${formatList(missingFields)}`);
      }
      const presentFields = REQUIRED_CUSTOM_FIELDS.filter((f) => fieldNames.has(f));
      console.log(`   Present: ${formatList(presentFields)}`);
      console.log(`   Missing: ${missingFields.length ? formatList(missingFields) : "none"}`);
    } catch (e) {
      warnings.push(`Could not verify custom fields via REST: ${e.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // CHECK 6: Rovo agent count (local manifest.yml)
  // -------------------------------------------------------------------------
  console.log("\n5. Rovo agents (manifest.yml)...");
  const manifestPath = path.join(repoRoot, "manifest.yml");
  try {
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    const agentKeysFound = AGENT_KEYS.filter((key) => manifestContent.includes(`key: ${key}`));
    const missingAgentKeys = AGENT_KEYS.filter((key) => !manifestContent.includes(`key: ${key}`));

    if (agentKeysFound.length !== EXPECTED_AGENT_COUNT) {
      failures.push(
        `Expected ${EXPECTED_AGENT_COUNT} Rovo agent keys in manifest.yml; found ${agentKeysFound.length}. Missing: ${formatList(missingAgentKeys)}`
      );
    } else {
      console.log(`   manifest.yml declares all ${EXPECTED_AGENT_COUNT} Rovo agent keys ✓`);
    }
    console.log(`   Note: Jira UI confirmation (T-M1-04) still required for live visibility.`);
  } catch (e) {
    warnings.push(`Could not read manifest.yml: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // CHECK 7: Automation rule files
  // -------------------------------------------------------------------------
  console.log("\n6. Automation rules...");
  const rulesDir = path.join(repoRoot, "automation", "rules");
  const bundleFile = path.join(rulesDir, "aigo-automation-ruleset.json");
  if (fs.existsSync(bundleFile)) {
    try {
      const bundle = JSON.parse(fs.readFileSync(bundleFile, "utf8"));
      const ruleCount = Array.isArray(bundle) ? bundle.length : (bundle.rules || []).length;
      console.log(`   aigo-automation-ruleset.json exists with ${ruleCount} rules ✓`);
      // Check for unfilled placeholders
      const raw = fs.readFileSync(bundleFile, "utf8");
      // Only flag IaC-style ALL_CAPS placeholders — not Jira runtime tokens like {{issue.key}} or {{agentResponse}}
      const placeholders = (raw.match(/\{\{[A-Z_]+\}\}/g) || []);
      if (placeholders.length) {
        warnings.push(`Automation bundle has ${placeholders.length} unfilled IaC placeholder(s): ${[...new Set(placeholders)].join(", ")}`);
      }
    } catch (e) {
      warnings.push(`Could not parse automation bundle: ${e.message}`);
    }
  } else {
    warnings.push("automation/rules/aigo-automation-ruleset.json not found — run npm run provision:automation.");
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n---");

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ⚠  ${w}`);
  }

  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ✗  ${f}`);
    console.log();
    if (!warnOnly) {
      console.log("Set AIGO_READINESS_WARN_ONLY=1 to collect this report without failing.");
      process.exit(1);
    }
  } else {
    console.log("\n✓ All automated readiness checks passed.");
  }

  console.log("\nManual checks still required:");
  console.log("  - T-M1-04: Confirm all 19 Rovo agents appear in Apps → Rovo → Agents");
  console.log("  - T-M2-03b: Add 14 canonical issue types via AIGO Project Settings → Issue Types");
  console.log("  - T-M3-02: Import automation rules (disabled) via Project settings → Automation → Import");
  console.log("  - T-M3-03: Enable each rule, trigger on seed issue, capture audit log");

  console.log("\nReadiness check complete.");
}

main().catch((e) => {
  console.error("Readiness check fatal error:", e.message);
  process.exit(1);
});
