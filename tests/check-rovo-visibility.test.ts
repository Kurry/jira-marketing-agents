/**
 * tests/check-rovo-visibility.test.ts
 *
 * Unit tests for scripts/check-rovo-visibility.cjs:
 *   - countManifestAgents: parses rovo:agent entries from manifest.yml
 *   - parseForgeInstallStatus: parses `forge install list --json` stdout for site status
 *   - CLI output: reports manifest/install proof only, not UI visibility proof
 *
 * No live Forge CLI calls are made.
 */

import { describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { countManifestAgents, parseForgeInstallStatus } = require("../scripts/check-rovo-visibility.cjs") as {
  countManifestAgents: (manifestPath: string) => { count: number; keys: string[] };
  parseForgeInstallStatus: (raw: string, site: string) => { found: boolean; status: string; raw: string };
};

// ---------------------------------------------------------------------------
// Suite 1: countManifestAgents - manifest.yml parsing
// ---------------------------------------------------------------------------

describe("countManifestAgents - manifest.yml parsing", () => {
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
// Suite 2: parseForgeInstallStatus - output parsing (no live forge call)
// ---------------------------------------------------------------------------

describe("parseForgeInstallStatus - --json output parsing", () => {
  it("returns Up-to-date when the target site row is current", () => {
    const raw = JSON.stringify([
      {
        id: "7e844a39",
        environment: "development",
        site: "myhealthcaresite.atlassian.net",
        product: "Jira",
        majorVersion: "3 (Latest)",
        appVersion: "3",
        status: "Up-to-date",
      },
    ]);

    const result = parseForgeInstallStatus(raw, "myhealthcaresite.atlassian.net");

    expect(result).toEqual({ found: true, status: "Up-to-date", raw });
  });

  it("tolerates leading non-JSON noise before the array", () => {
    const raw =
      "Warning: Forge CLI supports Node.js 22.x or 24.x.\n" +
      JSON.stringify([
        { id: "x", environment: "development", site: "myhealthcaresite.atlassian.net", product: "Jira", appVersion: "3", status: "Up-to-date" },
      ]);

    const result = parseForgeInstallStatus(raw, "myhealthcaresite.atlassian.net");

    expect(result.found).toBe(true);
    expect(result.status).toBe("Up-to-date");
  });

  it("returns Out-of-date for a stale target site row", () => {
    const raw = JSON.stringify([
      {
        id: "7e844a39",
        environment: "development",
        site: "myhealthcaresite.atlassian.net",
        product: "Jira",
        appVersion: "1",
        status: "Out-of-date",
      },
    ]);

    const result = parseForgeInstallStatus(raw, "myhealthcaresite.atlassian.net");

    expect(result.found).toBe(true);
    expect(result.status).toBe("Out-of-date");
  });

  it("returns NOT_FOUND when the target site is absent", () => {
    const raw = JSON.stringify([
      {
        id: "7e844a39",
        environment: "development",
        site: "other.atlassian.net",
        product: "Jira",
        appVersion: "2",
        status: "Up-to-date",
      },
    ]);

    const result = parseForgeInstallStatus(raw, "myhealthcaresite.atlassian.net");

    expect(result).toEqual({ found: false, status: "NOT_FOUND", raw });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: CLI output contract
// ---------------------------------------------------------------------------

describe("CLI output contract", () => {
  it("reports manifest/install proof and leaves Rovo UI/API visibility pending", () => {
    const site = "myhealthcaresite.atlassian.net";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-forge-"));
    const fakeForge = path.join(tmpDir, "forge");
    const fakeJson = JSON.stringify([
      { id: "7e844a39", environment: "development", site, product: "Jira", majorVersion: "3 (Latest)", appVersion: "3", status: "Up-to-date" },
    ]);
    fs.writeFileSync(fakeForge, [
      "#!/bin/sh",
      "cat <<'EOF'",
      fakeJson,
      "EOF",
      "",
    ].join("\n"));
    fs.chmodSync(fakeForge, 0o755);

    try {
      const output = execFileSync(process.execPath, [
        path.resolve(__dirname, "../scripts/check-rovo-visibility.cjs"),
        "--site",
        site,
        "--expected",
        "19",
      ], {
        cwd: path.resolve(__dirname, ".."),
        env: {
          ...process.env,
          PATH: `${tmpDir}${path.delimiter}${process.env.PATH || ""}`,
        },
        encoding: "utf8",
      });

      expect(output).toContain("=== Rovo Manifest/Install Check ===");
      expect(output).toContain(`PASS: manifest declares 19 rovo:agent entries and Forge reports ${site} Up-to-date.`);
      expect(output).toContain("UI/API confirmation is pending for actual Rovo visibility.");
      expect(output).not.toMatch(/guaranteed visible/i);
      expect(output).not.toContain("=== Rovo Visibility Summary ===");
      expect(output).not.toContain("=== Rovo Agent Visibility Check ===");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
