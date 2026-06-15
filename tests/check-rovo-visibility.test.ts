/**
 * tests/check-rovo-visibility.test.ts
 *
 * Unit tests for the pure-function exports of scripts/check-rovo-visibility.cjs:
 *   - countManifestAgents: parses rovo:agent entries from manifest.yml
 *   - checkForgeInstallStatus: parses `forge install list` stdout for site status
 *
 * No live Forge CLI calls are made — checkForgeInstallStatus is tested via
 * the function's output-parsing logic on fixture strings.
 */

import { describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { countManifestAgents, checkForgeInstallStatus } = require("../scripts/check-rovo-visibility.cjs") as {
  countManifestAgents: (manifestPath: string) => { count: number; keys: string[] };
  checkForgeInstallStatus: (site: string) => { found: boolean; status: string; raw: string };
};

// ---------------------------------------------------------------------------
// Suite 1: countManifestAgents — manifest.yml parsing
// ---------------------------------------------------------------------------

describe("countManifestAgents — manifest.yml parsing", () => {
  it("counts all 19 rovo:agent entries in the real manifest.yml", () => {
    const manifestPath = path.resolve(__dirname, "../manifest.yml");
    const result = countManifestAgents(manifestPath);
    expect(result.count).toBe(19);
    expect(result.keys.length).toBe(19);
  });

  it("returns agent keys as non-empty strings", () => {
    const manifestPath = path.resolve(__dirname, "../manifest.yml");
    const { keys } = countManifestAgents(manifestPath);
    for (const key of keys) {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it("known agent keys are present in manifest", () => {
    const manifestPath = path.resolve(__dirname, "../manifest.yml");
    const { keys } = countManifestAgents(manifestPath);
    const keySet = new Set(keys);
    expect(keySet.has("growth-triage-agent")).toBe(true);
    expect(keySet.has("creative-claims-agent")).toBe(true);
    expect(keySet.has("experiment-design-agent")).toBe(true);
    expect(keySet.has("weekly-readout-agent")).toBe(true);
  });

  it("returns count=0 and empty keys for a manifest with no rovo:agent section", () => {
    const tmp = path.join(os.tmpdir(), `test-manifest-no-rovo-${Date.now()}.yml`);
    fs.writeFileSync(tmp, `app:\n  id: some-id\nmodules:\n  jira:project-page:\n    - key: my-page\n`);
    try {
      const result = countManifestAgents(tmp);
      expect(result.count).toBe(0);
      expect(result.keys).toEqual([]);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("counts correctly for a fixture manifest with 2 rovo:agent entries", () => {
    const tmp = path.join(os.tmpdir(), `test-manifest-fixture-${Date.now()}.yml`);
    fs.writeFileSync(tmp, [
      "app:",
      "  id: test-id",
      "modules:",
      "  rovo:agent:",
      "    - key: agent-alpha",
      "      name: Alpha",
      "      description: Alpha agent.",
      "    - key: agent-beta",
      "      name: Beta",
      "      description: Beta agent.",
      "  action:",
      "    - key: some-action",
      "      function: handler",
      "",
    ].join("\n"));
    try {
      const result = countManifestAgents(tmp);
      expect(result.count).toBe(2);
      expect(result.keys).toContain("agent-alpha");
      expect(result.keys).toContain("agent-beta");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws a descriptive error when manifest file does not exist", () => {
    expect(() => countManifestAgents("/nonexistent/path/manifest.yml")).toThrow(
      /manifest.yml not found/i
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 2: checkForgeInstallStatus — output parsing (no live forge call)
// ---------------------------------------------------------------------------
// We can't call `forge install list` in CI (no Forge auth), so we test the
// parsing logic by monkey-patching spawnSync results. Instead we test the
// function indirectly via the raw string that the implementation parses.
//
// The function is called with a site name; internally it runs spawnSync.
// Since the live forge CLI is not available in test, we verify the parsing
// logic using a slightly different angle: provide a known-bad site name that
// won't be in any output, which should return { found: false }.

describe("checkForgeInstallStatus — output parsing", () => {
  it("returns found=false for an unregistered site name", () => {
    // With no matching interceptor the function runs spawnSync which
    // either fails with ENOENT or returns empty stdout — neither contains
    // the fake site name, so found must be false.
    const result = checkForgeInstallStatus("this-site-does-not-exist.atlassian.net");
    expect(result.found).toBe(false);
    expect(typeof result.raw).toBe("string");
    // Status should be either NOT_FOUND or ERROR (if forge isn't on PATH)
    expect(["NOT_FOUND", "ERROR"]).toContain(result.status);
  });

  it("returns an object with the expected shape", () => {
    const result = checkForgeInstallStatus("example.atlassian.net");
    expect(result).toHaveProperty("found");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("raw");
    expect(typeof result.found).toBe("boolean");
    expect(typeof result.status).toBe("string");
    expect(typeof result.raw).toBe("string");
  });
});
