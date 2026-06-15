import { describe, it, expect } from "vitest";

// Import pure functions from the CJS automation provisioning script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  validateRule,
  extractRules,
  filterNewRules,
} = require("../scripts/provision-automation.cjs") as {
  validateRule: (rule: unknown) => string | null;
  extractRules: (
    parsed: unknown,
    filename: string
  ) => { rules: object[]; error: string | null };
  filterNewRules: (existingNames: Set<string>, desiredRules: object[]) => object[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    name: "AIGO – Intake Triage",
    state: "DISABLED",
    description: "Test rule",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateRule
// ---------------------------------------------------------------------------

describe("validateRule — valid rules", () => {
  it("returns null for a valid DISABLED rule", () => {
    expect(validateRule(makeRule())).toBeNull();
  });

  it("accepts any extra fields on the rule object", () => {
    expect(validateRule(makeRule({ trigger: { type: "created" }, components: [] }))).toBeNull();
  });
});

describe("validateRule — invalid rules (dry-run catches these)", () => {
  it("returns error for null input", () => {
    expect(validateRule(null)).toMatch(/JSON object/);
  });

  it("returns error for non-object input", () => {
    expect(validateRule("string")).toMatch(/JSON object/);
  });

  it("returns error when name is missing", () => {
    const rule = makeRule();
    delete (rule as Record<string, unknown>).name;
    expect(validateRule(rule)).toMatch(/name/);
  });

  it("returns error when name is empty string", () => {
    expect(validateRule(makeRule({ name: "" }))).toMatch(/name/);
  });

  it("returns error when name is not a string", () => {
    expect(validateRule(makeRule({ name: 42 }))).toMatch(/name/);
  });

  it("returns error when state is ENABLED", () => {
    expect(validateRule(makeRule({ state: "ENABLED" }))).toMatch(/DISABLED/);
  });

  it("returns error when state is missing", () => {
    const rule = makeRule();
    delete (rule as Record<string, unknown>).state;
    expect(validateRule(rule)).toMatch(/DISABLED/);
  });

  it("returns error when state is null", () => {
    expect(validateRule(makeRule({ state: null }))).toMatch(/DISABLED/);
  });

  it("includes the rule name in the error message", () => {
    const err = validateRule(makeRule({ state: "ENABLED" }));
    expect(err).toContain("AIGO – Intake Triage");
  });
});

// ---------------------------------------------------------------------------
// extractRules
// ---------------------------------------------------------------------------

describe("extractRules — {version, rules: [...]} wrapper format", () => {
  it("extracts rules from {version, rules:[...]} format", () => {
    const parsed = {
      version: 1,
      rules: [makeRule(), makeRule({ name: "Rule 2" })],
    };
    const { rules, error } = extractRules(parsed, "test.json");
    expect(error).toBeNull();
    expect(rules).toHaveLength(2);
  });

  it("extracts single rule from bare rule object", () => {
    const parsed = makeRule();
    const { rules, error } = extractRules(parsed, "test.json");
    expect(error).toBeNull();
    expect(rules).toHaveLength(1);
  });

  it("extracts rules from an array", () => {
    const parsed = [makeRule(), makeRule({ name: "Rule 2" })];
    const { rules, error } = extractRules(parsed, "test.json");
    expect(error).toBeNull();
    expect(rules).toHaveLength(2);
  });

  it("returns error for unrecognized format", () => {
    const { rules, error } = extractRules({ version: 1, data: "something" }, "bad.json");
    expect(error).toMatch(/cannot extract rules/);
    expect(rules).toHaveLength(0);
  });

  it("handles empty rules array", () => {
    const { rules, error } = extractRules({ version: 1, rules: [] }, "empty.json");
    expect(error).toBeNull();
    expect(rules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterNewRules — idempotency logic
// ---------------------------------------------------------------------------

describe("filterNewRules — rule name deduplication", () => {
  const existingNames = new Set([
    "AIGO – Intake Triage",
    "AIGO – Creative Claims",
  ]);

  const desired = [
    makeRule({ name: "AIGO – Intake Triage" }),        // already exists → skip
    makeRule({ name: "AIGO – Creative Claims" }),        // already exists → skip
    makeRule({ name: "AIGO – Experiment Spec" }),        // new → include
    makeRule({ name: "AIGO – Employer Launch" }),         // new → include
    makeRule({ name: "AIGO – Weekly Readout" }),          // new → include
  ];

  it("filters out rules whose name already exists", () => {
    const newRules = filterNewRules(existingNames, desired);
    expect(newRules).toHaveLength(3);
  });

  it("returns only rules with names not in existingNames", () => {
    const newRules = filterNewRules(existingNames, desired) as Array<{ name: string }>;
    const names = newRules.map((r) => r.name);
    expect(names).not.toContain("AIGO – Intake Triage");
    expect(names).not.toContain("AIGO – Creative Claims");
    expect(names).toContain("AIGO – Experiment Spec");
    expect(names).toContain("AIGO – Employer Launch");
    expect(names).toContain("AIGO – Weekly Readout");
  });

  it("returns all desired rules when existingNames is empty", () => {
    const newRules = filterNewRules(new Set(), desired);
    expect(newRules).toHaveLength(desired.length);
  });

  it("returns empty array when all rules already exist", () => {
    const allExisting = new Set(desired.map((r) => (r as { name: string }).name));
    const newRules = filterNewRules(allExisting, desired);
    expect(newRules).toHaveLength(0);
  });

  it("is case-sensitive (different casing = different rule name)", () => {
    const casedExisting = new Set(["aigo – intake triage"]);
    // "AIGO – Intake Triage" is NOT in the set → should not be filtered
    const newRules = filterNewRules(casedExisting, [makeRule()]);
    expect(newRules).toHaveLength(1);
  });

  it("handles empty desired array", () => {
    const newRules = filterNewRules(existingNames, []);
    expect(newRules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Dry-run scenario: all rendered rules must be DISABLED
// ---------------------------------------------------------------------------

describe("dry-run: all rendered rules must have state DISABLED", () => {
  const renderedRules = [
    { name: "AIGO – Intake Triage", state: "DISABLED" },
    { name: "AIGO – Creative Claims", state: "DISABLED" },
    { name: "AIGO – Experiment Spec", state: "DISABLED" },
    { name: "AIGO – Employer Launch", state: "DISABLED" },
    { name: "AIGO – Weekly Readout", state: "DISABLED" },
  ];

  it("passes validation for all DISABLED rules", () => {
    for (const rule of renderedRules) {
      expect(validateRule(rule)).toBeNull();
    }
  });

  it("catches a single ENABLED rule mixed in", () => {
    const mixed = [
      ...renderedRules,
      { name: "AIGO – Rogue Rule", state: "ENABLED" },
    ];
    const errors = mixed.map(validateRule).filter(Boolean);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Rogue Rule/);
  });

  it("catches undefined state", () => {
    const rule = { name: "AIGO – No State" };
    expect(validateRule(rule)).toMatch(/DISABLED/);
  });
});

// ---------------------------------------------------------------------------
// Rendered file format round-trip
// ---------------------------------------------------------------------------

describe("extractRules — rendered file format from render-automation-rules.cjs", () => {
  // The rendered files have format: { version: 1, rules: [...] }
  it("correctly extracts all rules from a multi-rule rendered file", () => {
    const rendered = {
      version: 1,
      rules: [
        { name: "AIGO – Intake Triage", state: "DISABLED", trigger: {}, components: [] },
        { name: "AIGO – Creative Claims", state: "DISABLED", trigger: {}, components: [] },
      ],
    };
    const { rules, error } = extractRules(rendered, "aigo-automation-ruleset.json");
    expect(error).toBeNull();
    expect(rules).toHaveLength(2);
  });

  it("all extracted rules from rendered files pass validateRule", () => {
    const rendered = {
      version: 1,
      rules: [
        { name: "AIGO – Intake Triage", state: "DISABLED" },
        { name: "AIGO – Experiment Spec", state: "DISABLED" },
        { name: "AIGO – Employer Launch", state: "DISABLED" },
        { name: "AIGO – Creative Claims", state: "DISABLED" },
        { name: "AIGO – Weekly Readout", state: "DISABLED" },
      ],
    };
    const { rules } = extractRules(rendered, "ruleset.json");
    for (const rule of rules) {
      expect(validateRule(rule)).toBeNull();
    }
  });
});
