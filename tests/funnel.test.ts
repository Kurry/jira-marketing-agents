import { describe, it, expect } from "vitest";
import { analyzeFunnelFriction } from "../src/funnel";
import { makeIssue } from "./helpers";

describe("analyzeFunnelFriction — existing", () => {
  it("identifies an engineering work type for a broken/error step", () => {
    const ctx = makeIssue({
      summary: "Account creation page throws a 500 error",
      description: "Users on the registration form hit an error and cannot continue.",
    });
    const result = analyzeFunnelFriction(ctx);
    expect(result.workType).toBe("Engineering");
    expect(result.affectedStep).toBe("Account creation");
  });

  it("identifies analytics work type when tracking is misfiring", () => {
    const ctx = makeIssue({
      summary: "Signup event not firing",
      description: "Our tracking shows no events for the email capture step; attribution looks off.",
    });
    const result = analyzeFunnelFriction(ctx);
    expect(result.workType).toBe("Analytics");
  });

  it("captures quantitative evidence and percentages", () => {
    const ctx = makeIssue({
      summary: "Drop-off at payment",
      description: "We see a 40% drop-off at the payment step on mobile.",
    });
    const result = analyzeFunnelFriction(ctx);
    expect(result.affectedStep).toBe("Payment");
    expect(result.evidence.join(" ")).toContain("40%");
  });
});

describe("analyzeFunnelFriction — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-55", summary: "funnel issue", description: "" });
    expect(analyzeFunnelFriction(ctx).issueKey).toBe("AIGO-55");
  });

  it("qaRequirements cover mobile/desktop and tracking", () => {
    const ctx = makeIssue({ summary: "funnel friction", description: "" });
    const qa = analyzeFunnelFriction(ctx).qaRequirements.join(" ").toLowerCase();
    expect(qa).toContain("mobile");
    expect(qa).toContain("tracking");
  });

  it("acceptanceCriteria mentions the affected step name", () => {
    const ctx = makeIssue({ summary: "payment broken checkout", description: "payment billing card error" });
    const result = analyzeFunnelFriction(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("payment");
  });
});

describe("analyzeFunnelFriction — step detection", () => {
  const cases: Array<{ desc: string; text: string; expected: string }> = [
    { desc: "landing page", text: "drop-off on landing page", expected: "Landing page" },
    { desc: "email capture", text: "email capture field not working", expected: "Email capture" },
    { desc: "eligibility verification", text: "eligibility verification step broken", expected: "Eligibility / verification" },
    { desc: "confirmation", text: "thank you confirmation screen missing", expected: "Confirmation" },
    { desc: "unspecified fallback", text: "general friction in the flow", expected: "Unspecified step" },
  ];

  for (const { desc, text, expected } of cases) {
    it(`detects '${desc}'`, () => {
      const ctx = makeIssue({ summary: text, description: text });
      expect(analyzeFunnelFriction(ctx).affectedStep).toBe(expected);
    });
  }
});

describe("analyzeFunnelFriction — work type detection", () => {
  it("detects Copy work type", () => {
    const ctx = makeIssue({ summary: "CTA copy confusing text headline", description: "wording is confusing on the cta text" });
    expect(analyzeFunnelFriction(ctx).workType).toBe("Copy");
  });

  it("detects Product work type", () => {
    const ctx = makeIssue({ summary: "UX flow layout button", description: "form field validation ux layout" });
    expect(analyzeFunnelFriction(ctx).workType).toBe("Product");
  });

  it("returns Unknown when no work-type signal present", () => {
    const ctx = makeIssue({ summary: "general friction", description: "users are dropping off" });
    expect(analyzeFunnelFriction(ctx).workType).toBe("Unknown");
  });
});

describe("analyzeFunnelFriction — evidence collection", () => {
  it("adds drop-off evidence when abandonment keyword present", () => {
    const ctx = makeIssue({ summary: "drop-off at step", description: "users are abandoning the form" });
    const ev = analyzeFunnelFriction(ctx).evidence.join(" ").toLowerCase();
    expect(ev).toContain("drop-off");
  });

  it("adds mobile evidence when device keyword present", () => {
    const ctx = makeIssue({ summary: "funnel friction", description: "issue on mobile ios android devices" });
    const ev = analyzeFunnelFriction(ctx).evidence.join(" ").toLowerCase();
    expect(ev).toContain("mobile");
  });

  it("falls back to analytics prompt when no evidence present", () => {
    const ctx = makeIssue({ summary: "funnel friction", description: "just a vague report" });
    const ev = analyzeFunnelFriction(ctx).evidence.join(" ").toLowerCase();
    expect(ev).toContain("analytics");
  });
});
