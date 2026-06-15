import { describe, it, expect } from "vitest";
import { proposeActivationPlan } from "../src/activation";
import { makeIssue } from "./helpers";

describe("proposeActivationPlan — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-50", summary: "activation plan", description: "" });
    expect(proposeActivationPlan(ctx).issueKey).toBe("AIGO-50");
  });

  it("always returns 4 milestones", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    expect(proposeActivationPlan(ctx).milestones.length).toBe(4);
  });

  it("milestones have milestone and targetTiming fields", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    for (const m of proposeActivationPlan(ctx).milestones) {
      expect(typeof m.milestone).toBe("string");
      expect(typeof m.targetTiming).toBe("string");
    }
  });

  it("nudges cover Email, SMS, and Push channels", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    const channels = proposeActivationPlan(ctx).nudges.map((n) => n.channel);
    expect(channels).toContain("Email");
    expect(channels).toContain("SMS");
    expect(channels).toContain("Push");
  });

  it("guardrails mention consent and claims policy", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    const gl = proposeActivationPlan(ctx).guardrails.join(" ").toLowerCase();
    expect(gl).toContain("consent");
    expect(gl).toContain("claims");
  });

  it("acceptanceCriteria is non-empty", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    expect(proposeActivationPlan(ctx).acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("metrics include activation rate", () => {
    const ctx = makeIssue({ summary: "activation", description: "" });
    const metrics = proposeActivationPlan(ctx).metrics.join(" ").toLowerCase();
    expect(metrics).toContain("activation rate");
  });
});

describe("proposeActivationPlan — device detection", () => {
  it("includes device activation step when CGM/sensor keyword present", () => {
    const ctx = makeIssue({ summary: "activation with CGM sensor device", description: "cgm sensor setup" });
    const steps = proposeActivationPlan(ctx).onboardingSteps;
    expect(steps.some((s) => s.toLowerCase().includes("device") || s.toLowerCase().includes("sensor"))).toBe(true);
  });

  it("omits device step when no device keywords present", () => {
    const ctx = makeIssue({ summary: "activation plan", description: "onboard new members to care team" });
    const steps = proposeActivationPlan(ctx).onboardingSteps;
    expect(steps.some((s) => s.toLowerCase().includes("device") || s.toLowerCase().includes("sensor"))).toBe(false);
  });
});
