import { describe, it, expect } from "vitest";
import { scanClaimsRisk, requiresHumanClaimsReview } from "../../src/utils/risk";

// ---------------------------------------------------------------------------
// scanClaimsRisk — clean text
// ---------------------------------------------------------------------------

describe("scanClaimsRisk — Safe text", () => {
  it("returns Safe for compliant health copy", () => {
    const { risk, phrases } = scanClaimsRisk("Build healthier habits with a care team beside you.");
    expect(risk).toBe("Safe");
    expect(phrases).toEqual([]);
  });

  it("returns Safe for empty string", () => {
    expect(scanClaimsRisk("").risk).toBe("Safe");
  });
});

// ---------------------------------------------------------------------------
// scanClaimsRisk — Prohibited patterns
// ---------------------------------------------------------------------------

describe("scanClaimsRisk — Prohibited patterns", () => {
  const prohibitedCases = [
    { label: "diabetes reversal", text: "guaranteed reversal of diabetes for members" },
    { label: "reverse diabetes", text: "reverse diabetes in 30 days guaranteed" },
    { label: "cure diabetes", text: "our program can cure diabetes" },
    { label: "cure claim", text: "this supplement will cure your condition" },
    { label: "stop medication", text: "get off your medication with our program" },
    { label: "no medication needed", text: "no medication needed when you join" },
    { label: "replace your doctor", text: "replace your doctor with our AI coach" },
    { label: "guaranteed weight loss", text: "guaranteed weight loss in 30 days" },
    { label: "guaranteed results", text: "we offer guaranteed results for all members" },
  ];

  for (const { label, text } of prohibitedCases) {
    it(`classifies '${label}' as Prohibited`, () => {
      const { risk } = scanClaimsRisk(text);
      expect(risk).toBe("Prohibited");
    });
  }

  it("populated phrases array for Prohibited text", () => {
    const { phrases } = scanClaimsRisk("guaranteed reversal of diabetes");
    expect(phrases.length).toBeGreaterThan(0);
    expect(typeof phrases[0].phrase).toBe("string");
    expect(typeof phrases[0].issue).toBe("string");
    expect(typeof phrases[0].saferRewrite).toBe("string");
    expect(phrases[0].saferRewrite.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// scanClaimsRisk — Risky patterns
// ---------------------------------------------------------------------------

describe("scanClaimsRisk — Risky patterns", () => {
  it("classifies 'diagnose' language as Risky", () => {
    const { risk } = scanClaimsRisk("our app can diagnose your condition");
    expect(risk).toBe("Risky");
  });
});

// ---------------------------------------------------------------------------
// scanClaimsRisk — Needs substantiation patterns
// ---------------------------------------------------------------------------

describe("scanClaimsRisk — Needs substantiation patterns", () => {
  const needsSubCases = [
    { label: "clinically proven", text: "clinically proven to improve blood sugar" },
    { label: "scientifically proven", text: "scientifically proven results for members" },
    { label: "proven to", text: "proven to help members lose weight" },
    { label: "FDA-approved", text: "our device is fda-approved" },
    { label: "FDA cleared", text: "fda cleared for home monitoring use" },
  ];

  for (const { label, text } of needsSubCases) {
    it(`classifies '${label}' as Needs substantiation`, () => {
      const { risk } = scanClaimsRisk(text);
      expect(risk).toBe("Needs substantiation");
    });
  }
});

// ---------------------------------------------------------------------------
// scanClaimsRisk — risk priority ordering
// ---------------------------------------------------------------------------

describe("scanClaimsRisk — risk priority ordering", () => {
  it("Prohibited takes precedence over Needs substantiation when both present", () => {
    const text = "clinically proven program that can cure diabetes";
    const { risk } = scanClaimsRisk(text);
    expect(risk).toBe("Prohibited");
  });
});

// ---------------------------------------------------------------------------
// requiresHumanClaimsReview
// ---------------------------------------------------------------------------

describe("requiresHumanClaimsReview", () => {
  it("returns true for Prohibited", () => {
    expect(requiresHumanClaimsReview("Prohibited")).toBe(true);
  });

  it("returns true for Risky", () => {
    expect(requiresHumanClaimsReview("Risky")).toBe(true);
  });

  it("returns true for Requires human review", () => {
    expect(requiresHumanClaimsReview("Requires human review")).toBe(true);
  });

  it("returns false for Safe", () => {
    expect(requiresHumanClaimsReview("Safe")).toBe(false);
  });

  it("returns false for Needs substantiation", () => {
    expect(requiresHumanClaimsReview("Needs substantiation")).toBe(false);
  });
});
