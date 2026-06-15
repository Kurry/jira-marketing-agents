/**
 * tests/forge-lib.test.ts
 *
 * Unit tests for scripts/lib/forge.mjs — the shared Forge CLI wrapper.
 * Covers parseInstallListJson (the `forge install list --json` parser) and the
 * parseInstallList back-compat shim. No live Forge CLI calls are made.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const FORGE_MJS = pathToFileURL(path.resolve("scripts/lib/forge.mjs")).href;

type Row = {
  installationId: string;
  environment: string;
  site: string;
  apps: string;
  version: string;
  status: string;
};

type ForgeLib = {
  parseInstallListJson: (s: string) => Row[];
  parseInstallList: (s: string) => Row[];
  findStagingInstall: (rows: Row[]) => Row | null;
  classifyStatus: (row: Row | null) => string;
  hasProductionInstall: (rows: Row[]) => boolean;
};

async function loadForge(): Promise<ForgeLib> {
  return (await import(`${FORGE_MJS}?t=${Date.now()}`)) as ForgeLib;
}

const SAMPLE = JSON.stringify([
  {
    id: "7e844a39-2e55-418f-93ad-7ae4dc8d9695",
    environment: "development",
    site: "myhealthcaresite.atlassian.net",
    product: "Jira",
    majorVersion: "3 (Latest)",
    appVersion: "3",
    status: "Up-to-date",
  },
]);

describe("parseInstallListJson", () => {
  it("normalizes the documented --json shape to the internal row shape", async () => {
    const { parseInstallListJson } = await loadForge();
    const rows = parseInstallListJson(SAMPLE);
    expect(rows).toEqual([
      {
        installationId: "7e844a39-2e55-418f-93ad-7ae4dc8d9695",
        environment: "development",
        site: "myhealthcaresite.atlassian.net",
        apps: "Jira",
        version: "3",
        status: "Up-to-date",
      },
    ]);
  });

  it("tolerates leading non-JSON noise before the array", async () => {
    const { parseInstallListJson } = await loadForge();
    const noisy = "Warning: Forge CLI supports Node.js 22.x or 24.x.\n" + SAMPLE;
    const rows = parseInstallListJson(noisy);
    expect(rows).toHaveLength(1);
    expect(rows[0].site).toBe("myhealthcaresite.atlassian.net");
  });

  it("returns [] when no array is present", async () => {
    const { parseInstallListJson } = await loadForge();
    expect(parseInstallListJson("not authenticated")).toEqual([]);
  });
});

describe("parseInstallList back-compat shim", () => {
  it("delegates to the JSON parser", async () => {
    const { parseInstallList, parseInstallListJson } = await loadForge();
    expect(parseInstallList(SAMPLE)).toEqual(parseInstallListJson(SAMPLE));
  });
});

describe("findStagingInstall / classifyStatus / hasProductionInstall", () => {
  it("selects the development staging row and classifies it Up-to-date", async () => {
    const { parseInstallListJson, findStagingInstall, classifyStatus } = await loadForge();
    const rows = parseInstallListJson(SAMPLE);
    const row = findStagingInstall(rows);
    expect(row?.site).toBe("myhealthcaresite.atlassian.net");
    expect(classifyStatus(row)).toBe("Up-to-date");
  });

  it("classifies a missing row as not-installed", async () => {
    const { classifyStatus } = await loadForge();
    expect(classifyStatus(null)).toBe("not-installed");
  });

  it("detects a production install", async () => {
    const { parseInstallListJson, hasProductionInstall } = await loadForge();
    const rows = parseInstallListJson(
      JSON.stringify([
        { id: "a", environment: "production", site: "x.atlassian.net", product: "Jira", appVersion: "3", status: "Up-to-date" },
      ]),
    );
    expect(hasProductionInstall(rows)).toBe(true);
  });
});
