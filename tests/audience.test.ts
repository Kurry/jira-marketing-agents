import { describe, it, expect } from "vitest";
import { buildAudienceSegment, proposePersonalization } from "../src/audience";
import { makeIssue } from "./helpers";

// ---------------------------------------------------------------------------
// buildAudienceSegment
// ---------------------------------------------------------------------------

describe("buildAudienceSegment — safety invariant", () => {
  it("mutatesProductionAudience is always false", () => {
    const ctx = makeIssue({ summary: "audience segment", description: "employer partner eligibility" });
    expect(buildAudienceSegment(ctx).mutatesProductionAudience).toBe(false);
  });
});

describe("buildAudienceSegment — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-90", summary: "segment", description: "" });
    expect(buildAudienceSegment(ctx).issueKey).toBe("AIGO-90");
  });

  it("approvalsRequired includes data/privacy review", () => {
    const ctx = makeIssue({ summary: "audience segment", description: "" });
    const approvals = buildAudienceSegment(ctx).approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("privacy");
  });

  it("excludeCriteria always includes opted-out suppression", () => {
    const ctx = makeIssue({ summary: "segment", description: "" });
    const exc = buildAudienceSegment(ctx).excludeCriteria.join(" ").toLowerCase();
    expect(exc).toContain("opted-out");
  });

  it("estimatedReachNote warns that count must come from the warehouse", () => {
    const ctx = makeIssue({ summary: "segment", description: "" });
    const note = buildAudienceSegment(ctx).estimatedReachNote.toLowerCase();
    expect(note).toContain("warehouse");
  });

  it("measurement includes registration rate", () => {
    const ctx = makeIssue({ summary: "segment", description: "" });
    const m = buildAudienceSegment(ctx).measurement.join(" ").toLowerCase();
    expect(m).toContain("registration");
  });

  it("segmentName includes the issue summary", () => {
    const ctx = makeIssue({ summary: "High-risk prediabetes outreach", description: "" });
    expect(buildAudienceSegment(ctx).segmentName).toContain("High-risk prediabetes outreach");
  });

  it("segmentName has a fallback when summary is empty", () => {
    const ctx = makeIssue({ summary: "", description: "" });
    expect(buildAudienceSegment(ctx).segmentName.length).toBeGreaterThan(0);
  });
});

describe("buildAudienceSegment — signal detection", () => {
  it("employer keyword detects employer population signal", () => {
    const ctx = makeIssue({ summary: "employer partner audience", description: "eligibility file census" });
    const signals = buildAudienceSegment(ctx).signals;
    expect(signals.some((s) => s.toLowerCase().includes("employer"))).toBe(true);
  });

  it("prediabetes keyword detects clinical signal", () => {
    const ctx = makeIssue({ summary: "prediabetes a1c segment", description: "metabolic diabetes type 2" });
    const signals = buildAudienceSegment(ctx).signals;
    expect(signals.some((s) => s.toLowerCase().includes("prediabetes") || s.toLowerCase().includes("metabolic"))).toBe(true);
  });

  it("lapsed keyword detects re-engagement signal", () => {
    const ctx = makeIssue({ summary: "lapsed inactive members", description: "churn re-engagement" });
    const signals = buildAudienceSegment(ctx).signals;
    expect(signals.some((s) => s.toLowerCase().includes("lapsed") || s.toLowerCase().includes("re-engagement"))).toBe(true);
  });

  it("no-signal fallback prompts data team confirmation", () => {
    const ctx = makeIssue({ summary: "segment", description: "just some outreach" });
    const signals = buildAudienceSegment(ctx).signals;
    expect(signals.some((s) => s.toLowerCase().includes("data team"))).toBe(true);
  });
});

