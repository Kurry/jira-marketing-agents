import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");

// Phrases that, if they appeared in an agent prompt, would imply the AI is
// approving claims, launching campaigns, or mutating audiences — all of which
// the safety contract forbids.
const BANNED_PHRASES: RegExp[] = [/approved:/i, /launchNow/i, /mutatesAudience/i, /mutates.*audience/i];

// addAnalysisComment is the ONLY handler in src/ allowed to reach a Jira write.
// Any other write surface is a safety-contract violation.
const ALLOWLISTED_MUTATIONS = new Set(["addAnalysisComment"]);

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function repoRelative(file: string) {
  return file.replace(`${REPO_ROOT}/`, "");
}

function matchingLines(
  files: string[],
  patterns: RegExp[],
  allowLine: (line: string, context: string) => boolean = () => false,
) {
  const hits: string[] = [];
  for (const file of files.filter(existsSync)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const context = lines.slice(Math.max(0, i - 8), i + 9).join("\n");
      if (allowLine(line, context)) return;
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          hits.push(`${repoRelative(file)}:${i + 1} matched /${pattern.source}/: ${line.trim()}`);
        }
      }
    });
  }
  return hits;
}

describe("safety contract", () => {
  it("no agent prompt contains a banned phrase", () => {
    const promptsDir = join(REPO_ROOT, "prompts");
    const hits: string[] = [];
    for (const file of readdirSync(promptsDir).filter((f) => f.endsWith(".md"))) {
      const lines = readFileSync(join(promptsDir, file), "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const re of BANNED_PHRASES) {
          if (re.test(line)) hits.push(`prompts/${file}:${i + 1} matched /${re.source}/`);
        }
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("only allowlisted exports issue a non-GET Jira request", () => {
    const writeMethodRe = /method:\s*["'](POST|PUT|DELETE|PATCH)["']/;
    const unlisted: string[] = [];
    for (const file of listTsFiles(join(REPO_ROOT, "src"))) {
      const lines = readFileSync(file, "utf8").split("\n");
      let currentFn: string | null = null;
      lines.forEach((line, i) => {
        const fnMatch = line.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
        if (fnMatch) currentFn = fnMatch[1];
        if (writeMethodRe.test(line)) {
          // searchIssues POSTs to the JQL search endpoint but is read-only.
          if (currentFn === "searchIssues" || currentFn === "addComment") return;
          if (!currentFn || !ALLOWLISTED_MUTATIONS.has(currentFn)) {
            unlisted.push(`${file.replace(REPO_ROOT + "/", "")}:${i + 1} in ${currentFn ?? "(module)"}`);
          }
        }
      });
    }
    expect(unlisted, `unlisted write surface:\n${unlisted.join("\n")}`).toEqual([]);
  });

  it("automation provisioner rejects rules not in state DISABLED", () => {
    const scriptSrc = readFileSync(join(REPO_ROOT, "scripts", "provision-automation.cjs"), "utf8");
    expect(scriptSrc).toMatch(/state\s*!==\s*["']DISABLED["']/);
  });

  it("private Jira Automation APIs require explicit experimental opt-in", () => {
    const provisioner = readFileSync(join(REPO_ROOT, "scripts", "provision-automation.cjs"), "utf8");
    const triggerFixer = readFileSync(join(REPO_ROOT, "scripts", "fix-automation-triggers.cjs"), "utf8");

    for (const source of [provisioner, triggerFixer]) {
      expect(source).toContain("gateway/api/automation/internal-api");
      expect(source).toContain("AIGO_EXPERIMENTAL_AUTOMATION_IMPORT");
    }

    expect(provisioner).toMatch(/if\s*\(\s*!args\.experimentalApiImport\s*\)/);
    expect(triggerFixer).toMatch(/if\s*\(\s*!args\.dryRun\s*&&\s*!args\.experimentalInternalApi\s*\)/);
  });

  it("production docs do not present Forge/private Automation import as the supported path", () => {
    const docs = [
      join(REPO_ROOT, "README.md"),
      ...listFiles(join(REPO_ROOT, "docs"), (file) => file.endsWith(".md")),
    ];
    const supportedPrivateAutomationClaims = [
      /provision:automation:forge/i,
      /fn-import-automation/i,
      /Automated via Forge function/i,
      /Forge function import \(preferred\)/i,
      /Automated path \(preferred\)/i,
      /preferred path.*Forge function/i,
      /no OAuth scope issues/i,
      /does not require.*OAuth admin token/i,
      /manage:jira-configuration.*Import Jira Automation rules/i,
      /Jira Automation gateway/i,
    ];
    const unsupportedContext = (_line: string, context: string) =>
      /experimental|private\/internal|do not treat|not supported|staging evidence|retired/i.test(context);

    const hits = matchingLines(docs, supportedPrivateAutomationClaims, unsupportedContext);
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("docs and scripts do not claim Rovo UI visibility from Forge install alone", () => {
    const rovoProofSources = [
      join(REPO_ROOT, "README.md"),
      join(REPO_ROOT, "scripts", "check-rovo-visibility.cjs"),
      join(REPO_ROOT, "scripts", "provision-all.cjs"),
      ...listFiles(join(REPO_ROOT, "docs"), (file) => file.endsWith(".md")),
    ];
    const installOnlyVisibilityClaims = [
      /guaranteed visible/i,
      /Deployment guarantee/i,
      /agents are visible in Rovo/i,
      /all checks pass.*agents are visible/i,
      /Rovo agent visibility check/i,
      /Rovo agent visibility verification/i,
      /check:rovo.*(?:visibility|visible)/i,
      /(?:visibility|visible).*check:rovo/i,
    ];
    const safeVisibilityContext = (_line: string, context: string) =>
      /manual|UI confirmation|does not prove|not prove|pending|Jira UI|Rovo UI|manifest\/install/i.test(context);

    const hits = matchingLines(rovoProofSources, installOnlyVisibilityClaims, safeVisibilityContext);
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("required policy docs exist", () => {
    for (const p of ["claims-risk-policy.md", "safe-mutations.md", "experiment-policy.md"]) {
      expect(existsSync(join(REPO_ROOT, "policies", p)), `missing policies/${p}`).toBe(true);
    }
  });
});
