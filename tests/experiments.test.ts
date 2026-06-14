import { describe, it, expect } from "vitest";
import { proposeExperimentSpec } from "../src/experiments";
import { makeIssue } from "./helpers";

describe("proposeExperimentSpec", () => {
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

  it("always includes claims and tracking guardrails", () => {
    const ctx = makeIssue({
      summary: "SMS test for conversion rate",
      description: "Send SMS variants to improve conversion rate.",
    });
    const spec = proposeExperimentSpec(ctx);
    const guardrails = spec.guardrailMetrics.join(" ").toLowerCase();
    expect(guardrails).toContain("claims");
    expect(guardrails).toContain("tracking");
  });
});