describe("buildAudienceSegment — includeCriteria", () => {
  it("employer/partner keyword adds eligibility file inclusion rule", () => {
    const ctx = makeIssue({ summary: "employer partner eligibility", description: "employer partner" });
    const ic = buildAudienceSegment(ctx).includeCriteria.join(" ").toLowerCase();
    expect(ic).toContain("eligibility");
  });

  it("new/prospect keyword adds not-yet-registered inclusion rule", () => {
    const ctx = makeIssue({ summary: "prospect new unregistered", description: "new member prospect outreach" });
    const ic = buildAudienceSegment(ctx).includeCriteria.join(" ").toLowerCase();
    expect(ic).toContain("registered");
  });

  it("lapsed keyword adds previously-eligible inclusion rule", () => {
    const ctx = makeIssue({ summary: "lapsed inactive segment", description: "churn lapsed members" });
    const ic = buildAudienceSegment(ctx).includeCriteria.join(" ").toLowerCase();
    expect(ic).toContain("previously eligible");
  });

  it("no keyword gives data-team fallback include rule", () => {
    const ctx = makeIssue({ summary: "some segment", description: "something" });
    const ic = buildAudienceSegment(ctx).includeCriteria.join(" ").toLowerCase();
    expect(ic).toContain("data team");
  });
});

describe("buildAudienceSegment — requiredDataSources", () => {
  it("employer/census keyword adds eligibility file data source", () => {
    const ctx = makeIssue({ summary: "employer eligibility", description: "census employer eligibility file" });
    const ds = buildAudienceSegment(ctx).requiredDataSources.join(" ").toLowerCase();
    expect(ds).toContain("eligibility");
  });

  it("data warehouse keyword adds warehouse as data source", () => {
    const ctx = makeIssue({ summary: "segment", description: "pull from the snowflake warehouse" });
    const ds = buildAudienceSegment(ctx).requiredDataSources.join(" ").toLowerCase();
    expect(ds).toContain("warehouse");
  });

  it("no keyword gives data-team fallback", () => {
    const ctx = makeIssue({ summary: "segment", description: "something" });
    const ds = buildAudienceSegment(ctx).requiredDataSources.join(" ").toLowerCase();
    expect(ds).toContain("data team");
  });
});

// ---------------------------------------------------------------------------
// proposePersonalization
// ---------------------------------------------------------------------------

describe("proposePersonalization — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-91", summary: "personalization", description: "" });
    expect(proposePersonalization(ctx).issueKey).toBe("AIGO-91");
  });

  it("always includes First name and Employer/partner name variables", () => {
    const ctx = makeIssue({ summary: "personalization", description: "" });
    const vars = proposePersonalization(ctx).variables;
    expect(vars.some((v) => v.toLowerCase().includes("first name"))).toBe(true);
    expect(vars.some((v) => v.toLowerCase().includes("employer"))).toBe(true);
  });

  it("privacyNotes explicitly prohibit PHI in personalization tokens", () => {
    const ctx = makeIssue({ summary: "personalization", description: "" });
    const notes = proposePersonalization(ctx).privacyNotes.join(" ").toLowerCase();
    expect(notes).toContain("phi");
  });

  it("fallbacks warn against exposing raw tokens", () => {
    const ctx = makeIssue({ summary: "personalization", description: "" });
    const fb = proposePersonalization(ctx).fallbacks.join(" ").toLowerCase();
    expect(fb).toContain("token");
  });

  it("region keyword adds Region variable", () => {
    const ctx = makeIssue({ summary: "personalization for regions", description: "state geo zip region" });
    const vars = proposePersonalization(ctx).variables;
    expect(vars.some((v) => v.toLowerCase().includes("region"))).toBe(true);
  });

  it("lapsed keyword adds last engagement recency variable", () => {
    const ctx = makeIssue({ summary: "re-engage lapsed members", description: "inactive lapsed churn" });
    const vars = proposePersonalization(ctx).variables;
    expect(vars.some((v) => v.toLowerCase().includes("recency") || v.toLowerCase().includes("engagement"))).toBe(true);
  });
});
