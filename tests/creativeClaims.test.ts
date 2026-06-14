import { describe, it, expect } from "vitest";
import { reviewCreativeClaims } from "../src/creativeClaims";
import { scanClaimsRisk } from "../src/utils/risk";
import { makeIssue } from "./helpers";

describe("reviewCreativeClaims", () => {
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

  it("never approves — it only classifies and suggests rewrites", () => {
    const ctx = makeIssue({ description: "clinically proven to cure diabetes" });
    const result = reviewCreativeClaims(ctx);
    // The result has no "approved" concept; risky/prohibited always needs review.
    expect(result.humanReviewRequired).toBe(true);
  });
});
