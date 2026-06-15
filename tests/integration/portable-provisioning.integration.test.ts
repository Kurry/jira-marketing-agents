import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const { parseCsv, renderSeed, stringifyCsv } = require("../../scripts/render-seed.cjs") as {
  parseCsv: (text: string) => string[][];
  stringifyCsv: (rows: string[][]) => string;
  renderSeed: (config: {
    projectKey: string;
    seedLabel: string;
    seedTemplate: string;
    renderedSeedFile: string;
  }) => { targetPath: string; count: number };
};

const { selectProvisionConfig, buildChildEnv } = require("../../scripts/provision-all.cjs") as {
  selectProvisionConfig: (configPath: string, args: { site?: string | null; env?: string | null }) => Record<string, unknown>;
  buildChildEnv: (config: Record<string, unknown>, configPath: string) => Record<string, string>;
};

const { buildFilters } = require("../../scripts/provision-filters.cjs") as {
  buildFilters: (projectKey: string) => Array<{ jql: string }>;
};

const { dashboardUrl } = require("../../scripts/provision-dashboards.cjs") as {
  dashboardUrl: (site: string, dashboardId: string) => string;
};

// ---------------------------------------------------------------------------
// Suite 1: renderSeed — project key + label substitution
// ---------------------------------------------------------------------------

