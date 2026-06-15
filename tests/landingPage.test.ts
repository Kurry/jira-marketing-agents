import { describe, it, expect } from "vitest";
import { createLandingPageSpec } from "../src/landingPage";
import { makeIssue } from "./helpers";

describe("createLandingPageSpec — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-80", summary: "landing page", description: "" });
    expect(createLandingPageSpec(ctx).issueKey).toBe("AIGO-80");
  });

  it("always returns 5 sections", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    expect(createLandingPageSpec(ctx).sections.length).toBe(5);
  });

  it("each section has section, purpose, and draftCopy fields", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    for (const s of createLandingPageSpec(ctx).sections) {
      expect(typeof s.section).toBe("string");
      expect(typeof s.purpose).toBe("string");
      expect(typeof s.draftCopy).toBe("string");
      expect(s.draftCopy.length).toBeGreaterThan(0);
    }
  });

  it("primaryCta is 'Check your eligibility'", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    expect(createLandingPageSpec(ctx).primaryCta).toBe("Check your eligibility");
  });

  it("trackingRequirements include form submit and conversion events", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    const tr = createLandingPageSpec(ctx).trackingRequirements.join(" ").toLowerCase();
    expect(tr).toContain("form");
    expect(tr).toContain("conversion");
  });

  it("abTestPlan has at least one test idea", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    expect(createLandingPageSpec(ctx).abTestPlan.length).toBeGreaterThan(0);
  });

  it("qaChecks include mobile rendering and tracking events", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    const qa = createLandingPageSpec(ctx).qaChecks.join(" ").toLowerCase();
    expect(qa).toContain("mobile");
    expect(qa).toContain("tracking");
  });

  it("acceptanceCriteria covers flow completion and tracking", () => {
    const ctx = makeIssue({ summary: "landing page", description: "" });
    const ac = createLandingPageSpec(ctx).acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("tracking");
  });
});

describe("createLandingPageSpec — employer vs generic context", () => {
  it("employer context produces an employer-benefit hero section", () => {
    const ctx = makeIssue({ summary: "employer landing page", description: "employer eligibility benefit" });
    const hero = createLandingPageSpec(ctx).sections.find((s) => s.section === "Hero")!;
    expect(hero.draftCopy.toLowerCase()).toContain("employer");
  });

  it("non-employer context uses the generic hero copy", () => {
    const ctx = makeIssue({ summary: "member landing page", description: "healthier habits care team" });
    const hero = createLandingPageSpec(ctx).sections.find((s) => s.section === "Hero")!;
    expect(hero.draftCopy.toLowerCase()).not.toContain("employer");
  });

  it("employer context adds employer code to formFields", () => {
    const ctx = makeIssue({ summary: "employer landing page", description: "employer partner eligibility" });
    const fields = createLandingPageSpec(ctx).formFields.join(" ").toLowerCase();
    expect(fields).toContain("employer");
  });

  it("non-employer context does not add employer code field", () => {
    const ctx = makeIssue({ summary: "general landing page", description: "member signup registration" });
    const fields = createLandingPageSpec(ctx).formFields.join(" ").toLowerCase();
    expect(fields).not.toContain("employer");
  });
});

describe("createLandingPageSpec — claims scanning", () => {
  it("claimsRiskInCopy is Safe for compliant draft copy", () => {
    const ctx = makeIssue({ summary: "landing page for member health", description: "care team support" });
    expect(createLandingPageSpec(ctx).claimsRiskInCopy).toBe("Safe");
  });

  it("flaggedPhrases is populated when risky claims present in issue text", () => {
    const ctx = makeIssue({ summary: "landing page", description: "guaranteed reversal of diabetes for all members" });
    const spec = createLandingPageSpec(ctx);
    expect(spec.flaggedPhrases.length).toBeGreaterThan(0);
  });
});
