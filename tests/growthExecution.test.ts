import { describe, it, expect } from "vitest";
import { generateCreativeVariants } from "../src/creativeGen";
import { buildAudienceSegment, proposePersonalization } from "../src/audience";
import { buildCampaignPlan } from "../src/campaign";
import { createLandingPageSpec } from "../src/landingPage";
import { designReferralLoop } from "../src/referral";
import { proposeActivationPlan } from "../src/activation";
import { makeIssue } from "./helpers";

describe("generateCreativeVariants", () => {
  it("produces compliant variants with Safe claims risk", () => {
    const ctx = makeIssue({
      summary: "Email creative for employer launch",
      description: "Draft email variants for eligible employer members.",
    });
    const result = generateCreativeVariants(ctx);
    expect(result.channel).toBe("Email");
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.variants.every((v) => v.claimsRisk === "Safe")).toBe(true);
    expect(result.overallHumanReviewRequired).toBe(false);
  });

  it("shapes SMS variants with opt-out language", () => {
    const ctx = makeIssue({ summary: "SMS outreach", description: "Draft SMS copy." });
    const result = generateCreativeVariants(ctx);
    expect(result.channel).toBe("SMS");
    expect(result.variants[0].body.toLowerCase()).toContain("stop");
  });

  it("flags a risky brief for human review", () => {
    const ctx = makeIssue({
      summary: "Email creative",
      description: "Make it say guaranteed reversal of diabetes.",
    });
    const result = generateCreativeVariants(ctx);
    expect(result.overallHumanReviewRequired).toBe(true);
    expect(result.notes.join(" ").toLowerCase()).toContain("compliance");
  });
});

describe("buildAudienceSegment", () => {
  it("proposes include/suppression criteria and never mutates production", () => {
    const ctx = makeIssue({
      summary: "Target lapsed eligible employer members",
      description: "Employer eligibility file; members who never activated. Use the warehouse.",
    });
    const result = buildAudienceSegment(ctx);
    expect(result.mutatesProductionAudience).toBe(false);
    expect(result.includeCriteria.length).toBeGreaterThan(0);
    expect(result.excludeCriteria.join(" ").toLowerCase()).toContain("opted-out");
    expect(result.signals.length).toBeGreaterThan(0);
  });
});

describe("proposePersonalization", () => {
  it("includes privacy notes prohibiting PHI", () => {
    const ctx = makeIssue({ summary: "Personalize by region and channel" });
    const result = proposePersonalization(ctx);
    expect(result.privacyNotes.join(" ").toUpperCase()).toContain("PHI");
    expect(result.variables.length).toBeGreaterThan(0);
  });
});

describe("buildCampaignPlan", () => {
  it("never sends and always requires human go/no-go", () => {
    const ctx = makeIssue({
      summary: "Re-engagement campaign to drive signup conversion",
      description: "Email and SMS to the lapsed eligible segment.",
    });
    const result = buildCampaignPlan(ctx);
    expect(result.executionMode).toBe("draft — human executes the send");
    expect(result.approvalsRequired.join(" ").toLowerCase()).toContain("go/no-go");
    expect(result.channelSequence.length).toBeGreaterThanOrEqual(2);
    expect(result.suppressionChecks.length).toBeGreaterThan(0);
  });

  it("flags TCPA and CAN-SPAM for SMS+email", () => {
    const ctx = makeIssue({
      summary: "Outreach to segment to register",
      description: "Use email and sms for the audience.",
    });
    const result = buildCampaignPlan(ctx);
    const approvals = result.approvalsRequired.join(" ");
    expect(approvals).toMatch(/TCPA/);
    expect(approvals).toMatch(/CAN-SPAM/);
  });
});

describe("createLandingPageSpec", () => {
  it("includes sections, tracking, an A/B plan, and clean claims", () => {
    const ctx = makeIssue({
      summary: "Employer landing page",
      description: "Co-branded eligibility page for employer members.",
    });
    const result = createLandingPageSpec(ctx);
    expect(result.sections.length).toBeGreaterThanOrEqual(3);
    expect(result.abTestPlan.length).toBeGreaterThan(0);
    expect(result.claimsRiskInCopy).toBe("Safe");
    expect(result.trackingRequirements.join(" ").toLowerCase()).toContain("conversion");
  });
});

describe("designReferralLoop", () => {
  it("flags compliance and triggers only after activation", () => {
    const ctx = makeIssue({
      summary: "Add a member referral program",
      description: "Members refer friends; consider a gift card incentive.",
    });
    const result = designReferralLoop(ctx);
    expect(result.complianceFlags.join(" ").toLowerCase()).toContain("anti-kickback");
    expect(result.trigger.toLowerCase()).toContain("activation");
    expect(result.fraudGuardrails.length).toBeGreaterThan(0);
  });
});

describe("proposeActivationPlan", () => {
  it("defines measurable activation with consent-respecting nudges", () => {
    const ctx = makeIssue({
      summary: "Improve early activation",
      description: "Members register but drop off before first session with the sensor.",
    });
    const result = proposeActivationPlan(ctx);
    expect(result.onboardingSteps.join(" ").toLowerCase()).toContain("device");
    expect(result.metrics.join(" ").toLowerCase()).toContain("activation");
    expect(result.guardrails.join(" ").toLowerCase()).toContain("consent");
  });
});
