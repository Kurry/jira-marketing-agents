import { describe, it, expect } from "vitest";

// Import pure functions from the CJS provisioning script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateConfig, diffItems } = require("../scripts/provision-jira.cjs") as {
  validateConfig: (config: unknown) => string | null;
  diffItems: <T>(existing: T[], desired: T[], keyFn: (item: T) => string) => T[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidConfig(overrides: Record<string, unknown> = {}) {
  return {
    site: "example.atlassian.net",
    cloudId: "76683cc1-6501-400f-8b59-01eaad4418d2",
    projectId: "10000",
    jiraConfig: {
      issueTypes: [
        { name: "AI Growth Request", description: "General intake issue.", type: "standard" },
      ],
      customFields: [
        {
          name: "Claims Risk",
          type: "com.atlassian.jira.plugin.system.customfieldtypes:select",
          searcherKey: "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher",
          description: "AIGO: Claims risk level.",
          forgeVar: "CLAIMS_RISK_FIELD_ID",
        },
      ],
      workflowStatuses: [
        { name: "Intake", statusCategory: "TODO" },
      ],
      fieldOptions: {
        "Claims Risk": ["Low", "Medium", "High", "Prohibited"],
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateConfig: passing cases
// ---------------------------------------------------------------------------

describe("validateConfig — valid config", () => {
  it("returns null for a fully valid config", () => {
    const config = makeValidConfig();
    expect(validateConfig(config)).toBeNull();
  });

  it("accepts config without optional fieldOptions key", () => {
    const config = makeValidConfig();
    // @ts-expect-error — deleting optional key for test
    delete (config as Record<string, unknown>).jiraConfig.fieldOptions;
    expect(validateConfig(config)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateConfig: failing cases
// ---------------------------------------------------------------------------

describe("validateConfig — missing cloudId", () => {
  it("returns an error when cloudId is absent", () => {
    const config = makeValidConfig({ cloudId: undefined });
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/cloudId/);
  });

  it("returns an error when cloudId is empty string", () => {
    const config = makeValidConfig({ cloudId: "" });
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/cloudId/);
  });
});

describe("validateConfig — missing projectId", () => {
  it("returns an error when projectId is absent", () => {
    const config = makeValidConfig({ projectId: undefined });
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/projectId/);
  });

  it("returns an error when projectId is empty string", () => {
    const config = makeValidConfig({ projectId: "" });
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/projectId/);
  });
});

describe("validateConfig — missing jiraConfig", () => {
  it("returns an error when jiraConfig is absent", () => {
    const config = makeValidConfig({ jiraConfig: undefined });
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/jiraConfig/);
  });
});

describe("validateConfig — customField missing forgeVar", () => {
  it("returns an error when a customField is missing forgeVar", () => {
    const config = makeValidConfig();
    // @ts-expect-error — intentionally removing required field
    config.jiraConfig.customFields[0] = {
      name: "Bad Field",
      type: "com.atlassian.jira.plugin.system.customfieldtypes:select",
      searcherKey: "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher",
      description: "Missing forgeVar",
      // forgeVar intentionally omitted
    };
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/forgeVar/);
  });
});

describe("validateConfig — issueType missing required fields", () => {
  it("returns an error when an issueType is missing description", () => {
    const config = makeValidConfig();
    // @ts-expect-error — intentionally removing required field
    config.jiraConfig.issueTypes[0] = { name: "No Description", type: "standard" };
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/description/);
  });

  it("returns an error when an issueType is missing type", () => {
    const config = makeValidConfig();
    // @ts-expect-error — intentionally removing required field
    config.jiraConfig.issueTypes[0] = { name: "No Type", description: "Has description" };
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/type/);
  });
});

describe("validateConfig — workflowStatus missing statusCategory", () => {
  it("returns an error when a workflowStatus is missing statusCategory", () => {
    const config = makeValidConfig();
    // @ts-expect-error — intentionally removing required field
    config.jiraConfig.workflowStatuses[0] = { name: "No Category" };
    const err = validateConfig(config);
    expect(err).not.toBeNull();
    expect(err).toMatch(/statusCategory/);
  });
});

// ---------------------------------------------------------------------------
// diffItems: idempotency logic
// ---------------------------------------------------------------------------

describe("diffItems — idempotency", () => {
  const keyFn = (item: { name: string }) => item.name;

  it("returns all desired items when existing list is empty", () => {
    const desired = [{ name: "A" }, { name: "B" }, { name: "C" }];
    const result = diffItems([], desired, keyFn);
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.name)).toEqual(["A", "B", "C"]);
  });

  it("returns empty array when all desired items already exist", () => {
    const existing = [{ name: "A" }, { name: "B" }];
    const desired = [{ name: "A" }, { name: "B" }];
    const result = diffItems(existing, desired, keyFn);
    expect(result).toHaveLength(0);
  });

  it("returns only the missing items", () => {
    const existing = [{ name: "A" }, { name: "C" }];
    const desired = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    const result = diffItems(existing, desired, keyFn);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(["B", "D"]);
  });

  it("is not affected by extra fields on existing items", () => {
    const existing = [{ name: "A", id: "100", extraField: true }];
    const desired = [{ name: "A" }, { name: "B" }];
    const result = diffItems(existing, desired, keyFn);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("B");
  });

  it("handles numeric key function", () => {
    const numKey = (item: { id: number }) => String(item.id);
    const existing = [{ id: 1 }, { id: 3 }];
    const desired = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = diffItems(existing, desired, numKey);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual([2, 4]);
  });

  it("treats items as missing when existing list has different casing", () => {
    // Key matching is case-sensitive — "intake" vs "Intake" are different
    const existing = [{ name: "intake" }];
    const desired = [{ name: "Intake" }];
    const result = diffItems(existing, desired, keyFn);
    expect(result).toHaveLength(1);
  });
});
