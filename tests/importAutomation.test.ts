/**
 * tests/importAutomation.test.ts
 *
 * Regression tests for retiring the Forge/private Automation import path.
 * Automation JSON rendering can stay, but supported provisioning must not rely
 * on private Atlassian Automation endpoints or a Forge function wrapper around
 * those endpoints.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");

function readRepoFile(...parts: string[]) {
  return readFileSync(join(REPO_ROOT, ...parts), "utf8");
}

describe("Automation import supported-path contract", () => {
  it("does not expose importAutomationRules from src/index.ts", () => {
    const indexSrc = readRepoFile("src", "index.ts");
    expect(indexSrc).not.toMatch(/export\s+async\s+function\s+importAutomationRules\b/);
    expect(indexSrc).not.toMatch(/export\s+\{[^}]*\bimportAutomationRules\b[^}]*\}/);
  });

  it("does not call Atlassian private Automation endpoints from the Forge handler layer", () => {
    const indexSrc = readRepoFile("src", "index.ts");
    expect(indexSrc).not.toMatch(/gateway\/api\/automation\/internal-api/i);
    expect(indexSrc).not.toMatch(/automation\/internal-api\/jira/i);
  });

  it("keeps Automation import out of package-supported Forge commands", () => {
    const packageJson = JSON.parse(readRepoFile("package.json")) as { scripts?: Record<string, string> };
    const supportedScripts = Object.entries(packageJson.scripts ?? {}).filter(([name]) =>
      /^provision:(all|automation|instance)$/.test(name),
    );

    const hits = supportedScripts
      .filter(([, command]) => /forge-import-automation|fn-import-automation|internal-api/.test(command))
      .map(([name, command]) => `${name}: ${command}`);

    expect(hits, hits.join("\n")).toEqual([]);
  });
});
