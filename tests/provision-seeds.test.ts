import { describe, it, expect } from "vitest";

// Import pure functions from the CJS provisioning script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  validateSeedsConfig,
  parseCsv,
  splitCsvRow,
  mapCsvRow,
  diffSeeds,
  normalizeSummary,
} = require("../scripts/provision-seeds.cjs") as {
  validateSeedsConfig: (config: unknown) => string | null;
  parseCsv: (csvText: string) => Record<string, string>[];
  splitCsvRow: (line: string) => string[];
  mapCsvRow: (row: Record<string, string>) => {
    summary: string;
    issueTypeName: string;
    description: string;
    labels: string[];
  };
  diffSeeds: (
    existing: Array<{ key: string; summary: string; issueTypeName: string }>,
    desired: Array<{ summary: string; issueTypeName: string }>
  ) => {
    toCreate: Array<{ summary: string; issueTypeName: string }>;
    toRetype: Array<{ key: string; oldType: string; newType: string; seed: object }>;
    toSkip: Array<{ key: string; seed: object }>;
  };
  normalizeSummary: (s: string) => string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidSeedsConfig(overrides: Record<string, unknown> = {}) {
  return {
    projectKey: "AIGO",
    seedLabel: "aigo-seed",
    cloudId: "76683cc1-6501-400f-8b59-01eaad4418d2",
    projectId: "10000",
    site: "example.atlassian.net",
    jiraConfig: {
      issueTypes: [
        { name: "Experiment", description: "An experiment.", type: "standard" },
        { name: "Creative Request", description: "A creative request.", type: "standard" },
        { name: "Employer Launch", description: "An employer launch.", type: "standard" },
      ],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateSeedsConfig: passing cases
// ---------------------------------------------------------------------------

describe("validateSeedsConfig — valid config", () => {
  it("returns null for a fully valid config", () => {
    expect(validateSeedsConfig(makeValidSeedsConfig())).toBeNull();
  });

  it("accepts config with extra fields", () => {
    expect(validateSeedsConfig(makeValidSeedsConfig({ extraField: "value" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateSeedsConfig: failing cases
// ---------------------------------------------------------------------------

describe("validateSeedsConfig — invalid config", () => {
  it("returns error for null config", () => {
    expect(validateSeedsConfig(null)).toMatch(/JSON object/);
  });

  it("returns error for non-object config", () => {
    expect(validateSeedsConfig("string")).toMatch(/JSON object/);
  });

  it("returns error when projectKey is missing", () => {
    const cfg = makeValidSeedsConfig();
    delete (cfg as Record<string, unknown>).projectKey;
    expect(validateSeedsConfig(cfg)).toMatch(/projectKey/);
  });

  it("returns error when seedLabel is missing", () => {
    const cfg = makeValidSeedsConfig();
    delete (cfg as Record<string, unknown>).seedLabel;
    expect(validateSeedsConfig(cfg)).toMatch(/seedLabel/);
  });

  it("returns error when cloudId is missing", () => {
    const cfg = makeValidSeedsConfig();
    delete (cfg as Record<string, unknown>).cloudId;
    expect(validateSeedsConfig(cfg)).toMatch(/cloudId/);
  });

  it("returns error when projectId is missing", () => {
    const cfg = makeValidSeedsConfig();
    delete (cfg as Record<string, unknown>).projectId;
    expect(validateSeedsConfig(cfg)).toMatch(/projectId/);
  });

  it("returns error when jiraConfig is missing", () => {
    const cfg = makeValidSeedsConfig();
    delete (cfg as Record<string, unknown>).jiraConfig;
    expect(validateSeedsConfig(cfg)).toMatch(/jiraConfig/);
  });

  it("returns error when jiraConfig.issueTypes is not an array", () => {
    expect(validateSeedsConfig(makeValidSeedsConfig({
      jiraConfig: { issueTypes: "not-array" },
    }))).toMatch(/issueTypes/);
  });
});

// ---------------------------------------------------------------------------
// splitCsvRow
// ---------------------------------------------------------------------------

describe("splitCsvRow", () => {
  it("splits simple comma-separated values", () => {
    expect(splitCsvRow("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields containing commas", () => {
    expect(splitCsvRow('"hello, world",foo,bar')).toEqual(["hello, world", "foo", "bar"]);
  });

  it("handles escaped double-quotes within quoted fields", () => {
    expect(splitCsvRow('"say ""hi""",next')).toEqual(['say "hi"', "next"]);
  });

  it("handles empty fields", () => {
    expect(splitCsvRow("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles a single field", () => {
    expect(splitCsvRow("only")).toEqual(["only"]);
  });

  it("handles trailing comma", () => {
    // Trailing comma adds an empty field
    expect(splitCsvRow("a,b,")).toEqual(["a", "b", ""]);
  });
});

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses a simple CSV with header", () => {
    const csv = `summary,issueType,description,label
"Hello world","Experiment","A description","aigo-seed"`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe("Hello world");
    expect(rows[0].issueType).toBe("Experiment");
    expect(rows[0].description).toBe("A description");
    expect(rows[0].label).toBe("aigo-seed");
  });

  it("skips blank lines", () => {
    const csv = `summary,issueType\nfoo,Task\n\nbar,Task\n`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("returns empty array for header-only CSV", () => {
    const csv = "summary,issueType,description,label\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles multi-line quoted description field", () => {
    const csv = `summary,description\n"Title","Line one\nLine two"`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toContain("Line one");
  });

  it("parses the real seed CSV columns correctly", () => {
    // Simulate a row from aigo-seed-issues.csv
    const csv = `"summary","projectKey","issueType","description","label"
"[Experiment] Email subject line test to lift signup conversion rate","AIGO","Task","AIGO seed issue.","aigo-seed"`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe("[Experiment] Email subject line test to lift signup conversion rate");
    expect(rows[0].projectKey).toBe("AIGO");
    expect(rows[0].issueType).toBe("Task");
    expect(rows[0].label).toBe("aigo-seed");
  });
});

// ---------------------------------------------------------------------------
// mapCsvRow
// ---------------------------------------------------------------------------

describe("mapCsvRow", () => {
  it("maps all fields correctly", () => {
    const row = { summary: "A test", issueType: "Experiment", description: "Desc", label: "aigo-seed" };
    const mapped = mapCsvRow(row);
    expect(mapped.summary).toBe("A test");
    expect(mapped.issueTypeName).toBe("Experiment");
    expect(mapped.description).toBe("Desc");
    expect(mapped.labels).toEqual(["aigo-seed"]);
  });

  it("falls back to issueTypeName column when issueType absent", () => {
    const row = { summary: "A", issueTypeName: "Creative Request", description: "", label: "" };
    expect(mapCsvRow(row).issueTypeName).toBe("Creative Request");
  });

  it("defaults issueTypeName to Task when both columns absent", () => {
    const row = { summary: "A", description: "" };
    expect(mapCsvRow(row).issueTypeName).toBe("Task");
  });

  it("returns empty labels array when label column is empty", () => {
    const row = { summary: "A", issueType: "Task", description: "", label: "" };
    expect(mapCsvRow(row).labels).toEqual([]);
  });

  it("splits semicolon-separated labels from labels column", () => {
    const row = { summary: "A", issueType: "Task", description: "", labels: "aigo-seed;other" };
    expect(mapCsvRow(row).labels).toEqual(["aigo-seed", "other"]);
  });
});

// ---------------------------------------------------------------------------
// normalizeSummary
// ---------------------------------------------------------------------------

describe("normalizeSummary", () => {
  it("lowercases and trims", () => {
    expect(normalizeSummary("  Hello World  ")).toBe("hello world");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeSummary("hello   world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(normalizeSummary("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    // The function casts with (s || "") so should not throw
    expect(() => normalizeSummary(null as unknown as string)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// diffSeeds — idempotency logic
// ---------------------------------------------------------------------------

describe("diffSeeds — idempotency diff", () => {
  const existing = [
    { key: "AIGO-1", summary: "Experiment email test", issueTypeName: "Task" },
    { key: "AIGO-2", summary: "Creative Request: diabetes SMS", issueTypeName: "Creative Request" },
    { key: "AIGO-3", summary: "Employer launch Acme", issueTypeName: "Employer Launch" },
  ];

  const desired = [
    { summary: "Experiment email test", issueTypeName: "Experiment" },         // exists but wrong type → retype
    { summary: "Creative Request: diabetes SMS", issueTypeName: "Creative Request" }, // exists + correct → skip
    { summary: "Brand new seed", issueTypeName: "Research Brief" },             // missing → create
  ];

  it("identifies items to create (not in existing)", () => {
    const { toCreate } = diffSeeds(existing, desired);
    expect(toCreate).toHaveLength(1);
    expect(toCreate[0].summary).toBe("Brand new seed");
  });

  it("identifies items to retype (exists but wrong type)", () => {
    const { toRetype } = diffSeeds(existing, desired);
    expect(toRetype).toHaveLength(1);
    expect(toRetype[0].key).toBe("AIGO-1");
    expect(toRetype[0].oldType).toBe("Task");
    expect(toRetype[0].newType).toBe("Experiment");
  });

  it("identifies items to skip (exists with correct type)", () => {
    const { toSkip } = diffSeeds(existing, desired);
    expect(toSkip).toHaveLength(1);
    expect(toSkip[0].key).toBe("AIGO-2");
  });

  it("case-insensitive and whitespace-tolerant summary matching", () => {
    const existingCased = [
      { key: "AIGO-5", summary: "  EXPERIMENT EMAIL TEST  ", issueTypeName: "Experiment" },
    ];
    const desiredCased = [{ summary: "experiment email test", issueTypeName: "Experiment" }];
    const { toSkip, toCreate, toRetype } = diffSeeds(existingCased, desiredCased);
    expect(toSkip).toHaveLength(1);
    expect(toCreate).toHaveLength(0);
    expect(toRetype).toHaveLength(0);
  });

  it("returns all as toCreate when existing is empty", () => {
    const { toCreate, toRetype, toSkip } = diffSeeds([], desired);
    expect(toCreate).toHaveLength(desired.length);
    expect(toRetype).toHaveLength(0);
    expect(toSkip).toHaveLength(0);
  });

  it("returns all as toSkip when desired matches existing perfectly", () => {
    const perfectDesired = existing.map((e) => ({
      summary: e.summary,
      issueTypeName: e.issueTypeName,
    }));
    const { toCreate, toRetype, toSkip } = diffSeeds(existing, perfectDesired);
    expect(toCreate).toHaveLength(0);
    expect(toRetype).toHaveLength(0);
    expect(toSkip).toHaveLength(existing.length);
  });

  it("handles empty desired (nothing to do)", () => {
    const { toCreate, toRetype, toSkip } = diffSeeds(existing, []);
    expect(toCreate).toHaveLength(0);
    expect(toRetype).toHaveLength(0);
    expect(toSkip).toHaveLength(0);
  });

  it("handles multiple retype candidates", () => {
    const existingMulti = [
      { key: "AIGO-1", summary: "Issue A", issueTypeName: "Task" },
      { key: "AIGO-2", summary: "Issue B", issueTypeName: "Task" },
    ];
    const desiredMulti = [
      { summary: "Issue A", issueTypeName: "Experiment" },
      { summary: "Issue B", issueTypeName: "Creative Request" },
    ];
    const { toRetype } = diffSeeds(existingMulti, desiredMulti);
    expect(toRetype).toHaveLength(2);
    const keys = toRetype.map((r) => r.key);
    expect(keys).toContain("AIGO-1");
    expect(keys).toContain("AIGO-2");
  });
});
