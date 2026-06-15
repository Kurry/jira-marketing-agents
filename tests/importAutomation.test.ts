/**
 * tests/importAutomation.test.ts
 *
 * Unit tests for the importAutomationRules handler in src/index.ts.
 * The Forge API (@forge/api) is mocked so no live Jira or Forge runtime is needed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @forge/api before importing src/index so the handler never calls Forge.
// ---------------------------------------------------------------------------
const mockRequestJira = vi.fn();
vi.mock("@forge/api", () => ({
  default: {
    asApp: () => ({ requestJira: mockRequestJira }),
  },
  route: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.raw.reduce((acc, s, i) => acc + s + (values[i] ?? ""), ""),
}));

// Also mock src/jira so getIssueContext / searchIssues don't run.
vi.mock("../src/jira", () => ({
  addComment: vi.fn(),
  getIssueContext: vi.fn(),
  searchIssues: vi.fn(),
}));

import { importAutomationRules } from "../src/index";

type ImportResult = {
  imported: number;
  failed: number;
  results: Array<{ name: string; status: number; body: unknown }>;
  errors?: Array<{ name: string; status: number; body: unknown }>;
};

const CLOUD_ID = "test-cloud-abc";

function makeRule(name: string, state = "DISABLED") {
  return { name, state, trigger: {}, components: [] };
}

function fakeResp(status: number, body: unknown = {}) {
  return { status, json: vi.fn().mockResolvedValue(body) };
}

describe("importAutomationRules — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when cloudId is missing", async () => {
    await expect(importAutomationRules({ rules: [makeRule("r1")] })).rejects.toThrow("cloudId is required");
  });

  it("throws when rules is not an array", async () => {
    await expect(importAutomationRules({ cloudId: CLOUD_ID, rules: "bad" })).rejects.toThrow(
      "rules array is required",
    );
  });

  it("throws when rules array is empty", async () => {
    await expect(importAutomationRules({ cloudId: CLOUD_ID, rules: [] })).rejects.toThrow(
      "rules array is required",
    );
  });
});

describe("importAutomationRules — dry-run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns without calling requestJira when dryRun=true", async () => {
    const result = await importAutomationRules({
      cloudId: CLOUD_ID,
      rules: [makeRule("r1"), makeRule("r2")],
      dryRun: true,
    });

    expect(mockRequestJira).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.ruleCount).toBe(2);
    expect(result.message).toMatch(/dry run/i);
  });
});

describe("importAutomationRules — state enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always sends state=DISABLED even when rule has state=ENABLED", async () => {
    mockRequestJira.mockResolvedValue(fakeResp(200, { id: "rule-1" }));

    await importAutomationRules({
      cloudId: CLOUD_ID,
      rules: [{ name: "sneaky", state: "ENABLED", trigger: {} }],
    });

    expect(mockRequestJira).toHaveBeenCalledOnce();
    const [, opts] = mockRequestJira.mock.calls[0] as [unknown, { body: string }];
    const body = JSON.parse(opts.body);
    expect(body.state).toBe("DISABLED");
  });

  it("sends DISABLED for each rule in a batch", async () => {
    mockRequestJira.mockResolvedValue(fakeResp(200));

    const rules = [makeRule("a", "DISABLED"), makeRule("b", "ENABLED"), makeRule("c", "DISABLED")];
    await importAutomationRules({ cloudId: CLOUD_ID, rules });

    expect(mockRequestJira).toHaveBeenCalledTimes(3);
    for (const call of mockRequestJira.mock.calls) {
      const [, opts] = call as [unknown, { body: string }];
      expect(JSON.parse(opts.body).state).toBe("DISABLED");
    }
  });
});

describe("importAutomationRules — result aggregation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns imported count and empty errors on full success", async () => {
    mockRequestJira.mockResolvedValue(fakeResp(200));

    const result = await importAutomationRules({
      cloudId: CLOUD_ID,
      rules: [makeRule("r1"), makeRule("r2"), makeRule("r3")],
    }) as ImportResult;

    expect(result.imported).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toBeUndefined();
  });

  it("counts 4xx responses as failures and includes them in errors", async () => {
    mockRequestJira
      .mockResolvedValueOnce(fakeResp(200))
      .mockResolvedValueOnce(fakeResp(403, { message: "Forbidden" }))
      .mockResolvedValueOnce(fakeResp(200));

    const result = await importAutomationRules({
      cloudId: CLOUD_ID,
      rules: [makeRule("ok1"), makeRule("bad"), makeRule("ok2")],
    }) as ImportResult;

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].name).toBe("bad");
    expect(result.errors![0].status).toBe(403);
  });

  it("includes all results in the results array", async () => {
    mockRequestJira.mockResolvedValue(fakeResp(200));

    const result = await importAutomationRules({
      cloudId: CLOUD_ID,
      rules: [makeRule("r1"), makeRule("r2")],
    }) as { results: Array<{ name: string; status: number; body: unknown }> };

    expect(result.results).toHaveLength(2);
    expect(result.results[0].name).toBe("r1");
    expect(result.results[1].name).toBe("r2");
  });
});
