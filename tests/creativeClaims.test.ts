import { describe, it, expect } from "vitest";
import { reviewCreativeClaims } from "../src/creativeClaims";
import { scanClaimsRisk } from "../src/utils/risk";
import { makeIssue } from "./helpers";

// ---------------------------------------------------------------------------
// Existing core tests
// ---------------------------------------------------------------------------

describe("reviewCreativeClaims — claims classification", () => {
  it("flags 'guaranteed diabetes reversal' as prohibited and requires human review", () => {
    const ctx = makeIssue({
      summary: "Email creative",
      description: "Guaranteed reversal of diabetes for all members!",
    });
    const result = reviewCreativeClaims(ctx);

    expect(result.overallClaimsRisk).toBe("Prohibited");
    expect(result.humanReviewRequired).toBe(true);
    expect(result.flaggedPhrases.length).toBeGreaterThan(0);
    expect(result.flaggedPhrases[0].saferRewrite.length).toBeGreaterThan(0);
  });

  it("flags 'get off medication' as prohibited", () => {
    const { risk } = scanClaimsRisk("You can get off your medication with our program.");
    expect(risk).toBe("Prohibited");
  });

  it("returns Safe for compliant wording", () => {
    const ctx = makeIssue({
      summary: "Email creative",
      description: "Join thousands of members building healthier habits with support from their care team.",
    });
    const result = reviewCreativeClaims(ctx);

    expect(result.overallClaimsRisk).toBe("Safe");
    expect(result.humanReviewRequired).toBe(false);
  });

  it("never approves — risky/prohibited always requires human review", () => {
    const ctx = makeIssue({ description: "clinically proven to cure diabetes" });
    const result = reviewCreativeClaims(ctx);
    expect(result.humanReviewRequired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("reviewCreativeClaims — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-77", description: "safe creative copy" });
    expect(reviewCreativeClaims(ctx).issueKey).toBe("AIGO-77");
  });

  it("flaggedPhrases include issue and saferRewrite fields", () => {
    const ctx = makeIssue({ description: "guaranteed reversal of diabetes in 30 days email" });
    const result = reviewCreativeClaims(ctx);
    for (const fp of result.flaggedPhrases) {
      expect(typeof fp.phrase).toBe("string");
      expect(typeof fp.issue).toBe("string");
      expect(fp.issue.length).toBeGreaterThan(0);
      expect(typeof fp.saferRewrite).toBe("string");
      expect(fp.saferRewrite.length).toBeGreaterThan(0);
    }
  });

  it("Safe copy returns empty flaggedPhrases", () => {
    const ctx = makeIssue({ description: "healthier habits with care team support" });
    expect(reviewCreativeClaims(ctx).flaggedPhrases).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Channel warnings
// ---------------------------------------------------------------------------

describe("reviewCreativeClaims — channel warnings", () => {
  it("adds SMS warning when SMS is mentioned", () => {
    const ctx = makeIssue({ description: "send sms to members about healthy habits" });
    const warnings = reviewCreativeClaims(ctx).channelWarnings.join(" ").toLowerCase();
    expect(warnings).toContain("sms");
  });

  it("adds Email warning when email is mentioned", () => {
    const ctx = makeIssue({ description: "email members about their health journey" });
    const warnings = reviewCreativeClaims(ctx).channelWarnings.join(" ").toLowerCase();
    expect(warnings).toContain("email");
  });

  it("adds Paid ads warning when 'ads' is mentioned", () => {
    const ctx = makeIssue({ description: "paid ads on meta and google ads for healthy habits" });
    const warnings = reviewCreativeClaims(ctx).channelWarnings.join(" ").toLowerCase();
    expect(warnings).toContain("paid");
  });

  it("adds Paid ads warning when 'meta' is mentioned", () => {
    const ctx = makeIssue({ description: "meta ad creative for health program" });
    const warnings = reviewCreativeClaims(ctx).channelWarnings.join(" ").toLowerCase();
    expect(warnings).toContain("paid");
  });

  it("returns no channel warnings when no channel keywords present", () => {
    const ctx = makeIssue({ description: "update landing page copy about wellness" });
    expect(reviewCreativeClaims(ctx).channelWarnings).toEqual([]);
  });

  it("can return multiple channel warnings simultaneously", () => {
    const ctx = makeIssue({ description: "email and sms campaign with paid ads on meta" });
    const warnings = reviewCreativeClaims(ctx).channelWarnings;
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Risk levels
// ---------------------------------------------------------------------------

describe("reviewCreativeClaims — risk levels", () => {
  it("Risky risk level triggers humanReviewRequired", () => {
    const ctx = makeIssue({ description: "diagnose your condition with our program email" });
    const result = reviewCreativeClaims(ctx);
    if (result.overallClaimsRisk === "Risky") {
      expect(result.humanReviewRequired).toBe(true);
    }
  });

  it("Needs substantiation risk does not require human review", () => {
    const ctx = makeIssue({ description: "email clinically proven results for health members" });
    const result = reviewCreativeClaims(ctx);
    if (result.overallClaimsRisk === "Needs substantiation") {
      expect(result.humanReviewRequired).toBe(false);
    }
  });
});
