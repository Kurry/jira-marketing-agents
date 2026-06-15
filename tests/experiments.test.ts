import { describe, it, expect } from "vitest";
import { proposeExperimentSpec } from "../src/experiments";
import { makeIssue } from "./helpers";

describe("proposeExperimentSpec — ready experiments", () => {
  it("includes primary metric, guardrails, variants, and a decision rule when ready", () => {
    const ctx = makeIssue({
      issueType: "Experiment",
      summary: "Email subject line test to lift signup conversion rate",
      description: "Test two subject lines via email for the prospect segment to improve conversion rate.",
    });
    const spec = proposeExperimentSpec(ctx);

    expect(spec.readyForDesign).toBe(true);
    expect(spec.primaryMetric.toLowerCase()).toContain("conversion");
    expect(spec.variants.length).toBeGreaterThanOrEqual(2);
    expect(spec.guardrailMetrics.length).toBeGreaterThan(0);
    expect(spec.decisionRule).toMatch(/ship|kill|iterate/i);
  });

  it("propagates the issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-99", summary: "SMS CTR test", description: "sms click-through rate test" });
    expect(proposeExperimentSpec(ctx).issueKey).toBe("AIGO-99");
  });

  it("always includes 5 standard guardrail metrics", () => {
    const ctx = makeIssue({ summary: "email signup test", description: "email conversion rate experiment" });
    const spec = proposeExperimentSpec(ctx);
    const gl = spec.guardrailMetrics.join(" ").toLowerCase();
    expect(gl).toContain("unsubscribe");
    expect(gl).toContain("spam");
    expect(gl).toContain("claims");
    expect(gl).toContain("tracking");
  });

  it("always returns Control + Variant A as the two default variants", () => {
    const ctx = makeIssue({ summary: "landing page conversion test", description: "landing page conversion rate" });
    const spec = proposeExperimentSpec(ctx);
    expect(spec.variants.some((v) => v.toLowerCase().includes("control"))).toBe(true);
    expect(spec.variants.some((v) => v.toLowerCase().includes("variant a"))).toBe(true);
  });

  it("always requires a human launch approval regardless of channel or claims", () => {
    const ctx = makeIssue({ summary: "email open rate experiment", description: "email open rate" });
    const spec = proposeExperimentSpec(ctx);
    const approvals = spec.approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("launch approval");
  });
});

describe("proposeExperimentSpec — not ready", () => {
  it("returns not ready for a vague experiment with no metric", () => {
    const ctx = makeIssue({
      issueType: "Experiment",
      summary: "Try something new",
      description: "Let's experiment with the page.",
    });
    const spec = proposeExperimentSpec(ctx);

    expect(spec.readyForDesign).toBe(false);
    expect(spec.notReadyReasons.length).toBeGreaterThan(0);
  });

  it("decision rule is unset when no primary metric exists", () => {
    const ctx = makeIssue({ summary: "Try something", description: "Not sure yet." });
    const spec = proposeExperimentSpec(ctx);
    expect(spec.decisionRule.toLowerCase()).toContain("metric");
    expect(spec.decisionRule.toLowerCase()).not.toContain("ship");
  });

  it("primaryMetric field indicates not ready when undetectable", () => {
    const ctx = makeIssue({ summary: "mystery test", description: "vague goal" });
    const spec = proposeExperimentSpec(ctx);
    expect(spec.primaryMetric.toLowerCase()).toContain("not ready");
  });

  it("flags unspecified channel in notReadyReasons", () => {
    const ctx = makeIssue({ summary: "conversion lift", description: "improve conversion rate somehow" });
    const spec = proposeExperimentSpec(ctx);
    expect(spec.notReadyReasons.some((r) => r.toLowerCase().includes("channel"))).toBe(true);
  });
});

describe("proposeExperimentSpec — channel detection", () => {
  const cases: Array<{ label: string; text: string; expected: string }> = [
    { label: "SMS", text: "send sms variants", expected: "SMS" },
    { label: "Email", text: "email subject line test", expected: "Email" },
    { label: "Paid", text: "paid ads CTR experiment", expected: "Paid" },
    { label: "Push", text: "push notification open rate", expected: "Push" },
    { label: "Landing page", text: "landing page conversion rate", expected: "Landing page" },
    { label: "Unspecified", text: "test signup conversion rate for something", expected: "Unspecified" },
  ];

  for (const { label, text, expected } of cases) {
    it(`detects channel '${label}'`, () => {
      const ctx = makeIssue({ summary: text, description: text });
      expect(proposeExperimentSpec(ctx).channel).toBe(expected);
    });
  }
});