describe("portable Jira instance provisioning — renderSeed", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), "aigo-seed-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  function tmpFiles() {
    return { source: path.join(dir, "seed.csv"), target: path.join(dir, "rendered.csv") };
  }

  it("replaces projectKey and label for an arbitrary target site", () => {
    const { source, target } = tmpFiles();
    writeFileSync(source, [
      '"summary","projectKey","issueType","description","label"',
      '"Example","AIGO","Task","Original project should be replaced","aigo-seed"',
    ].join("\n"));

    const result = renderSeed({ projectKey: "CUST", seedLabel: "customer-seed", seedTemplate: source, renderedSeedFile: target });

    expect(result.count).toBe(1);
    const rows = parseCsv(readFileSync(target, "utf8"));
    expect(rows[1]).toEqual(["Example", "CUST", "Task", "Original project should be replaced", "customer-seed"]);
  });

  it("preserves header row unchanged", () => {
    const { source, target } = tmpFiles();
    writeFileSync(source, '"summary","projectKey","label"\n"A","AIGO","aigo-seed"\n');
    renderSeed({ projectKey: "X", seedLabel: "x-seed", seedTemplate: source, renderedSeedFile: target });
    const rows = parseCsv(readFileSync(target, "utf8"));
    expect(rows[0]).toEqual(["summary", "projectKey", "label"]);
  });

  it("renders all issue rows when template has multiple issues", () => {
    const { source, target } = tmpFiles();
    writeFileSync(source, [
      '"summary","projectKey","label"',
      '"Issue A","AIGO","aigo-seed"',
      '"Issue B","AIGO","aigo-seed"',
      '"Issue C","AIGO","aigo-seed"',
    ].join("\n"));
    const result = renderSeed({ projectKey: "NEW", seedLabel: "new-seed", seedTemplate: source, renderedSeedFile: target });
    expect(result.count).toBe(3);
    const rows = parseCsv(readFileSync(target, "utf8"));
    expect(rows.slice(1).every(r => r[1] === "NEW")).toBe(true);
    expect(rows.slice(1).every(r => r[2] === "new-seed")).toBe(true);
  });

  it("throws when seed template has no issue rows (header only)", () => {
    const { source, target } = tmpFiles();
    writeFileSync(source, '"summary","projectKey","label"\n');
    expect(() => renderSeed({ projectKey: "X", seedLabel: "x", seedTemplate: source, renderedSeedFile: target }))
      .toThrow(/no issue rows/i);
  });

  it("throws when projectKey column is missing", () => {
    const { source, target } = tmpFiles();
    writeFileSync(source, '"summary","label"\n"A","aigo-seed"\n');
    expect(() => renderSeed({ projectKey: "X", seedLabel: "x", seedTemplate: source, renderedSeedFile: target }))
      .toThrow(/missing projectKey/i);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: parseCsv — edge cases in the hand-rolled CSV parser
// ---------------------------------------------------------------------------

describe("render-seed parseCsv — edge cases", () => {
  it("parses simple unquoted fields", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n");
    expect(rows).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });

  it("parses quoted fields with embedded commas", () => {
    const rows = parseCsv('"hello, world","foo"\n');
    expect(rows[0]).toEqual(["hello, world", "foo"]);
  });

  it("parses quoted fields with escaped double-quotes (\"\") ", () => {
    const rows = parseCsv('"say ""hi""","ok"\n');
    expect(rows[0]).toEqual(['say "hi"', "ok"]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("skips blank lines", () => {
    const rows = parseCsv("a,b\n\n1,2\n");
    expect(rows.length).toBe(2);
  });

  it("handles a trailing newline without creating a spurious extra row", () => {
    const rows = parseCsv('"h1","h2"\n"v1","v2"\n');
    expect(rows.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: stringifyCsv — round-trip fidelity
// ---------------------------------------------------------------------------

describe("render-seed stringifyCsv — round-trip fidelity", () => {
  it("round-trips simple values through stringifyCsv + parseCsv", () => {
    const original = [["summary", "projectKey"], ["My issue", "AIGO"]];
    const csv = stringifyCsv(original);
    expect(parseCsv(csv)).toEqual(original);
  });

  it("escapes commas inside values", () => {
    const csv = stringifyCsv([["a,b", "c"]]);
    expect(csv).toContain('"a,b"');
    expect(parseCsv(csv)[0]).toEqual(["a,b", "c"]);
  });

  it("escapes embedded double-quotes", () => {
    const csv = stringifyCsv([['say "hi"']]);
    expect(parseCsv(csv)[0]).toEqual(['say "hi"']);
  });
});

describe("portable provisioning — selected instance propagation", () => {
  let dir: string;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "aigo-portable-config-"));
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const k of Object.keys(process.env)) {
      if (!(k in savedEnv)) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  function writeConfig(overrides: Record<string, unknown> = {}) {
    const configPath = path.join(dir, "instance.json");
    writeFileSync(configPath, JSON.stringify({
      site: "customer.atlassian.net",
      cloudId: "cloud-customer",
      projectId: "20000",
      forgeEnvironment: "development",
      projectKey: "CUST",
      projectName: "Customer Growth Ops",
      seedLabel: "customer-seed",
      ...overrides,
    }));
    return configPath;
  }

  it("provision-all child env carries selected config and CLI overrides", () => {
    const configPath = writeConfig();
    const selected = selectProvisionConfig(configPath, {
      site: "override.atlassian.net",
      env: "staging",
    });
    const env = buildChildEnv(selected, configPath);

    expect(env["AIGO_INSTANCE_CONFIG"]).toBe(configPath);
    expect(env["JIRA_SITE"]).toBe("override.atlassian.net");
    expect(env["AIGO_JIRA_SITE"]).toBe("override.atlassian.net");
    expect(env["AIGO_CLOUD_ID"]).toBe("cloud-customer");
    expect(env["AIGO_PROJECT_ID"]).toBe("20000");
    expect(env["AIGO_PROJECT_KEY"]).toBe("CUST");
    expect(env["FORGE_ENV"]).toBe("staging");
  });

  it("filter JQL is generated for the selected project key", () => {
    const filters = buildFilters("CUST");

    expect(filters.length).toBeGreaterThan(0);
    expect(filters.every((filter) => filter.jql.includes("project = CUST"))).toBe(true);
    expect(filters.every((filter) => !filter.jql.includes("project = AIGO"))).toBe(true);
  });

  it("dashboard evidence URLs use the configured site", () => {
    expect(dashboardUrl("https://customer.atlassian.net/wiki", "2001")).toBe(
      "https://customer.atlassian.net/jira/dashboards/2001",
    );
  });

  it("shared Jira client constants come from the configured instance", async () => {
    const configPath = writeConfig({ site: "client.atlassian.net", cloudId: "cloud-client" });
    process.env.AIGO_INSTANCE_CONFIG = configPath;

    const moduleUrl = `${pathToFileURL(path.resolve("scripts/lib/jira.mjs")).href}?portable=${Date.now()}`;
    const jira = await import(moduleUrl);

    expect(jira.SITE).toBe("https://client.atlassian.net");
    expect(jira.CLOUD_ID).toBe("cloud-client");
    expect(jira.CLOUD_API_HOST).toBe("https://api.atlassian.com/ex/jira/cloud-client");
  });
});
