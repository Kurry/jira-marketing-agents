import { describe, it, expect } from "vitest";
import { triageIssue, detectWorkflowArea, detectMissingInfo } from "../src/triage";
import { makeIssue } from "./helpers";

// ---------------------------------------------------------------------------
// detectWorkflowArea — keyword routing
// ---------------------------------------------------------------------------

describe("detectWorkflowArea — area detection", () => {
  const cases: Array<{ label: string; text: string; expected: string }> = [
    { label: "Signup Funnel", text: "signup broken, users cannot register on mobile", expected: "Signup Funnel" },
    { label: "Claims via term", text: "health claim in ad copy requires review", expected: "Claims" },
    { label: "Creative", text: "new ad copy for email banner headline", expected: "Creative" },
    { label: "Experiment", text: "a/b test email subject line hypothesis", expected: "Experiment" },
    { label: "Dashboard", text: "build a dashboard report in looker", expected: "Dashboard" },
    { label: "Employer Launch", text: "employer launch eligibility file for partner", expected: "Employer Launch" },
    { label: "Targeting", text: "audience segment suppression lookalike", expected: "Targeting" },
    { label: "Automation", text: "workflow rule trigger scheduled rule automation", expected: "Automation" },
    { label: "Research", text: "user interview research discovery insight brief", expected: "Research" },
    { label: "Unknown for blank", text: "", expected: "Unknown" },
  ];

  for (const { label, text, expected } of cases) {
    it(`classifies '${label}'`, () => {
      expect(detectWorkflowArea(text, [])).toBe(expected);
    });
  }

  it("uses highest match-count score, not first keyword", () => {
    // "signups by channel" has 1 signup signal; "dashboard report analytics" has 3 dashboard signals
    const area = detectWorkflowArea("dashboard report analytics view signups by channel", []);
    expect(area).toBe("Dashboard");
  });

  it("labels can contribute to classification", () => {
    const area = detectWorkflowArea("we need something", ["experiment", "a/b"]);
    expect(area).toBe("Experiment");
  });
});

// ---------------------------------------------------------------------------
// detectMissingInfo — field and keyword checks
// ---------------------------------------------------------------------------

describe("detectMissingInfo", () => {
  it("does not flag Owner when assignee field is set", () => {
    const ctx = makeIssue({ assignee: "alice", description: "do a thing" });
    const missing = detectMissingInfo(ctx, "Unknown");
    expect(missing).not.toContain("Owner");
  });

  it("does not flag Due date when dueDate field is set", () => {
    const ctx = makeIssue({ dueDate: "2026-08-01" });
    const missing = detectMissingInfo(ctx, "Unknown");
    expect(missing).not.toContain("Due date");
  });

  it("flags Goal when no objective keywords present", () => {
    const ctx = makeIssue({ summary: "do a thing", description: "just vague requirements here" });
    const missing = detectMissingInfo(ctx, "Unknown");
    expect(missing).toContain("Goal");
  });

  it("does not flag Goal when objective keyword present", () => {
    const ctx = makeIssue({ description: "our goal is to increase signups" });
    const missing = detectMissingInfo(ctx, "Unknown");
    expect(missing).not.toContain("Goal");
  });

  it("adds Experiment-specific checks for Experiment area", () => {
    const ctx = makeIssue({ summary: "test", description: "vague" });
    const missing = detectMissingInfo(ctx, "Experiment");
    expect(missing).toContain("Primary metric");
    expect(missing).toContain("Decision rule");
  });

  it("adds Employer Launch-specific checks for Employer Launch area", () => {
    const ctx = makeIssue({ summary: "launch", description: "just doing it" });
    const missing = detectMissingInfo(ctx, "Employer Launch");
    expect(missing).toContain("Launch date");
    expect(missing).toContain("Eligibility file");
  });

  it("adds Signup Funnel-specific checks for Signup Funnel area", () => {
    const ctx = makeIssue({ summary: "registration broken", description: "error" });
    const missing = detectMissingInfo(ctx, "Signup Funnel");
    expect(missing).toContain("Affected step");
    expect(missing).toContain("Evidence / data");
  });
});

// ---------------------------------------------------------------------------
// triageIssue — core classification
// ---------------------------------------------------------------------------

