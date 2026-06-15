import { describe, it, expect } from "vitest";
import { designReferralLoop } from "../src/referral";
import { makeIssue } from "./helpers";

describe("designReferralLoop — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-60", summary: "referral loop", description: "" });
    expect(designReferralLoop(ctx).issueKey).toBe("AIGO-60");
  });

  it("trackingRequirements include referral link / code", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    const tracking = designReferralLoop(ctx).trackingRequirements.join(" ").toLowerCase();
    expect(tracking).toContain("referral");
  });

  it("fraudGuardrails include self-referral deduplication", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    const guards = designReferralLoop(ctx).fraudGuardrails.join(" ").toLowerCase();
    expect(guards).toContain("self-referral");
  });

  it("approvalsRequired includes legal review", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    const approvals = designReferralLoop(ctx).approvalsRequired.join(" ").toLowerCase();
    expect(approvals).toContain("legal");
  });

  it("complianceFlags always mention anti-kickback / inducement concern", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    const flags = designReferralLoop(ctx).complianceFlags.join(" ").toLowerCase();
    expect(flags).toContain("anti-kickback");
  });

  it("kFactorPlan is non-empty", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    expect(designReferralLoop(ctx).kFactorPlan.length).toBeGreaterThan(0);
  });

  it("acceptanceCriteria includes accurate attribution requirement", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "" });
    const ac = designReferralLoop(ctx).acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("attribution");
  });
});

describe("designReferralLoop — incentive detection", () => {
  it("non-incentive design defaults to recognition-only incentive structure", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "share with friends for recognition" });
    const plan = designReferralLoop(ctx);
    expect(plan.incentiveStructure.toLowerCase()).toContain("recognition");
  });

  it("incentive keyword triggers monetary incentive branch", () => {
    const ctx = makeIssue({ summary: "referral loop with gift card", description: "reward members with a $25 gift card" });
    const plan = designReferralLoop(ctx);
    expect(plan.incentiveStructure.toLowerCase()).not.toContain("recognition-only");
    expect(plan.incentiveStructure.toLowerCase()).toContain("legal");
  });

  it("monetary incentive adds extra compliance flag about permissibility", () => {
    const ctx = makeIssue({ summary: "referral incentive", description: "bonus points reward incentive for members" });
    const flags = designReferralLoop(ctx).complianceFlags;
    expect(flags.some((f) => f.toLowerCase().includes("monetary") || f.toLowerCase().includes("permissible"))).toBe(true);
  });

  it("no extra compliance flag when no incentive keyword present", () => {
    const ctx = makeIssue({ summary: "referral loop", description: "basic member referral mechanic" });
    const flags = designReferralLoop(ctx).complianceFlags;
    expect(flags.some((f) => f.toLowerCase().includes("monetary") || f.toLowerCase().includes("permissible"))).toBe(false);
  });
});
