import { describe, it, expect } from "vitest";
import { buildCampaignPlan } from "../src/campaign";
import { makeIssue } from "./helpers";

describe("buildCampaignPlan — safety invariant", () => {
  it("executionMode is always the draft sentinel (never auto-sends)", () => {
    const ctx = makeIssue({ summary: "campaign plan", description: "email members about registration" });
    expect(buildCampaignPlan(ctx).executionMode).toBe("draft — human executes the send");
  });
});

describe("buildCampaignPlan — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-70", summary: "campaign", description: "" });
    expect(buildCampaignPlan(ctx).issueKey).toBe("AIGO-70");
  });

  it("channelSequence steps are numbered sequentially", () => {
    const ctx = makeIssue({ summary: "email sms campaign", description: "email and sms outreach" });
    const steps = buildCampaignPlan(ctx).channelSequence.map((s) => s.step);
    steps.forEach((s, i) => expect(s).toBe(i + 1));
  });

  it("guardrails include frequency cap and unsubscribe", () => {
    const ctx = makeIssue({ summary: "campaign", description: "email members" });
    const gl = buildCampaignPlan(ctx).guardrails.join(" ").toLowerCase();
    expect(gl).toContain("frequency");
    expect(gl).toContain("unsubscribe");
  });

  it("suppressionChecks cover all four default cases", () => {
    const ctx = makeIssue({ summary: "campaign", description: "email members" });
    const sc = buildCampaignPlan(ctx).suppressionChecks.join(" ").toLowerCase();
    expect(sc).toContain("enrolled");
    expect(sc).toContain("opted-out");
    expect(sc).toContain("frequency");
    expect(sc).toContain("ineligible");
  });

  it("trackingRequirements include conversion and guardrail events", () => {
    const ctx = makeIssue({ summary: "campaign", description: "email conversion tracking" });
    const tr = buildCampaignPlan(ctx).trackingRequirements.join(" ").toLowerCase();
    expect(tr).toContain("conversion");
    expect(tr).toContain("guardrail");
  });
});

describe("buildCampaignPlan — channel detection and approvals", () => {
  it("defaults to Email when no channel keyword present", () => {
    const ctx = makeIssue({ summary: "outreach campaign segment objective", description: "notify members" });
    const channels = buildCampaignPlan(ctx).channelSequence.map((s) => s.channel);
    expect(channels).toContain("Email");
  });

  it("detects SMS channel and adds TCPA approval", () => {
    const ctx = makeIssue({ summary: "sms outreach campaign segment", description: "sms text message outreach segment objective" });
    const plan = buildCampaignPlan(ctx);
    const channels = plan.channelSequence.map((s) => s.channel);
    expect(channels).toContain("SMS");
    expect(plan.approvalsRequired.join(" ")).toContain("TCPA");
  });

  it("detects Email channel and adds CAN-SPAM approval", () => {
    const ctx = makeIssue({ summary: "email campaign segment", description: "email outreach segment objective" });
    const plan = buildCampaignPlan(ctx);
    expect(plan.approvalsRequired.join(" ")).toContain("CAN-SPAM");
  });

  it("adds claims review approval when risky health language present", () => {
    const ctx = makeIssue({
      summary: "email campaign segment",
      description: "email outreach segment objective. guaranteed reversal of diabetes."
    });
    const plan = buildCampaignPlan(ctx);
    expect(plan.approvalsRequired.join(" ").toLowerCase()).toContain("claims");
  });

  it("always includes human go/no-go approval", () => {
    const ctx = makeIssue({ summary: "campaign", description: "email members" });
    const plan = buildCampaignPlan(ctx);
    expect(plan.approvalsRequired.join(" ").toLowerCase()).toContain("go/no-go");
  });
});

describe("buildCampaignPlan — readiness", () => {
  it("not ready when no audience/segment referenced", () => {
    const ctx = makeIssue({ summary: "campaign goal objective", description: "outreach for registration conversion" });
    const plan = buildCampaignPlan(ctx);
    expect(plan.notReadyReasons.some((r) => r.toLowerCase().includes("audience"))).toBe(true);
    expect(plan.readyToRequestSend).toBe(false);
  });

  it("not ready when no objective stated", () => {
    const ctx = makeIssue({ summary: "campaign for the segment audience", description: "outreach to the segment list" });
    const plan = buildCampaignPlan(ctx);
    expect(plan.notReadyReasons.some((r) => r.toLowerCase().includes("objective"))).toBe(true);
  });

  it("ready when both audience and objective are present", () => {
    const ctx = makeIssue({
      summary: "email campaign",
      description: "outreach to the eligible segment audience for registration conversion signup goal",
    });
    const plan = buildCampaignPlan(ctx);
    expect(plan.readyToRequestSend).toBe(true);
    expect(plan.notReadyReasons).toEqual([]);
  });
});
