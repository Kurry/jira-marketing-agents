import { describe, it, expect } from "vitest";
import { analyzeFunnelFriction } from "../src/funnel";
import { makeIssue } from "./helpers";

describe("analyzeFunnelFriction", () => {
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
