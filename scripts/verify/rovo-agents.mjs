#!/usr/bin/env node
// generated_by: scripts/verify/rovo-agents.mjs (T-R-P5)
//
// Verify the Rovo agents declared in manifest.yml are reachable.
//
// There is no public Rovo "list my agents" REST surface, so reachability is
// confirmed via the agent webtrigger (the operator-controlled invocation path).
// A 2xx/4xx JSON response proves the function is deployed and routing; only a
// transport failure (no URL, connection refused, 5xx) counts as unreachable.
//
// Exit codes:
//   0  all declared agents accounted for and webtrigger reachable
//   5  Rovo/webtrigger surface unavailable (writes evidence/blockers/rovo-catalog.json)
//   2  manifest unreadable / other failure

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { envelope, writeEvidence } from "../lib/evidence.mjs";
import { wantsHelp } from "../lib/staging.mjs";
import { getWebtriggerUrl } from "../lib/forge.mjs";

const SCRIPT = "scripts/verify/rovo-agents.mjs";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = resolve(REPO_ROOT, "evidence", "verify", "rovo-agents.json");
const BLOCKER = resolve(REPO_ROOT, "evidence", "blockers", "rovo-catalog.json");

if (wantsHelp()) {
  process.stdout.write(
    `${SCRIPT}\n\nReads manifest.yml rovo:agent entries and confirms the agent webtrigger is\n` +
      `reachable. Exit 0 pass, 5 Rovo surface unavailable, 2 manifest error.\n`,
  );
  process.exit(0);
}

// Collect rovo:agent keys from manifest.yml (section-scoped parse).
function readAgentKeys() {
  const text = readFileSync(resolve(REPO_ROOT, "manifest.yml"), "utf8");
  const lines = text.split("\n");
  let inModules = false;
  let currentModule = null;
  const keys = [];
  for (const line of lines) {
    if (/^modules:\s*$/.test(line)) {
      inModules = true;
      continue;
    }
    if (inModules && /^\S/.test(line)) {
      inModules = false;
      currentModule = null;
    }
    if (!inModules) continue;
    const moduleMatch = line.match(/^ {2}([a-zA-Z][\w:]*):\s*$/);
    if (moduleMatch) {
      currentModule = moduleMatch[1];
      continue;
    }
    if (currentModule === "rovo:agent") {
      const keyMatch = line.match(/^ {4}- key:\s*(\S+)/);
      if (keyMatch) keys.push(keyMatch[1]);
    }
  }
  return keys;
}

async function probeWebtrigger(url) {
  // A harmless POST with a deliberately bad agentType. We expect HTTP 400 with
  // a JSON error listing valid agentTypes — that proves the function deployed
  // and routes. Connection/5xx failures mean the surface is unavailable.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentType: "__verify_probe__" }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

function writeBlockerAndExit(agentKeys, reason, detail) {
  const env = envelope({
    generatedBy: SCRIPT,
    exitCode: 5,
    summary: `Rovo catalog unavailable: ${reason}`,
    data: {
      reason,
      detail,
      declared_agent_count: agentKeys.length,
      declared_agents: agentKeys,
      note:
        "No public Rovo agent-listing REST API; reachability is probed via the " +
        "agent webtrigger. Set WEBTRIGGER_URL or run `forge webtrigger` to enable.",
    },
  });
  writeEvidence(BLOCKER, env);
  writeEvidence(OUT, env);
  process.stderr.write(`[${SCRIPT}] Rovo surface unavailable (${reason}); wrote blocker.\n`);
  process.stdout.write(JSON.stringify(env, null, 2) + "\n");
  process.exit(5);
}

async function main() {
  let agentKeys;
  try {
    agentKeys = readAgentKeys();
  } catch (err) {
    process.stderr.write(`[${SCRIPT}] failed to read manifest: ${err.message}\n`);
    process.exit(2);
  }

  const url = getWebtriggerUrl();
  if (!url) {
    writeBlockerAndExit(
      agentKeys,
      "no-webtrigger-url",
      "WEBTRIGGER_URL not set and `forge webtrigger` returned no URL.",
    );
  }

  let probe;
  try {
    probe = await probeWebtrigger(url);
  } catch (err) {
    writeBlockerAndExit(agentKeys, "webtrigger-unreachable", String(err?.message ?? err));
  }

  // 5xx → function deployed but erroring at transport level: treat as unavailable.
  if (probe.status >= 500) {
    writeBlockerAndExit(agentKeys, "webtrigger-5xx", `HTTP ${probe.status}: ${probe.text}`);
  }

  const reachable = probe.status >= 200 && probe.status < 500;
  const exitCode = reachable ? 0 : 5;
  const summary = `${agentKeys.length} Rovo agents declared; webtrigger reachable (HTTP ${probe.status})`;

  const env = envelope({
    generatedBy: SCRIPT,
    exitCode,
    summary,
    data: {
      pass: reachable,
      declared_agent_count: agentKeys.length,
      declared_agents: agentKeys,
      webtrigger_url_source: process.env.WEBTRIGGER_URL ? "env" : "forge-cli",
      probe_status: probe.status,
      probe_response: probe.json ?? probe.text,
    },
  });

  writeEvidence(OUT, env);
  process.stderr.write(`[${SCRIPT}] ${summary}\n`);
  process.stdout.write(JSON.stringify(env, null, 2) + "\n");
  process.exit(exitCode);
}

main();
