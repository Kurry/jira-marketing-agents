#!/usr/bin/env node
"use strict";

// scripts/fix-automation-triggers.cjs
// Updates trigger formats for two AIGO automation rules that were imported with
// placeholder "issue:created" triggers instead of their intended triggers:
//
//   10022498 – AIGO Creative Claims Review  → issue transitioned → Ready
//   10022499 – AIGO Weekly Growth Readout   → scheduled CRON Mon 8AM ET
//
// Historical staging helper. The script tries multiple trigger format
// candidates (most-likely-first) and falls back gracefully if the internal API
// rejects all of them, printing actionable UI instructions. Live use requires
// explicit experimental opt-in because the endpoint is private/internal and is
// not part of the supported portability path.
//
// Usage:
//   node scripts/fix-automation-triggers.cjs --dry-run
//   AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1 ATLASSIAN_TOKEN=<pat> node scripts/fix-automation-triggers.cjs
//
// Environment:
//   AIGO_EXPERIMENTAL_AUTOMATION_IMPORT — must be 1 for live private API calls
//   ATLASSIAN_TOKEN   — Atlassian Personal Access Token (required unless --dry-run)
//   ATLASSIAN_USER    — email address for Basic-auth (optional; PAT Bearer is preferred)
//
// Exit codes:
//   0 — all rules updated (or dry-run passed)
//   1 — fatal / auth failure
//   2 — API rejected all candidates; manual UI update required (see printed instructions)

const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLOUD_ID = "76683cc1-6501-400f-8b59-01eaad4418d2";
const SITE = "myhealthcaresite.atlassian.net";
const API_BASE = `https://${SITE}/gateway/api/automation/internal-api/jira/${CLOUD_ID}/pro/rest/GLOBAL`;

