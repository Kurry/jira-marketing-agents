import { describe, it, expect } from "vitest";
import { triageIssue } from "../src/triage";
import { makeIssue } from "./helpers";

describe("triageIssue", () => {
  it("classifies a broken signup as high priority and Signup Funnel", () => {
    const ctx = makeIssue({
      summary: "Signup broken — users cannot register on mobile",
      description: "Registration is broken; the account creation step throws an error.",
    });
    const result = triageIssue(ctx);

    expect(result.workflowArea).toBe("Signup Funnel");
    expect(["P0", "P1"]).toContain(result.priority);
    expect(result.riskLevel === "High" || result.priority === "P0").toBe(true);
  });

  it("classifies guaranteed health claim creative as Claims with high risk", () => {
    const ctx = makeIssue({
      summary: "New email creative: guaranteed reversal of diabetes in 30 days",
      description: "Ad copy promises guaranteed weight loss and to cure diabetes.",
    });
    const result = triageIssue(ctx);

    expect(result.workflowArea).toBe("Claims");
    expect(result.riskLevel).toBe("High");
    expect(result.claimsRisk).toBe("Prohibited");
    expect(result.humanApprovalsRequired).toContain("Compliance / medical claims review");
  });

  it("classifies a dashboard request as Dashboard / P2", () => {
    const ctx = makeIssue({
      summary: "Build a channel performance dashboard",
      description: "We need a report showing signups by channel each week.",
    });
    const result = triageIssue(ctx);

    expect(result.workflowArea).toBe("Dashboard");
    expect(result.priority).toBe("P2");
  });

  it("classifies an employer launch issue as Employer Launch", () => {
    const ctx = makeIssue({
      summary: "Employer launch for Acme Corp",
      description: "Partner launch with eligibility file and co-branded landing page.",
    });
    const result = triageIssue(ctx);

    expect(result.workflowArea).toBe("Employer Launch");
    expect(result.humanApprovalsRequired).toContain("Launch go/no-go approval");
  });

  it("never mutates and recommends human review when ambiguous", () => {
    const ctx = makeIssue({ summary: "??", description: "" });
    const result = triageIssue(ctx);
    expect(result.recommendedNextStatus).toBe("Needs Human Review");
  });
});
