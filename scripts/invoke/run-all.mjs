#!/usr/bin/env node
// generated_by: scripts/invoke/run-all.mjs (T-R-P5)
//
// NIH label (atlassian-native-tools.md T-NIH-07): TWIN-SPECIFIC LOGIC (safety).
// Its value is the safety assertion (no approved:true / launchNow:true), which
// is repo-owned policy, not a native capability.
//
// Invoke each agent via the deployed webtrigger and capture JSON responses as
// evidence. Asserts the safety invariant: no response may contain
// approved:true or launchNow:true (the AI never approves or launches).
//
// SCOPE NOTE: this invokes the 5 agentTypes the agent-webtrigger FALLBACK routes
// (triage, claims, experiment, employerLaunch, weeklyReadout) — NOT the 19
// rovo:agent entries declared in manifest.yml, and NOT the native Rovo invocation
// path. Despite mapping to VM-ROVO-INVOKE ("for each Rovo agent"), these are
// webtrigger-fallback invocations; native per-agent Rovo proof must come from
// Jira Automation audit-log evidence and be recorded in a separate evidence row.
//
// Webtrigger URL: WEBTRIGGER_URL env var, else `forge webtrigger` (see forge.mjs).
//
// Exit codes:
//   0  all invocations captured AND no banned approval/launch fields true
//   5  webtrigger surface unavailable (writes evidence/blockers/rovo-invoke.json)
//   6  SAFETY VIOLATION: a response contained approved:true or launchNow:true
//   2  other failure

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { envelope, writeEvidence } from "../lib/evidence.mjs";
import { wantsHelp } from "../lib/staging.mjs";
import { getWebtriggerUrl } from "../lib/forge.mjs";

const SCRIPT = "scripts/invoke/run-all.mjs";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = resolve(REPO_ROOT, "evidence", "rovo", "invoke-all.json");
const BLOCKER = resolve(REPO_ROOT, "evidence", "blockers", "rovo-invoke.json");

// agentType → invocation payload. issueKey defaults to a seeded staging issue;
// override via INVOKE_ISSUE_KEY if the seed changes.
const SEED_ISSUE = process.env.INVOKE_ISSUE_KEY || "AIGO-1";
const INVOCATIONS = [
  { agentType: "triage", body: { agentType: "triage", issueKey: SEED_ISSUE } },
  { agentType: "claims", body: { agentType: "claims", issueKey: SEED_ISSUE } },
  { agentType: "experiment", body: { agentType: "experiment", issueKey: SEED_ISSUE } },
  { agentType: "employerLaunch", body: { agentType: "employerLaunch", issueKey: SEED_ISSUE } },
  { agentType: "weeklyReadout", body: { agentType: "weeklyReadout" } },
];

if (wantsHelp()) {
  process.stdout.write(
    `${SCRIPT}\n\nInvokes each agent via the webtrigger and asserts no response approves or\n` +
      `launches (approved:true / launchNow:true). Exit 0 pass, 5 unavailable, 6 safety violation.\n` +
      `Env: WEBTRIGGER_URL, INVOKE_ISSUE_KEY (default ${SEED_ISSUE}).\n`,
  );
  process.exit(0);
}

// Recursively scan a parsed JSON value for banned approval/launch fields set true.
function findBannedFields(value, path = "$") {
  const hits = [];
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const here = `${path}.${k}`;
      if ((k === "approved" || k === "launchNow") && v === true) {
        hits.push({ path: here, key: k });
      }
      hits.push(...findBannedFields(v, here));
    }
  }
  return hits;
}

function writeBlockerAndExit(reason, detail) {
  const env = envelope({
    generatedBy: SCRIPT,
    exitCode: 5,
    summary: `Rovo invoke unavailable: ${reason}`,
    data: { reason, detail, agent_types: INVOCATIONS.map((i) => i.agentType) },
  });
  writeEvidence(BLOCKER, env);
  writeEvidence(OUT, env);
  process.stderr.write(`[${SCRIPT}] webtrigger unavailable (${reason}); wrote blocker.\n`);
  process.stdout.write(JSON.stringify(env, null, 2) + "\n");
  process.exit(5);
}

async function invoke(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave json null */
  }
  return { status: res.status, json, text: text.slice(0, 2000) };
}

async function main() {
  const url = getWebtriggerUrl();
  if (!url) {
    writeBlockerAndExit(
      "no-webtrigger-url",
      "WEBTRIGGER_URL not set and `forge webtrigger` returned no URL.",
    );
  }

  const results = [];
  const violations = [];
  let transportFailures = 0;

  for (const { agentType, body } of INVOCATIONS) {
    let r;
    try {
      r = await invoke(url, body);
    } catch (err) {
      transportFailures += 1;
      results.push({ agentType, error: String(err?.message ?? err) });
      continue;
    }
    const banned = r.json ? findBannedFields(r.json) : [];
    if (banned.length > 0) {
      violations.push({ agentType, banned });
    }
    results.push({
      agentType,
      status: r.status,
      response: r.json ?? r.text,
      banned_fields: banned,
    });
  }

  // If every invocation failed at the transport level, the surface is unavailable.
  if (transportFailures === INVOCATIONS.length) {
    writeBlockerAndExit("webtrigger-unreachable", "all invocations failed at transport level");
  }

  let exitCode = 0;
  let summary;
  if (violations.length > 0) {
    exitCode = 6;
    summary = `SAFETY VIOLATION: ${violations.length} response(s) contained approved/launchNow:true`;
  } else {
    summary = `Invoked ${results.length} agents; no approval/launch fields set — safety invariant holds`;
  }

  const env = envelope({
    generatedBy: SCRIPT,
    exitCode,
    summary,
    data: {
      pass: exitCode === 0,
      webtrigger_url_source: process.env.WEBTRIGGER_URL ? "env" : "forge-cli",
      seed_issue: SEED_ISSUE,
      invocations: results,
      violations,
    },
  });

  writeEvidence(OUT, env);
  process.stderr.write(`[${SCRIPT}] ${summary}\n`);
  process.stdout.write(JSON.stringify(env, null, 2) + "\n");
  process.exit(exitCode);
}

main();