const RULES = [
  {
    id: 10022498,
    name: "AIGO – Creative Claims Review",
    intendedTrigger: "issue transitioned → Ready",
    triggerCandidates: [
      // candidate-1: flat value matching created-trigger shape (most likely)
      {
        _label: "candidate-1-flat-eventkey-string-status",
        id: "__NEW__TRIGGER",
        type: "jira.issue.event.trigger:transitioned",
        component: "TRIGGER",
        value: {
          eventKey: "jira:issue_transitioned",
          issueEvent: "issue_generic",
          toStatus: "Ready",
        },
        children: [],
        conditions: [],
      },
      // candidate-2: toStatus as object with id field
      {
        _label: "candidate-2-toStatusId-object",
        id: "__NEW__TRIGGER",
        type: "jira.issue.event.trigger:transitioned",
        component: "TRIGGER",
        value: {
          eventKey: "jira:issue_transitioned",
          issueEvent: "issue_generic",
          toStatus: { id: "Ready" },
        },
        children: [],
        conditions: [],
      },
      // candidate-3: empty value (rely on JQL condition for scoping)
      {
        _label: "candidate-3-empty-value-no-filter",
        id: "__NEW__TRIGGER",
        type: "jira.issue.event.trigger:transitioned",
        component: "TRIGGER",
        value: {},
        children: [],
        conditions: [],
      },
      // candidate-4: toStatus as array of status objects
      {
        _label: "candidate-4-array-with-status-objects",
        id: "__NEW__TRIGGER",
        type: "jira.issue.event.trigger:transitioned",
        component: "TRIGGER",
        value: { toStatus: [{ name: "Ready" }] },
        children: [],
        conditions: [],
      },
      // candidate-5: transitionName / toStatusName keys
      {
        _label: "candidate-5-transitionName-and-toStatusName",
        id: "__NEW__TRIGGER",
        type: "jira.issue.event.trigger:transitioned",
        component: "TRIGGER",
        value: {
          eventKey: "jira:issue_transitioned",
          transitionName: "Ready",
          toStatusName: "Ready",
        },
        children: [],
        conditions: [],
      },
    ],
    // JQL condition to add alongside the trigger
    jqlConditionCandidates: [
      {
        _label: "jql-candidate-1-issue-filter-condition",
        component: "CONDITION",
        type: "jira.issue.filter.condition",
        value: { jql: 'project = AIGO AND issuetype = "Creative Request"' },
      },
      {
        _label: "jql-candidate-2-filter-condition",
        component: "CONDITION",
        type: "jira.filter.condition",
        value: { jql: 'project = AIGO AND issuetype = "Creative Request"' },
      },
      {
        _label: "jql-candidate-3-jql-condition-with-query-key",
        component: "CONDITION",
        type: "jira.jql.condition",
        value: { query: 'project = AIGO AND issuetype = "Creative Request"' },
      },
    ],
    description: [
      "Trigger: Issue transitioned to 'Ready' (issuetype = Creative Request, project = AIGO).",
      "Action: Invoke Rovo agent 'Creative Claims Reviewer' via jira.rovo.agent.action.",
      "",
      "Operator setup required:",
      "1. Settings → Automation → Connect Rovo (one-time admin step).",
      "2. Edit this rule and replace the placeholder comment action with a Rovo action targeting 'Creative Claims Reviewer'.",
      "3. Add JQL condition: project = AIGO AND issuetype = \"Creative Request\"",
      "4. Enable the rule only after Rovo is connected and the action is configured.",
      "",
      "Safety: This rule is DISABLED. AI may only add analysis comments (addAnalysisComment). It may NOT approve healthcare claims.",
    ].join("\n"),
    uiInstructions: [
      "Manual UI fix required for 10022498 (Creative Claims Review):",
      "  1. Go to https://myhealthcaresite.atlassian.net/jira/automation",
      "  2. Open 'AIGO – Creative Claims Review'",
      "  3. Click the trigger (currently 'Issue created') → change to 'Work item transitioned'",
      "  4. Set 'To status' = Ready",
      "  5. Add condition: JQL — project = AIGO AND issuetype = \"Creative Request\"",
      "  6. Save (leave DISABLED until Rovo is connected)",
    ].join("\n"),
  },
  {
    id: 10022499,
    name: "AIGO – Weekly Growth Readout",
    intendedTrigger: "Scheduled CRON Mon 8AM ET (America/New_York)",
    triggerCandidates: [
      // candidate-1: hoisted flat cron (most likely — avoids the 500 from nested schedule)
      {
        _label: "candidate-1-hoisted-flat-cron",
        id: "__NEW__TRIGGER",
        type: "jira.scheduled.trigger",
        component: "TRIGGER",
        value: {
          scheduleType: "CRON",
          cronExpression: "0 0 8 ? * MON",
          timezone: "America/New_York",
        },
        children: [],
        conditions: [],
      },
      // candidate-2: type/expression/timezone flat
      {
        _label: "candidate-2-type-expression-timezone-flat",
        id: "__NEW__TRIGGER",
        type: "jira.scheduled.trigger",
        component: "TRIGGER",
        value: {
          type: "CRON",
          expression: "0 0 8 ? * MON",
          timezone: "America/New_York",
        },
        children: [],
        conditions: [],
      },
      // candidate-3: nested schedule without runFromJql
      {
        _label: "candidate-3-nested-schedule-no-runFromJql",
        id: "__NEW__TRIGGER",
        type: "jira.scheduled.trigger",
        component: "TRIGGER",
        value: {
          schedule: {
            type: "CRON",
            expression: "0 0 8 ? * MON",
            timezone: "America/New_York",
          },
        },
        children: [],
        conditions: [],
      },
      // candidate-4: nested schedule with cron/tz alternate keys
      {
        _label: "candidate-4-nested-schedule-cron-tz-keys",
        id: "__NEW__TRIGGER",
        type: "jira.scheduled.trigger",
        component: "TRIGGER",
        value: {
          schedule: {
            type: "CRON",
            cron: "0 0 8 ? * MON",
            tz: "America/New_York",
          },
        },
        children: [],
        conditions: [],
      },
      // candidate-5: interval/week-based (no CRON)
      {
        _label: "candidate-5-week-interval",
        id: "__NEW__TRIGGER",
        type: "jira.scheduled.trigger",
        component: "TRIGGER",
        value: {
          schedule: {
            type: "WEEK",
            dayOfWeek: "MON",
            time: "08:00",
            timezone: "America/New_York",
          },
        },
        children: [],
        conditions: [],
      },
    ],
    jqlConditionCandidates: [], // scheduled rules scope via JQL in the rule body, not trigger conditions
    description: [
      "Trigger: Scheduled — every Monday at 08:00 America/New_York (CRON: 0 0 8 ? * MON).",
      "Action: Invoke Rovo agent 'Weekly Growth Readout' via jira.rovo.agent.action.",
      "JQL scope: project = AIGO (all open issues for the weekly summary).",
      "",
      "Operator setup required:",
      "1. Settings → Automation → Connect Rovo (one-time admin step).",
      "2. Edit this rule and replace the placeholder comment action with a Rovo action targeting 'Weekly Growth Readout'.",
      "3. Enable only after Rovo is connected and the action is configured.",
      "",
      "Safety: This rule is DISABLED. AI may only post analysis summaries. It may NOT alter audiences, send campaigns, or close issues.",
    ].join("\n"),
    uiInstructions: [
      "Manual UI fix required for 10022499 (Weekly Growth Readout):",
      "  1. Go to https://myhealthcaresite.atlassian.net/jira/automation",
      "  2. Open 'AIGO – Weekly Growth Readout'",
      "  3. Click the trigger (currently 'Issue created') → change to 'Scheduled'",
      "  4. Set schedule: CRON  →  0 0 8 ? * MON  (timezone: America/New_York)",
      "  5. Save (leave DISABLED until Rovo is connected)",
    ].join("\n"),
  },
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, experimentalInternalApi: false };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--experimental-internal-api") args.experimentalInternalApi = true;
  }
  if (process.env.AIGO_EXPERIMENTAL_AUTOMATION_IMPORT === "1") {
    args.experimentalInternalApi = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Auth resolution
// ---------------------------------------------------------------------------

function resolveToken() {
  if (process.env.ATLASSIAN_TOKEN) {
    return { type: "Bearer", token: process.env.ATLASSIAN_TOKEN.trim() };
  }

  // Try macOS keychain (same approach as provision-automation.cjs)
  if (process.platform === "darwin") {
    try {
      const raw = execSync(
        "security find-generic-password -l \"acli\" -w 2>&1 | sed 's/^go-keyring-base64://' | base64 -d | gunzip | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d['access_token'])\"",
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (raw) return { type: "Bearer", token: raw };
    } catch {
      // fall through
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function apiRequest({ method, url, auth, body = null }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : null;

    const headers = {
      Accept: "application/json",
    };

    if (auth.type === "Bearer") {
      headers["Authorization"] = `Bearer ${auth.token}`;
    } else if (auth.type === "Basic") {
      const cred = Buffer.from(`${auth.user}:${auth.token}`).toString("base64");
      headers["Authorization"] = `Basic ${cred}`;
    }

    if (bodyStr) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + (parsed.search || ""),
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          let body;
          try {
            body = data ? JSON.parse(data) : null;
          } catch {
            body = data;
          }
          resolve({ status: res.statusCode, body });
        });
      }
    );

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Fetch current rule from Jira
// ---------------------------------------------------------------------------

async function fetchRule(id, auth) {
  const url = `${API_BASE}/rule/${id}`;
  const res = await apiRequest({ method: "GET", url, auth });
  if (res.status !== 200) {
    throw new Error(`GET rule/${id} → HTTP ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ---------------------------------------------------------------------------
// Build an updated rule payload replacing the trigger component
// ---------------------------------------------------------------------------

function buildUpdatedRule(existingRule, newTrigger, description) {
  // Deep clone to avoid mutating the fetched object
  const updated = JSON.parse(JSON.stringify(existingRule));

  // Update description
  if (description) {
    updated.description = description;
  }

  // Replace the trigger component in the rule's trigger list
  // Jira automation rules have a `trigger` field (object) and/or a `components` array.
  // The internal API typically uses a top-level `trigger` object.
  if (updated.trigger) {
    // Replace the existing trigger with the new candidate (preserve the real id)
    const existingId = updated.trigger.id;
    updated.trigger = {
      ...newTrigger,
      id: existingId !== "__NEW__TRIGGER" ? existingId : newTrigger.id,
    };
  } else if (Array.isArray(updated.components)) {
    // Some API shapes store trigger inside components array
    const trigIdx = updated.components.findIndex(
      (c) => c.component === "TRIGGER" || (c.type && c.type.includes("trigger"))
    );
    if (trigIdx >= 0) {
      const existingId = updated.components[trigIdx].id;
      updated.components[trigIdx] = {
        ...newTrigger,
        id: existingId !== "__NEW__TRIGGER" ? existingId : newTrigger.id,
      };
    } else {
      // No existing trigger found — prepend
      updated.components.unshift(newTrigger);
    }
  } else {
    // Fallback: set trigger field directly
    updated.trigger = newTrigger;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Try to PUT the rule with a given trigger candidate
// ---------------------------------------------------------------------------

async function tryUpdateRule(ruleId, existingRule, triggerCandidate, description, auth) {
  const payload = buildUpdatedRule(existingRule, triggerCandidate, description);
  const url = `${API_BASE}/rule/${ruleId}`;
  const res = await apiRequest({ method: "PUT", url, auth, body: payload });
  return res;
}

// ---------------------------------------------------------------------------
// Try JQL condition candidates
// ---------------------------------------------------------------------------

async function tryAddJqlCondition(ruleId, currentRule, jqlCandidate, auth) {
  if (!jqlCandidate) return null;

  const payload = JSON.parse(JSON.stringify(currentRule));

  // Add the condition to components or conditions array
  const condObj = {
    id: "__NEW__CONDITION",
    component: jqlCandidate.component,
    type: jqlCandidate.type,
    value: jqlCandidate.value,
    children: [],
    conditions: [],
  };

  if (Array.isArray(payload.components)) {
    payload.components.push(condObj);
  } else if (Array.isArray(payload.conditions)) {
    payload.conditions.push(condObj);
  } else {
    // Add as a top-level conditions array
    payload.conditions = [condObj];
  }

  const url = `${API_BASE}/rule/${ruleId}`;
  const res = await apiRequest({ method: "PUT", url, auth, body: payload });
  return res;
}

// ---------------------------------------------------------------------------
// Process a single rule
// ---------------------------------------------------------------------------

async function processRule(rule, auth, dryRun) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`Rule: ${rule.name} (ID: ${rule.id})`);
  console.log(`Intended trigger: ${rule.intendedTrigger}`);
  console.log(`${"─".repeat(70)}`);

  if (dryRun) {
    console.log("[DRY-RUN] Would attempt the following trigger candidates:");
    for (const c of rule.triggerCandidates) {
      console.log(`  - ${c._label}: type=${c.type}, value=${JSON.stringify(c.value)}`);
    }
    if (rule.jqlConditionCandidates.length > 0) {
      console.log("[DRY-RUN] Would attempt JQL condition candidates:");
      for (const c of rule.jqlConditionCandidates) {
        console.log(`  - ${c._label}`);
      }
    }
    console.log("[DRY-RUN] Description update:", rule.description.slice(0, 80) + "...");
    return { id: rule.id, name: rule.name, result: "dry-run", candidateTried: null };
  }

  // Fetch current rule
  let existingRule;
  try {
    existingRule = await fetchRule(rule.id, auth);
    console.log(`Fetched rule: state=${existingRule.state}, trigger=${JSON.stringify(existingRule.trigger?.type ?? existingRule.trigger ?? "(none)")}`);
  } catch (err) {
    console.error(`ERROR fetching rule ${rule.id}: ${err.message}`);
    return { id: rule.id, name: rule.name, result: "fetch-error", error: err.message };
  }

  // Try each trigger candidate
  let successCandidate = null;
  let lastFailStatus = null;
  let lastFailBody = null;

  for (const candidate of rule.triggerCandidates) {
    console.log(`\nTrying ${candidate._label}...`);
    let res;
    try {
      res = await tryUpdateRule(rule.id, existingRule, candidate, rule.description, auth);
    } catch (err) {
      console.log(`  Network error: ${err.message}`);
      continue;
    }

    console.log(`  HTTP ${res.status}`);

    if (res.status >= 200 && res.status < 300) {
      console.log(`  SUCCESS with ${candidate._label}`);
      successCandidate = candidate._label;

      // Re-fetch the updated rule for JQL condition attempts
      try {
        existingRule = await fetchRule(rule.id, auth);
      } catch {
        // Not fatal — we already succeeded on trigger
      }
      break;
    } else {
      lastFailStatus = res.status;
      lastFailBody = res.body;
      console.log(`  Failed: ${JSON.stringify(res.body)?.slice(0, 200)}`);
    }
  }

  if (!successCandidate) {
    console.log(`\nAll trigger candidates failed for rule ${rule.id}.`);
    console.log(`Last error: HTTP ${lastFailStatus} — ${JSON.stringify(lastFailBody)?.slice(0, 400)}`);
    console.log("\n" + rule.uiInstructions);
    return {
      id: rule.id,
      name: rule.name,
      result: "requires-ui-update",
      lastFailStatus,
      uiInstructions: rule.uiInstructions,
    };
  }

  // Optionally try JQL condition candidates (best-effort, non-fatal)
  if (rule.jqlConditionCandidates.length > 0) {
    console.log("\nAttempting to add JQL condition...");
    let jqlSuccess = false;
    for (const jqlCandidate of rule.jqlConditionCandidates) {
      console.log(`  Trying ${jqlCandidate._label}...`);
      let res;
      try {
        res = await tryAddJqlCondition(rule.id, existingRule, jqlCandidate, auth);
      } catch (err) {
        console.log(`  Network error: ${err.message}`);
        continue;
      }

      console.log(`  HTTP ${res.status}`);
      if (res.status >= 200 && res.status < 300) {
        console.log(`  JQL condition added with ${jqlCandidate._label}`);
        jqlSuccess = true;
        break;
      } else {
        console.log(`  Failed: ${JSON.stringify(res.body)?.slice(0, 200)}`);
      }
    }

    if (!jqlSuccess) {
      console.log("\nAll JQL condition candidates failed (non-fatal).");
      console.log("Add JQL condition manually via UI:");
      if (rule.name.includes("Creative Claims")) {
        console.log('  Condition: project = AIGO AND issuetype = "Creative Request"');
      }
    }
  }

  return {
    id: rule.id,
    name: rule.name,
    result: "success",
    candidateTried: successCandidate,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("=".repeat(70));
  console.log("fix-automation-triggers.cjs");
  console.log(`Site:    ${SITE}`);
  console.log(`CloudID: ${CLOUD_ID}`);
  console.log(`Mode:    ${args.dryRun ? "DRY-RUN (no mutations)" : "LIVE"}`);
  console.log("=".repeat(70));

  if (!args.dryRun && !args.experimentalInternalApi) {
    console.error(
      "\nERROR: Live trigger fixes use a private/internal Jira Automation API.\n" +
      "Use the native Jira Automation UI for the supported path, or opt in explicitly:\n" +
      "  AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1 ATLASSIAN_TOKEN=<token> node scripts/fix-automation-triggers.cjs\n"
    );
    process.exit(2);
  }

  // Resolve auth (skip in dry-run)
  let auth = null;
  if (!args.dryRun) {
    auth = resolveToken();
    if (!auth) {
      console.error(
        "\nERROR: No auth token found.\n" +
        "Set ATLASSIAN_TOKEN=<personal-access-token> in your environment.\n" +
        "Example:\n" +
        "  ATLASSIAN_TOKEN=<token> node scripts/fix-automation-triggers.cjs\n" +
        "\nAlternatively use --dry-run to validate without making API calls."
      );
      process.exit(1);
    }
    // Optionally support Basic auth via ATLASSIAN_USER
    if (process.env.ATLASSIAN_USER) {
      auth = { type: "Basic", user: process.env.ATLASSIAN_USER, token: auth.token };
      console.log(`Auth:    Basic (${process.env.ATLASSIAN_USER})`);
    } else {
      console.log("Auth:    Bearer (ATLASSIAN_TOKEN)");
    }
  }

  const results = [];
  for (const rule of RULES) {
    const result = await processRule(rule, auth, args.dryRun);
    results.push(result);
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("SUMMARY");
  console.log("=".repeat(70));

  let requiresUi = false;
  for (const r of results) {
    const status =
      r.result === "success"
        ? "SUCCESS"
        : r.result === "dry-run"
        ? "DRY-RUN"
        : r.result === "requires-ui-update"
        ? "REQUIRES UI UPDATE"
        : `ERROR (${r.result})`;

    console.log(`  ${r.name} (${r.id}): ${status}`);
    if (r.result === "success") {
      console.log(`    Trigger candidate: ${r.candidateTried}`);
    }
    if (r.result === "requires-ui-update") {
      requiresUi = true;
    }
  }

  if (requiresUi) {
    console.log(
      "\nACTION REQUIRED: One or more rules need their trigger updated via the Jira UI.\n" +
      "See instructions printed above for each rule.\n" +
      "Reference: https://myhealthcaresite.atlassian.net/jira/automation"
    );
  }

  // Write evidence file
  if (!args.dryRun) {
    const repoRoot = path.resolve(__dirname, "..");
    const evidenceDir = path.join(repoRoot, "evidence", "automation");
    fs.mkdirSync(evidenceDir, { recursive: true });
    const evidencePath = path.join(evidenceDir, "fix-triggers-output.json");
    const evidenceData = {
      date: new Date().toISOString(),
      site: SITE,
      cloudId: CLOUD_ID,
      dryRun: args.dryRun,
      results,
    };
    fs.writeFileSync(evidencePath, JSON.stringify(evidenceData, null, 2), "utf8");
    console.log(`\nEvidence written: ${path.relative(repoRoot, evidencePath)}`);
  }

  // Exit codes
  const allOk = results.every((r) => r.result === "success" || r.result === "dry-run");
  const anyUi = results.some((r) => r.result === "requires-ui-update");

  if (anyUi) process.exit(2);
  if (!allOk) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
