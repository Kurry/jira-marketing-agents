import { describe, it, expect } from "vitest";
import {
  assessSprintRisk,
  breakDownEpic,
  generateQATestCases,
  prioritizeBacklog,
} from "../src/backlog";
import { makeIssue } from "./helpers";

describe("assessSprintRisk", () => {
  it("flags missing acceptance criteria and owner", () => {
    const ctx = makeIssue({ summary: "Do the thing", description: "No details." });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).toContain("acceptance criteria");
    expect(result.risks.join(" ")).toContain("owner");
    expect(["Medium", "High"]).toContain(result.riskLevel);
  });

  it("marks blocked issues as Blocked", () => {
    const ctx = makeIssue({
      summary: "Launch email",
      description: "Blocked: waiting on legal sign-off.",
    });
    const result = assessSprintRisk(ctx);
    expect(result.riskLevel).toBe("Blocked");
    expect(result.recommendedStatus).toBe("Blocked");
  });

  it("flags claims review not started for risky copy", () => {
    const ctx = makeIssue({
      summary: "Creative",
      description: "Copy says cure diabetes. Owner Bob. Acceptance criteria defined.",
      assignee: "Bob",
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).toContain("Claims review required");
  });
});

describe("breakDownEpic", () => {
  it("produces the standard growth child stories", () => {
    const ctx = makeIssue({ summary: "Q3 acquisition push" });
    const result = breakDownEpic(ctx);
    const titles = result.proposedStories.map((s) => s.title).join(" ");
    expect(titles).toContain("Data setup");
    expect(titles).toContain("Claims review");
    expect(titles).toContain("QA");
    expect(titles).toContain("Launch & readout");
  });
});

describe("generateQATestCases", () => {
  it("always covers happy path, edge cases, and tracking", () => {
    const ctx = makeIssue({ summary: "Signup CTA change" });
    const result = generateQATestCases(ctx);
    const titles = result.testCases.map((t) => t.title.toLowerCase()).join(" ");
    expect(titles).toContain("happy path");
    expect(titles).toContain("edge cases");
    expect(titles).toContain("tracking");
  });

  it("adds mobile/device checks for funnel issues", () => {
    const ctx = makeIssue({ summary: "Fix signup funnel step on mobile" });
    const result = generateQATestCases(ctx);
    const titles = result.testCases.map((t) => t.title.toLowerCase()).join(" ");
    expect(titles).toContain("mobile");
  });
});

describe("prioritizeBacklog", () => {
  it("orders P0 before P3", () => {
    const ordered = prioritizeBacklog([
      { key: "AIGO-1", summary: "Research future ideas" },
      { key: "AIGO-2", summary: "Production outage on signup" },
      { key: "AIGO-3", summary: "Standard creative request" },
    ]);
    expect(ordered[0].key).toBe("AIGO-2");
    expect(ordered[0].priority).toBe("P0");
    expect(ordered[ordered.length - 1].priority).toBe("P3");
  });
});
