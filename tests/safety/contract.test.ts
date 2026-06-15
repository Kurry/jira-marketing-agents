import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");

// Phrases that, if they appeared in an agent prompt, would imply the AI is
// approving claims, launching campaigns, or mutating audiences — all of which
// the safety contract forbids.
const BANNED_PHRASES: RegExp[] = [/approved:/i, /launchNow/i, /mutatesAudience/i, /mutates.*audience/i];

// The only handlers in src/ allowed to reach a Jira write. addAnalysisComment is
// the MVP's single mutation; importAutomationRules is operator-invoked and forces
// state: "DISABLED". Any other write surface is a safety-contract violation.
const ALLOWLISTED_MUTATIONS = new Set(["addAnalysisComment", "importAutomationRules"]);

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
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

  it("automation import forces state: DISABLED", () => {
    const indexSrc = readFileSync(join(REPO_ROOT, "src", "index.ts"), "utf8");
    expect(indexSrc).toMatch(/state:\s*["']DISABLED["']/);
  });

  it("required policy docs exist", () => {
    for (const p of ["claims-risk-policy.md", "safe-mutations.md", "experiment-policy.md"]) {
      expect(existsSync(join(REPO_ROOT, "policies", p)), `missing policies/${p}`).toBe(true);
    }
  });
});