describe("proposeExperimentSpec — primary metric detection", () => {
  const cases: Array<{ hint: string; text: string; expected: RegExp }> = [
    { hint: "signup", text: "email signup form experiment", expected: /signup/i },
    { hint: "registration", text: "email registration form experiment", expected: /signup/i },
    { hint: "ctr", text: "email ctr improvement", expected: /click-through/i },
    { hint: "click", text: "email click-through rate test", expected: /click-through/i },
    { hint: "open rate", text: "email open rate experiment", expected: /open rate/i },
    { hint: "activation", text: "email activation rate test", expected: /activation/i },
    { hint: "retention", text: "email retention rate experiment", expected: /retention/i },
    { hint: "revenue", text: "email revenue per user lift", expected: /revenue/i },
    { hint: "conversion", text: "email conversion rate lift", expected: /conversion/i },
  ];

  for (const { hint, text, expected } of cases) {
    it(`detects primary metric from hint '${hint}'`, () => {
      const ctx = makeIssue({ summary: text, description: text });
      expect(proposeExperimentSpec(ctx).primaryMetric).toMatch(expected);
    });
  }
});

describe("proposeExperimentSpec — audience detection", () => {
  it("detects new user audience", () => {
    const ctx = makeIssue({ summary: "signup for new users", description: "target new user email conversion" });
    expect(proposeExperimentSpec(ctx).audience.toLowerCase()).toContain("new");
  });

  it("detects existing member audience", () => {
    const ctx = makeIssue({ summary: "email for existing members", description: "email existing members conversion rate" });
    expect(proposeExperimentSpec(ctx).audience.toLowerCase()).toContain("existing");
  });

  it("detects employer-sourced audience", () => {
    const ctx = makeIssue({ summary: "email for employer partners", description: "email employer partner conversion rate" });
    expect(proposeExperimentSpec(ctx).audience.toLowerCase()).toContain("employer");
  });

  it("falls back to unspecified when no audience keyword present", () => {
    const ctx = makeIssue({ summary: "email conversion rate test", description: "email conversion rate lift" });
    expect(proposeExperimentSpec(ctx).audience.toLowerCase()).toContain("unspecified");
  });
});

describe("proposeExperimentSpec — approvals", () => {
  it("always includes SMS/Email claims and guardrails", () => {
    const ctx = makeIssue({ summary: "SMS CTR test", description: "sms click-through rate test" });
    const spec = proposeExperimentSpec(ctx);
    const guardrails = spec.guardrailMetrics.join(" ").toLowerCase();
    expect(guardrails).toContain("claims");
    expect(guardrails).toContain("tracking");
  });

  it("adds messaging review approval for SMS channel", () => {
    const ctx = makeIssue({ summary: "sms click-through rate experiment", description: "sms ctr test" });
    const spec = proposeExperimentSpec(ctx);
    const approvals = spec.approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("messaging");
  });

  it("adds messaging review approval for Email channel", () => {
    const ctx = makeIssue({ summary: "email open rate experiment", description: "email open rate test" });
    const spec = proposeExperimentSpec(ctx);
    const approvals = spec.approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("messaging");
  });

  it("adds claims review when risky health language detected", () => {
    const ctx = makeIssue({ summary: "email guaranteed weight loss program", description: "email signup conversion rate with guaranteed weight loss" });
    const spec = proposeExperimentSpec(ctx);
    const approvals = spec.approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("claims");
  });
});

describe("proposeExperimentSpec — hypothesis and readout", () => {
  it("hypothesis mentions the issue summary", () => {
    const ctx = makeIssue({ summary: "subject line A vs B email conversion", description: "email conversion rate test" });
    const spec = proposeExperimentSpec(ctx);
    expect(spec.hypothesis.toLowerCase()).toContain("subject line");
  });

  it("readoutTemplate contains the required structure items", () => {
    const ctx = makeIssue({ summary: "email conversion rate test", description: "email conversion rate" });
    const template = proposeExperimentSpec(ctx).readoutTemplate.join(" ").toLowerCase();
    expect(template).toContain("hypothesis");
    expect(template).toContain("guardrail");
    expect(template).toContain("decision");
  });

  it("trackingRequirements covers exposure and conversion events", () => {
    const ctx = makeIssue({ summary: "email signup test", description: "email signup conversion" });
    const tracking = proposeExperimentSpec(ctx).trackingRequirements.join(" ").toLowerCase();
    expect(tracking).toContain("exposure");
    expect(tracking).toContain("conversion");
  });
});
