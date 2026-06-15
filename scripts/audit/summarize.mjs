#!/usr/bin/env node
// generated_by: scripts/audit/summarize.mjs
//
// T-A-06 — Aggregate all Phase 1 audit JSON files into evidence/audit/summary.json.
// Reads: repo.json, forge.json, jira.json, v1.json, safety.json
// Writes: evidence/audit/summary.json
//
// Exit codes:
//   0  success
//   1  one or more input files missing (listed in output)
//   2  fatal error

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, "..", "..");
const AUDIT_DIR = resolve(REPO_ROOT, "evidence/audit");
const OUT_PATH = resolve(AUDIT_DIR, "summary.json");

if (process.argv.includes("--help")) {
  process.stdout.write(
    "summarize.mjs — aggregate Phase 1 audit JSON into summary.json\n\n" +
    "Usage: node scripts/audit/summarize.mjs [--help]\n" +
    "Writes: evidence/audit/summary.json\n"
  );
  process.exit(0);
}

function gitSha() {
  try { return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim(); }
  catch { return "unknown"; }
}

function readAudit(name) {
  const path = resolve(AUDIT_DIR, `${name}.json`);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function main() {
  const repo = readAudit("repo");
  const forge = readAudit("forge");
  const jira = readAudit("jira");
  const v1 = readAudit("v1");
  const safety = readAudit("safety");

  const missing = ["repo", "forge", "jira", "v1", "safety"]
    .filter((n, i) => [repo, forge, jira, v1, safety][i] === null);

  if (missing.length > 0) {
    process.stderr.write(`ERROR: missing audit files: ${missing.join(", ")}\n`);
    process.stderr.write("Run: node scripts/audit/run-all.mjs\n");
    process.exit(1);
  }

  // ── Gaps ────────────────────────────────────────────────────────────────
  const gaps = [];

  // npm scripts
  const requiredNpmScripts = ["audit", "infra:plan", "infra:apply", "infra:verify", "infra:render", "test:safety", "rovo:invoke-all", "forge:deploy", "forge:install", "forge:lint"];
  const npmScripts = repo?.data?.npm_scripts ?? [];
  const missingNpmScripts = requiredNpmScripts.filter(s => !npmScripts.includes(s));
  if (missingNpmScripts.length > 0) gaps.push({ type: "missing-npm-scripts", items: missingNpmScripts });

  // infra/ tree
  const hasDirs = repo?.data?.directories ?? {};
  if (!hasDirs["infra"]) gaps.push({ type: "missing-directory", path: "infra/" });

  // verify scripts
  const vmRows = ["jira-issue-types", "jira-fields", "jira-workflow", "jira-filters", "jira-dashboards", "jira-seeds", "automation-render", "automation-import", "automation-audit", "rovo-agents", "forge-install", "forge-logs", "safety", "idempotency", "worktree", "evidence-regenerable", "ci-status"];
  const existingVerifyScripts = repo?.data?.verify_scripts ?? [];
  const missingVerifyScripts = vmRows.filter(v => !existingVerifyScripts.includes(v));
  if (missingVerifyScripts.length > 0) gaps.push({ type: "missing-verify-scripts", items: missingVerifyScripts });

  // tests/safety
  if (!safety?.data?.tests_safety_exists) {
    gaps.push({ type: "missing-directory", path: "tests/safety/", note: "no safety test suite" });
  }

  // Forge install status
  const forgeInstall = forge?.data?.install_status;
  if (forgeInstall !== "Up-to-date") {
    gaps.push({ type: "forge-not-up-to-date", install_status: forgeInstall });
  }

  // ── Manual artefacts to delete ──────────────────────────────────────────
  const manualArtefacts = (v1?.data?.manual_artefacts ?? []).map(f => ({
    path: f,
    action: "delete-or-regenerate",
  }));

  // ── Legacy scripts to migrate ──────────────────────────────────────────
  const legacyScripts = (v1?.data?.legacy_scripts ?? []).map(f => ({
    path: f,
    action: "assess-and-wrap-or-deprecate",
  }));

  // ── Safety issues ──────────────────────────────────────────────────────
  const safetyIssues = [];
  if (!safety?.data?.hooks_present || safety.data.hooks_present.length < 3) {
    safetyIssues.push({ type: "missing-hooks", detail: "not all .claude/hooks/*.sh are present" });
  }
  if (!safety?.data?.policies_present || safety.data.policies_present.length < 3) {
    safetyIssues.push({ type: "missing-policies", detail: "one or more policies/*.md files missing" });
  }
  if (safety?.data?.banned_phrases_found?.length > 0) {
    safetyIssues.push({ type: "banned-phrases-in-prompts", items: safety.data.banned_phrases_found });
  }
  if (jira?.data?.automation?.status === "api_unavailable") {
    safetyIssues.push({ type: "automation-api-unavailable", note: "Cannot verify rules are DISABLED via REST — use manual check or enable Jira Automation API scope" });
  }

  // ── Recommended tasks ─────────────────────────────────────────────────
  const recommendedTasks = [];

  // Phase 3: delete manual artefacts
  if (manualArtefacts.length > 0) {
    recommendedTasks.push({
      id: "T-D-01", owner: "iac-architect", phase: 3,
      summary: `Delete ${manualArtefacts.length} manual v1 artefacts under evidence/ (no generated_by header)`,
      vmRow: "VM-REGENERABLE-EVIDENCE",
    });
  }

  // Phase 4: infra/ scaffolding
  if (!hasDirs["infra"]) {
    recommendedTasks.push({
      id: "T-R-INFRA-01", owner: "iac-architect", phase: 4,
      summary: "Create infra/ tree with schemaVersion:1 YAML stubs (issue-types, fields, workflows, filters, dashboards, automation, seeds)",
      vmRow: "VM-JIRA-PROJECT",
    });
  }
  recommendedTasks.push({
    id: "T-R-INFRA-02", owner: "script-eng", phase: 4,
    summary: "Implement scripts/infra/plan.mjs — reads infra/, computes drift vs live Jira, exits 0 with no-changes when converged",
    vmRow: "VM-IDEMPOTENCY",
  });
  recommendedTasks.push({
    id: "T-R-INFRA-03", owner: "script-eng", phase: 4,
    summary: "Implement scripts/infra/apply.mjs — idempotent converge of all Jira resources to infra/ declarations",
    vmRow: "VM-IDEMPOTENCY",
  });
  recommendedTasks.push({
    id: "T-R-INFRA-04", owner: "script-eng", phase: 4,
    summary: "Implement scripts/verify/run-all.mjs — aggregates all VM-row verify scripts, produces evidence/verify/run-all.json and evidence/DONE.json",
    vmRow: "VM-DONE",
  });
  recommendedTasks.push({
    id: "T-R-INFRA-05", owner: "jira-client-eng", phase: 4,
    summary: "Fill infra/jira/ YAML files from live Jira snapshot (issue-types.yaml, fields.yaml, workflows/aigo-default.yaml, filters.yaml, dashboards.yaml)",
    vmRow: "VM-JIRA-ISSUE-TYPES",
  });

  // Phase 5: per-resource verify scripts
  const p5resources = [
    { id: "T-R-P5-ISSUE-TYPES", owner: "jira-client-eng", resource: "jira-issue-types", vmRow: "VM-JIRA-ISSUE-TYPES" },
    { id: "T-R-P5-FIELDS",      owner: "jira-client-eng", resource: "jira-fields",      vmRow: "VM-JIRA-FIELDS" },
    { id: "T-R-P5-WORKFLOW",    owner: "jira-client-eng", resource: "jira-workflow",     vmRow: "VM-JIRA-WORKFLOW" },
    { id: "T-R-P5-FILTERS",     owner: "jira-client-eng", resource: "jira-filters",      vmRow: "VM-JIRA-FILTERS" },
    { id: "T-R-P5-DASHBOARDS",  owner: "jira-client-eng", resource: "jira-dashboards",   vmRow: "VM-JIRA-DASHBOARDS" },
    { id: "T-R-P5-SEEDS",       owner: "jira-client-eng", resource: "jira-seeds",        vmRow: "VM-JIRA-SEEDS" },
    { id: "T-R-P5-AUTOMATION",  owner: "jira-client-eng", resource: "automation-audit",  vmRow: "VM-AUTOMATION-IMPORT" },
    { id: "T-R-P5-ROVO",        owner: "forge-rovo-eng",  resource: "rovo-agents",       vmRow: "VM-ROVO-CATALOG" },
    { id: "T-R-P5-FORGE",       owner: "forge-rovo-eng",  resource: "forge-install",     vmRow: "VM-FORGE-INSTALL" },
  ];
  p5resources.forEach(r => recommendedTasks.push({
    id: r.id, owner: r.owner, phase: 5,
    summary: `Write scripts/verify/${r.resource}.mjs — asserts live state matches infra/ declarations`,
    vmRow: r.vmRow,
  }));

  // Safety tests
  if (!safety?.data?.tests_safety_exists) {
    recommendedTasks.push({
      id: "T-R-SAFE-01", owner: "safety-tester", phase: 7,
      summary: "Create tests/safety/ suite: no-claims-approval, no-campaign-send, no-audience-mutation, PHI-redaction, policy-hash assertions",
      vmRow: "VM-SAFETY",
    });
  }

  // Docs
  recommendedTasks.push({
    id: "T-R-DOC-01", owner: "docs-scribe", phase: 8,
    summary: "Write scripts/docs/generate.mjs — rebuilds INTEGRATION.md, MVP_RUNBOOK.md, PORTABILITY.md from infra/ state",
    vmRow: "VM-CI",
  });

  // ── Jira state summary ─────────────────────────────────────────────────
  const jiraState = {
    project: jira?.data?.project ?? null,
    issue_type_count: jira?.data?.issue_types?.length ?? 0,
    custom_field_count: jira?.data?.custom_fields?.length ?? 0,
    filter_count: jira?.data?.filters?.length ?? 0,
    automation_status: jira?.data?.automation?.status ?? "unknown",
    data_source: jira?.data_source ?? "unknown",
  };

  const forgeState = {
    install_status: forge?.data?.install_status ?? "unknown",
    rovo_agent_count: forge?.data?.manifest?.rovo_agent_count ?? 0,
    action_count: forge?.data?.manifest?.action_count ?? 0,
  };

  const summary = `Phase 1 audit complete. ` +
    `Jira: ${jiraState.issue_type_count} types, ${jiraState.custom_field_count} fields, ${jiraState.filter_count} filters. ` +
    `Forge: ${forgeState.install_status}, ${forgeState.rovo_agent_count} agents. ` +
    `Gaps: ${gaps.length}. Manual artefacts: ${manualArtefacts.length}. ` +
    `Recommended tasks: ${recommendedTasks.length}.`;

  const envelope = {
    generated_by: "scripts/audit/summarize.mjs",
    generated_at: new Date().toISOString(),
    git_sha: gitSha(),
    instance: "staging",
    exit_code: 0,
    summary,
    data: {
      gaps,
      manual_artefacts_to_delete: manualArtefacts,
      legacy_scripts_to_migrate: legacyScripts,
      missing_vm_scripts: missingVerifyScripts,
      safety_issues: safetyIssues,
      recommended_tasks: recommendedTasks,
      jira_state: jiraState,
      forge_state: forgeState,
    },
  };

  mkdirSync(AUDIT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(envelope, null, 2) + "\n");
  process.stderr.write(summary + "\n");
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
  return 0;
}

try { process.exit(main()); }
catch (err) { process.stderr.write(`FATAL: ${err?.stack || err}\n`); process.exit(2); }
