/**
 * tests/instance-config.test.ts
 *
 * Unit tests for scripts/instance-config.cjs — loadInstanceConfig and envForConfig.
 * These functions are the shared foundation used by every provision script.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadInstanceConfig, envForConfig } = require("../scripts/instance-config.cjs") as {
  loadInstanceConfig: (file?: string) => Record<string, unknown>;
  envForConfig: (config: Record<string, unknown>) => Record<string, string>;
};

// Snapshot and restore env around each test so mutations don't bleed across tests.
let savedEnv: NodeJS.ProcessEnv;
beforeEach(() => { savedEnv = { ...process.env }; });
afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in savedEnv)) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// ---------------------------------------------------------------------------
// loadInstanceConfig — defaults
// ---------------------------------------------------------------------------

describe("loadInstanceConfig — defaults", () => {
  beforeEach(() => {
    // Clear all AIGO_* env vars so we get clean defaults
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("AIGO_") || k === "JIRA_SITE" || k === "FORGE_ENV") {
        delete process.env[k];
      }
    }
  });

  it("returns projectKey=AIGO when no config or env override", () => {
    const cfg = loadInstanceConfig();
    expect(cfg.projectKey).toBe("AIGO");
  });

  it("returns forgeEnvironment=development by default", () => {
    const cfg = loadInstanceConfig();
    expect(cfg.forgeEnvironment).toBe("development");
  });

  it("returns minSeedCount as a number (not a string)", () => {
    const cfg = loadInstanceConfig();
    expect(typeof cfg.minSeedCount).toBe("number");
    expect(cfg.minSeedCount).toBe(15);
  });

  it("auto-derives renderedSeedFile from projectKey when not set", () => {
    const cfg = loadInstanceConfig();
    expect(String(cfg.renderedSeedFile)).toContain("AIGO");
    expect(String(cfg.renderedSeedFile)).toMatch(/\.csv$/);
  });
});

// ---------------------------------------------------------------------------
// loadInstanceConfig — file merge and normalization
// ---------------------------------------------------------------------------

describe("loadInstanceConfig — file merge and normalization", () => {
  let tmpFile: string;

  afterEach(() => { if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); });

  function writeTmp(obj: Record<string, unknown>): string {
    tmpFile = path.join(os.tmpdir(), `ic-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(obj));
    return tmpFile;
  }

  it("loads projectKey from file and uppercases it", () => {
    const cfg = loadInstanceConfig(writeTmp({ projectKey: "myproj" }));
    expect(cfg.projectKey).toBe("MYPROJ");
  });

  it("file values override defaults", () => {
    const cfg = loadInstanceConfig(writeTmp({ seedLabel: "my-seed", minSeedCount: 5 }));
    expect(cfg.seedLabel).toBe("my-seed");
    expect(cfg.minSeedCount).toBe(5);
  });

  it("auto-derives renderedSeedFile from file projectKey when renderedSeedFile not specified", () => {
    const cfg = loadInstanceConfig(writeTmp({ projectKey: "CUST" }));
    expect(String(cfg.renderedSeedFile)).toContain("CUST");
  });

  it("respects explicit renderedSeedFile from file", () => {
    const cfg = loadInstanceConfig(writeTmp({ renderedSeedFile: "/custom/path.csv" }));
    expect(cfg.renderedSeedFile).toBe("/custom/path.csv");
  });

  it("coerces minSeedCount to integer even when file provides a string", () => {
    const cfg = loadInstanceConfig(writeTmp({ minSeedCount: "20" }));
    expect(typeof cfg.minSeedCount).toBe("number");
    expect(cfg.minSeedCount).toBe(20);
  });

  it("trims whitespace from projectKey, seedLabel, and site", () => {
    const cfg = loadInstanceConfig(writeTmp({ projectKey: "  TRIM  ", seedLabel: " s ", site: " example.atlassian.net " }));
    expect(cfg.projectKey).toBe("TRIM");
    expect(cfg.seedLabel).toBe("s");
    expect(cfg.site).toBe("example.atlassian.net");
  });

  it("loads cloudId from the example config file", () => {
    const cfg = loadInstanceConfig(path.resolve("instances/aigo.example.json"));
    expect(typeof cfg.cloudId).toBe("string");
    expect(String(cfg.cloudId).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// envForConfig — environment variable mapping
// ---------------------------------------------------------------------------

describe("envForConfig — env var mapping", () => {
  it("maps site to JIRA_SITE and AIGO_JIRA_SITE", () => {
    const env = envForConfig({ site: "mysite.atlassian.net", projectKey: "P", seedLabel: "s", minSeedCount: 10, renderedSeedFile: "f.csv", forgeEnvironment: "development" });
    expect(env["JIRA_SITE"]).toBe("mysite.atlassian.net");
    expect(env["AIGO_JIRA_SITE"]).toBe("mysite.atlassian.net");
  });

  it("maps projectKey to AIGO_PROJECT_KEY", () => {
    const env = envForConfig({ site: "", projectKey: "AIGO", seedLabel: "s", minSeedCount: 15, renderedSeedFile: "f.csv", forgeEnvironment: "development" });
    expect(env["AIGO_PROJECT_KEY"]).toBe("AIGO");
  });

  it("maps forgeEnvironment to both AIGO_FORGE_ENV and FORGE_ENV", () => {
    const env = envForConfig({ site: "", projectKey: "P", seedLabel: "s", minSeedCount: 15, renderedSeedFile: "f.csv", forgeEnvironment: "staging" });
    expect(env["AIGO_FORGE_ENV"]).toBe("staging");
    expect(env["FORGE_ENV"]).toBe("staging");
  });

  it("stringifies minSeedCount in the env output", () => {
    const env = envForConfig({ site: "", projectKey: "P", seedLabel: "s", minSeedCount: 7, renderedSeedFile: "f.csv", forgeEnvironment: "development" });
    expect(env["AIGO_MIN_SEED_COUNT"]).toBe("7");
  });

  it("includes all existing process.env keys (pass-through)", () => {
    process.env["_AIGO_TEST_PASSTHROUGH"] = "yes";
    const env = envForConfig({ site: "", projectKey: "P", seedLabel: "s", minSeedCount: 15, renderedSeedFile: "f.csv", forgeEnvironment: "development" });
    expect(env["_AIGO_TEST_PASSTHROUGH"]).toBe("yes");
    delete process.env["_AIGO_TEST_PASSTHROUGH"];
  });
});