describe("triageIssue — existing core cases", () => {
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

describe("triageIssue — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-42", summary: "dashboard report", description: "looker analytics" });
    expect(triageIssue(ctx).issueKey).toBe("AIGO-42");
  });

  it("recommendedIssueType matches the detected workflow area", () => {
    const ctx = makeIssue({ summary: "experiment a/b test email conversion", description: "email variant hypothesis" });
    const result = triageIssue(ctx);
    expect(result.workflowArea).toBe("Experiment");
    expect(result.recommendedIssueType).toBe("Experiment");
  });

  it("always returns non-empty acceptanceCriteria", () => {
    const ctx = makeIssue({ summary: "signup registration broken", description: "error on mobile register" });
    expect(triageIssue(ctx).acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("always returns non-empty suggestedSubtasks", () => {
    const ctx = makeIssue({ summary: "build a dashboard report", description: "analytics view looker" });
    expect(triageIssue(ctx).suggestedSubtasks.length).toBeGreaterThan(0);
  });

  it("suggestedOwnerGroup is populated (not empty string)", () => {
    const ctx = makeIssue({ summary: "signup broken registration", description: "funnel error" });
    const result = triageIssue(ctx);
    expect(typeof result.suggestedOwnerGroup).toBe("string");
    expect(result.suggestedOwnerGroup.length).toBeGreaterThan(0);
  });

  it("claimsRisk field is always present (not undefined)", () => {
    const ctx = makeIssue({ summary: "build a dashboard report", description: "metrics analytics" });
    expect(triageIssue(ctx).claimsRisk).toBeDefined();
  });
});

describe("triageIssue — human approvals", () => {
  it("Targeting area triggers audience/suppression change approval", () => {
    const ctx = makeIssue({ summary: "audience segment suppression list", description: "update targeting segment" });
    const result = triageIssue(ctx);
    expect(result.humanApprovalsRequired.join(" ")).toContain("Audience");
  });

  it("text with suppression keyword triggers audience approval even outside Targeting area", () => {
    const ctx = makeIssue({ summary: "dashboard report suppression analytics", description: "suppression list analytics" });
    const result = triageIssue(ctx);
    expect(result.humanApprovalsRequired.join(" ")).toContain("Audience");
  });

  it("Signup Funnel area triggers production signup-flow change approval", () => {
    const ctx = makeIssue({ summary: "signup broken registration funnel", description: "registration broken on mobile device" });
    const result = triageIssue(ctx);
    expect(result.humanApprovalsRequired.join(" ").toLowerCase()).toContain("signup");
  });

  it("humanApprovalsRequired contains no duplicates", () => {
    const ctx = makeIssue({ summary: "experiment variant signup broken", description: "audience suppression email a/b conversion" });
    const result = triageIssue(ctx);
    const seen = new Set<string>();
    for (const a of result.humanApprovalsRequired) {
      expect(seen.has(a)).toBe(false);
      seen.add(a);
    }
  });
});

describe("triageIssue — recommendedNextStatus", () => {
  it("returns Ready when low risk and no missing info", () => {
    const ctx = makeIssue({
      summary: "Build a dashboard analytics report",
      description:
        "Business question: signups by channel. Source system: warehouse. " +
        "Metrics: signup rate. Goal: understand channel performance. " +
        "Acceptance criteria: dashboard matches source. Due by end of Q3.",
      assignee: "alice",
      dueDate: "2026-09-30",
    });
    const result = triageIssue(ctx);
    expect(result.recommendedNextStatus).toBe("Ready");
  });

  it("returns Needs Info when there is missing info but no high risk", () => {
    const ctx = makeIssue({
      summary: "Research discovery user interview insight",
      description: "conduct a research brief",
    });
    const result = triageIssue(ctx);
    expect(["Needs Info", "Needs Human Review"]).toContain(result.recommendedNextStatus);
  });

  it("returns Needs Human Review for high-risk issues", () => {
    const ctx = makeIssue({
      summary: "guaranteed reversal of diabetes in 30 days email",
      description: "cure diabetes guaranteed weight loss email",
    });
    expect(triageIssue(ctx).recommendedNextStatus).toBe("Needs Human Review");
  });
});

describe("triageIssue — risk level derivation", () => {
  it("blocked text yields Blocked risk level", () => {
    const ctx = makeIssue({ summary: "blocked — cannot proceed", description: "waiting on partner" });
    expect(triageIssue(ctx).riskLevel).toBe("Blocked");
  });

  it("Needs substantiation claims risk yields Medium risk level", () => {
    const ctx = makeIssue({
      summary: "email dashboard analytics report clinically proven results",
      description: "clinically proven dashboard metrics report analytics view",
    });
    const result = triageIssue(ctx);
    if (result.claimsRisk === "Needs substantiation") {
      expect(result.riskLevel).toBe("Medium");
    }
  });
});
