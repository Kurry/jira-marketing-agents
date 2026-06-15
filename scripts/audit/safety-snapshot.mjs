#!/usr/bin/env node
// generated_by: scripts/audit/safety-snapshot.mjs
//
// Read-only safety audit. Verifies the safety-contract surface is intact:
//   - required team hooks present
//   - required policy docs present
//   - tests/safety/ directory exists (MISSING is a hard failure)
//   - prompts/*.md free of banned phrases
//   - src/ write surface limited to the allowlisted mutations
//
// Exit codes:
//   0  all checks pass
//   1  usage / unexpected error
//   2  banned phrase found in prompts OR tests/safety/ missing
//
// Usage: node scripts/audit/safety-snapshot.mjs [--help]

import { readdirSync, readFileSync, existsSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

if (process.argv.includes("--help")) {
  console.log(
    [
      "safety-snapshot.mjs — read-only safety-contract audit",
      "",
      "Checks hooks, policies, tests/safety, banned prompt phrases, and src write surface.",
      "Writes evidence/audit/safety.json.",
      "",
      "Exit codes: 0 ok | 1 error | 2 banned phrase or tests/safety missing",
    ].join("\n")
  );
  process.exit(0);
}

const REQUIRED_HOOKS = ["task-completed.sh", "task-created.sh", "teammate-idle.sh"];
const REQUIRED_POLICIES = ["claims-risk-policy.md", "safe-mutations.md", "experiment-policy.md"];
// Phrases that must never appear in agent prompts — each would imply the AI is
// approving claims, launching, or mutating audiences (all safety-contract violations).
const BANNED_PHRASES = [/approved:/i, /launchNow/i, /mutatesAudience/i, /mutates.*audience/i];
// Mutations that are explicitly allowlisted by policies/safe-mutations.md.
// addComment is the low-level write helper that addAnalysisComment wraps — it is
// the single sanctioned comment write path, not an independent mutation.
const ALLOWLISTED_MUTATIONS = new Set(["addAnalysisComment", "addComment"]);

function rel(p) {
  return p.replace(REPO_ROOT + "/", "");
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

// (a) hooks
const hooksDir = join(REPO_ROOT, ".claude", "hooks");
const hooksPresent = REQUIRED_HOOKS.filter((h) => existsSync(join(hooksDir, h)));
const hooksMissing = REQUIRED_HOOKS.filter((h) => !hooksPresent.includes(h));

// (b) policies
const policiesDir = join(REPO_ROOT, "policies");
const policiesPresent = REQUIRED_POLICIES.filter((p) => existsSync(join(policiesDir, p)));
const policiesMissing = REQUIRED_POLICIES.filter((p) => !policiesPresent.includes(p));

// (c) tests/safety
const testsSafetyDir = join(REPO_ROOT, "tests", "safety");
const testsSafetyExists = existsSync(testsSafetyDir) && statSync(testsSafetyDir).isDirectory();

// (d) banned phrases in prompts
const promptsDir = join(REPO_ROOT, "prompts");
const bannedPhrasesFound = [];
if (existsSync(promptsDir)) {
  for (const file of readdirSync(promptsDir).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(join(promptsDir, file), "utf8");
    text.split("\n").forEach((line, i) => {
      for (const re of BANNED_PHRASES) {
        if (re.test(line)) {
          bannedPhrasesFound.push({ file: `prompts/${file}`, line: i + 1, pattern: re.source });
        }
      }
    });
  }
}

// (e) src write surface — find every function whose body issues a non-GET Jira
// request, plus the canonical write helper addComment. The only handlers that
// reach a write are addAnalysisComment (the lone MVP mutation) and the
// operator-invoked importAutomationRules (which forces state: "DISABLED").
function listSrcFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSrcFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const writeMethodRe = /method:\s*["'](POST|PUT|DELETE|PATCH)["']/;
const mutatingExports = [];
for (const file of listSrcFiles(join(REPO_ROOT, "src"))) {
  const lines = readFileSync(file, "utf8").split("\n");
  let currentFn = null;
  lines.forEach((line) => {
    const fnMatch = line.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
    if (fnMatch) currentFn = fnMatch[1];
    if (writeMethodRe.test(line)) {
      const method = line.match(writeMethodRe)[1];
      mutatingExports.push({
        file: rel(file),
        export: currentFn ?? "(module-scope)",
        method,
        allowlisted: currentFn ? ALLOWLISTED_MUTATIONS.has(currentFn) : false,
      });
    }
  });
}
// searchIssues uses POST for the JQL search endpoint but is read-only — drop it.
const realMutations = mutatingExports.filter((m) => m.export !== "searchIssues");
const unlistedMutations = realMutations.filter((m) => !m.allowlisted);

// Verify the automation provisioner rejects rules that are not DISABLED.
const provisionerPath = join(REPO_ROOT, "scripts", "provision-automation.cjs");
const automationForcesDisabled = existsSync(provisionerPath)
  ? /state\s*!==\s*["']DISABLED["']/.test(readFileSync(provisionerPath, "utf8"))
  : false;

// --- verdict ---
const failures = [];
if (hooksMissing.length) failures.push(`missing hooks: ${hooksMissing.join(", ")}`);
if (policiesMissing.length) failures.push(`missing policies: ${policiesMissing.join(", ")}`);
if (!testsSafetyExists) failures.push("tests/safety/ directory is MISSING");
if (bannedPhrasesFound.length) failures.push(`${bannedPhrasesFound.length} banned phrase(s) in prompts`);
if (unlistedMutations.length) {
  failures.push(`unlisted mutating exports: ${unlistedMutations.map((m) => m.export).join(", ")}`);
}
if (!automationForcesDisabled) failures.push("automation import does not force state: DISABLED");

// Exit 2 specifically for banned phrases or missing safety tests (per spec).
let exitCode = 0;
if (bannedPhrasesFound.length || !testsSafetyExists) exitCode = 2;
else if (failures.length) exitCode = 2;

const summary =
  failures.length === 0
    ? `Safety snapshot OK: ${hooksPresent.length}/${REQUIRED_HOOKS.length} hooks, ${policiesPresent.length}/${REQUIRED_POLICIES.length} policies, 0 banned phrases, ${realMutations.length} allowlisted mutation(s)`
    : `Safety snapshot FAILED: ${failures.join("; ")}`;

const envelope = {
  generated_by: "scripts/audit/safety-snapshot.mjs",
  generated_at: new Date().toISOString(),
  git_sha: gitSha(),
  instance: "staging",
  exit_code: exitCode,
  summary,
  data: {
    hooks_present: hooksPresent,
    hooks_missing: hooksMissing,
    policies_present: policiesPresent,
    policies_missing: policiesMissing,
    tests_safety_exists: testsSafetyExists,
    banned_phrases_found: bannedPhrasesFound,
    mutating_exports: realMutations,
    unlisted_mutations: unlistedMutations,
    automation_forces_disabled: automationForcesDisabled,
  },
};

const outDir = join(REPO_ROOT, "evidence", "audit");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "safety.json"), JSON.stringify(envelope, null, 2) + "\n");

process.stderr.write(summary + "\n");
process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
process.exit(exitCode);
