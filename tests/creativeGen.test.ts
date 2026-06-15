import { describe, it, expect } from "vitest";
import { generateCreativeVariants } from "../src/creativeGen";
import { makeIssue } from "./helpers";

describe("generateCreativeVariants — safety invariant", () => {
  it("notes always state that output is a draft for human review", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email members" });
    const notes = generateCreativeVariants(ctx).notes.join(" ").toLowerCase();
    expect(notes).toContain("draft");
    expect(notes).toContain("human");
  });

  it("overallHumanReviewRequired is true when risky claims appear in the brief", () => {
    const ctx = makeIssue({
      summary: "email creative",
      description: "email members guaranteed reversal of diabetes — please create ad copy",
    });
    expect(generateCreativeVariants(ctx).overallHumanReviewRequired).toBe(true);
  });

  it("notes mention the risky phrase when brief contains prohibited language", () => {
    const ctx = makeIssue({
      summary: "email creative",
      description: "email members guaranteed reversal of diabetes",
    });
    const notes = generateCreativeVariants(ctx).notes.join(" ").toLowerCase();
    expect(notes).toContain("risky");
  });
});

describe("generateCreativeVariants — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-99", summary: "creative", description: "" });
    expect(generateCreativeVariants(ctx).issueKey).toBe("AIGO-99");
  });

  it("default count is 3 variants", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email campaign" });
    expect(generateCreativeVariants(ctx).variants.length).toBe(3);
  });

  it("count option caps the number of variants", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email campaign" });
    expect(generateCreativeVariants(ctx, { count: 1 }).variants.length).toBe(1);
    expect(generateCreativeVariants(ctx, { count: 4 }).variants.length).toBe(4);
  });

  it("count option minimum is 1", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email campaign" });
    expect(generateCreativeVariants(ctx, { count: 0 }).variants.length).toBe(1);
  });

  it("each variant has all required fields", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email campaign" });
    for (const v of generateCreativeVariants(ctx).variants) {
      expect(typeof v.channel).toBe("string");
      expect(typeof v.angle).toBe("string");
      expect(typeof v.headline).toBe("string");
      expect(v.headline.length).toBeGreaterThan(0);
      expect(typeof v.body).toBe("string");
      expect(v.body.length).toBeGreaterThan(0);
      expect(typeof v.cta).toBe("string");
      expect(typeof v.claimsRisk).toBe("string");
      expect(Array.isArray(v.flaggedPhrases)).toBe(true);
      expect(typeof v.humanReviewRequired).toBe("boolean");
    }
  });
});

describe("generateCreativeVariants — channel detection", () => {
  it("defaults to Email when no channel keyword present", () => {
    const ctx = makeIssue({ summary: "creative brief", description: "some creative copy" });
    expect(generateCreativeVariants(ctx).channel).toBe("Email");
  });

  it("detects SMS channel", () => {
    const ctx = makeIssue({ summary: "sms creative", description: "sms text message campaign" });
    const result = generateCreativeVariants(ctx);
    expect(result.channel).toBe("SMS");
  });

  it("detects Push channel", () => {
    const ctx = makeIssue({ summary: "push creative", description: "push notification campaign" });
    expect(generateCreativeVariants(ctx).channel).toBe("Push");
  });

  it("detects Paid social channel", () => {
    const ctx = makeIssue({ summary: "paid creative", description: "paid ads meta google ads campaign" });
    expect(generateCreativeVariants(ctx).channel).toBe("Paid social");
  });
});

describe("generateCreativeVariants — SMS channel shaping", () => {
  it("SMS variants include opt-out language in body", () => {
    const ctx = makeIssue({ summary: "sms creative", description: "sms text message campaign" });
    const variants = generateCreativeVariants(ctx).variants;
    expect(variants.every((v) => v.body.toLowerCase().includes("stop"))).toBe(true);
  });
});

describe("generateCreativeVariants — claims scanning", () => {
  it("compliant angle templates produce Safe claimsRisk variants", () => {
    const ctx = makeIssue({ summary: "email creative safe", description: "email campaign healthy habits care team" });
    const variants = generateCreativeVariants(ctx).variants;
    for (const v of variants) {
      expect(v.claimsRisk).toBe("Safe");
      expect(v.flaggedPhrases).toEqual([]);
      expect(v.humanReviewRequired).toBe(false);
    }
  });

  it("overallHumanReviewRequired is false for a fully compliant brief with safe variants", () => {
    const ctx = makeIssue({ summary: "email creative", description: "email campaign healthy habits" });
    expect(generateCreativeVariants(ctx).overallHumanReviewRequired).toBe(false);
  });
});
