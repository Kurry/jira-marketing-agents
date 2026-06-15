import { describe, it, expect } from "vitest";
import { createDashboardSpec } from "../src/dashboards";
import { makeIssue } from "./helpers";

describe("createDashboardSpec — existing", () => {
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

describe("createDashboardSpec — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-88", summary: "dashboard", description: "" });
    expect(createDashboardSpec(ctx).issueKey).toBe("AIGO-88");
  });

  it("always has users, filters, charts, qaChecks, and acceptanceCriteria", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "" });
    const spec = createDashboardSpec(ctx);
    expect(spec.users.length).toBeGreaterThan(0);
    expect(spec.filters.length).toBeGreaterThan(0);
    expect(spec.charts.length).toBeGreaterThan(0);
    expect(spec.qaChecks.length).toBeGreaterThan(0);
    expect(spec.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("acceptanceCriteria includes the businessQuestion", () => {
    const ctx = makeIssue({ summary: "employer launch dashboard", description: "employer launch partner" });
    const spec = createDashboardSpec(ctx);
    const ac = spec.acceptanceCriteria.join(" ");
    expect(ac).toContain(spec.businessQuestion);
  });

  it("refreshCadence defaults to Daily", () => {
    const ctx = makeIssue({ summary: "channel performance dashboard", description: "weekly reporting" });
    expect(createDashboardSpec(ctx).refreshCadence).toBe("Daily");
  });

  it("refreshCadence is Hourly when real-time is requested", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "need real-time updates" });
    expect(createDashboardSpec(ctx).refreshCadence).toBe("Hourly");
  });
});

describe("createDashboardSpec — category detection", () => {
  const cases: Array<{ label: string; text: string; questionFragment: RegExp }> = [
    { label: "employer launch", text: "employer launch dashboard partner", questionFragment: /employer/i },
    { label: "experimentation", text: "experiment dashboard a/b test results", questionFragment: /experiment/i },
    { label: "creative performance", text: "creative performance dashboard ad performance", questionFragment: /creative/i },
    { label: "claims review", text: "claims review dashboard compliance", questionFragment: /claims/i },
    { label: "segment performance", text: "segment performance dashboard by segment", questionFragment: /segment/i },
    { label: "weekly growth decision", text: "weekly growth decision dashboard", questionFragment: /decision/i },
    { label: "member objection", text: "member objection complaint dashboard", questionFragment: /objection|complaint/i },
    { label: "executive acquisition (default)", text: "executive acquisition overview leadership", questionFragment: /acquisition/i },
  ];

  for (const { label, text, questionFragment } of cases) {
    it(`picks category '${label}'`, () => {
      const ctx = makeIssue({ summary: text, description: text });
      expect(createDashboardSpec(ctx).businessQuestion).toMatch(questionFragment);
    });
  }
});

describe("createDashboardSpec — source system detection", () => {
  it("detects warehouse (Snowflake)", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "pull from snowflake warehouse" });
    const ss = createDashboardSpec(ctx).sourceSystems.join(" ").toLowerCase();
    expect(ss).toContain("warehouse");
  });

  it("detects product analytics (Amplitude)", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "amplitude mixpanel product analytics" });
    const ss = createDashboardSpec(ctx).sourceSystems.join(" ").toLowerCase();
    expect(ss).toContain("analytics");
  });

  it("detects CRM (Salesforce)", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "salesforce crm hubspot" });
    const ss = createDashboardSpec(ctx).sourceSystems.join(" ").toLowerCase();
    expect(ss).toContain("crm");
  });
});
