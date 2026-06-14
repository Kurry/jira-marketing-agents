import { describe, it, expect } from "vitest";
import { createDashboardSpec } from "../src/dashboards";
import { makeIssue } from "./helpers";

describe("createDashboardSpec", () => {
  it("builds a signup funnel dashboard spec for a funnel request", () => {
    const ctx = makeIssue({
      summary: "Signup funnel dashboard",
      description: "Show where users drop off in the conversion funnel by device.",
    });
    const spec = createDashboardSpec(ctx);

    expect(spec.businessQuestion.toLowerCase()).toContain("drop");
    expect(spec.metrics.length).toBeGreaterThan(0);
    expect(spec.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("builds a channel performance dashboard spec", () => {
    const ctx = makeIssue({
      summary: "Channel performance dashboard",
      description: "How is each acquisition channel performing on CAC and signups?",
    });
    const spec = createDashboardSpec(ctx);

    expect(spec.metrics.join(" ").toLowerCase()).toContain("cac");
    expect(spec.dimensions).toContain("Channel");
  });

  it("falls back to executive acquisition and asks for source system when unknown", () => {
    const ctx = makeIssue({ summary: "Need a dashboard", description: "Some dashboard please." });
    const spec = createDashboardSpec(ctx);

    expect(spec.businessQuestion.length).toBeGreaterThan(0);
    expect(spec.sourceSystems.join(" ")).toMatch(/confirm/i);
  });
});
