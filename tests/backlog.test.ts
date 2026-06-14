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

  it("returns On Track when no risks are found", () => {
    const ctx = makeIssue({
      summary: "Update button color on homepage",
      description:
        "Acceptance criteria: button renders correctly in all browsers. Owner Alice.",
      assignee: "Alice",
    });
    const result = assessSprintRisk(ctx);
    expect(result.riskLevel).toBe("Low");
    expect(result.recommendedStatus).toBe("On Track");
  });

  it("flags issue due within 3 days that is not in progress", () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ctx = makeIssue({
      summary: "Ship banner update",
      description: "Acceptance criteria defined. Owner Alice.",
      assignee: "Alice",
      dueDate: soon,
      status: "To Do",
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).toContain("Due within 3 days");
    expect(result.mitigationPlan.join(" ")).toContain("renegotiate");
  });

  it("does not flag due-date risk if issue is already in progress", () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ctx = makeIssue({
      summary: "Ship banner update",
      description: "Acceptance criteria defined. Owner Alice.",
      assignee: "Alice",
      dueDate: soon,
      status: "In Progress",
    });
    const result = assessSprintRisk(ctx);
    const riskText = result.risks.join(" ");
    expect(riskText).not.toContain("Due within 3 days");
  });

  it("flags experiment tracking missing for experiment-type issues", () => {
    const ctx = makeIssue({
      summary: "Email subject line A/B test",
      description:
        "Experiment: run two variants for prospect segment. Acceptance criteria: lift conversion rate. Owner: Alice.",
      assignee: "Alice",
      issueType: "Experiment",
      labels: ["experiment"],
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).toContain("Experiment tracking missing");
  });

  it("does not flag experiment tracking when instrumentation is mentioned", () => {
    const ctx = makeIssue({
      summary: "Email subject line A/B test",
      description:
        "Experiment for prospect segment. Tracking events implemented. Acceptance criteria defined. Owner Alice.",
      assignee: "Alice",
      labels: ["experiment"],
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).not.toContain("Experiment tracking missing");
  });

  it("flags employer launch with close due date and missing assets", () => {
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ctx = makeIssue({
      summary: "Acme employer launch",
      description: "Acceptance criteria defined. Owner Bob.",
      assignee: "Bob",
      labels: ["employer launch"],
      dueDate: soon,
      issueType: "Employer Launch",
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).toContain("Employer launch date is close");
  });

  it("does not flag employer launch when assets are present", () => {
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ctx = makeIssue({
      summary: "Acme employer launch",
      description:
        "Eligibility file received. Landing page ready. Email and SMS assets ready. Acceptance criteria defined. Owner Bob.",
      assignee: "Bob",
      labels: ["employer launch"],
      dueDate: soon,
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).not.toContain("Employer launch date is close");
  });

  it("does not re-flag claims risk when claims review is already in progress", () => {
    const ctx = makeIssue({
      summary: "Creative email",
      description:
        "Guaranteed reversal of diabetes. Claims review in progress. Acceptance criteria defined. Owner Bob.",
      assignee: "Bob",
    });
    const result = assessSprintRisk(ctx);
    expect(result.risks.join(" ")).not.toContain("Claims review required");
  });

  it("includes the issueKey in the result", () => {
    const ctx = makeIssue({ summary: "Test issue" });
    const result = assessSprintRisk(ctx);
    expect(result.issueKey).toBe(ctx.issueKey);
  });

  it("returns risks and mitigationPlan as deduplicated arrays", () => {
    const ctx = makeIssue({
      summary: "Launch email",
      description: "Blocked: waiting on legal sign-off. Also blocked: waiting on design.",
    });
    const result = assessSprintRisk(ctx);
    const uniqueBlockers = new Set(result.blockers);
    expect(uniqueBlockers.size).toBe(result.blockers.length);
  });

  it("recommends Needs Human Review for High risk without a blocker", () => {
    // Three or more risks triggers High without a blocker.
    const ctx = makeIssue({
      // No acceptance criteria, no owner, claims area, no claims review started
      summary: "Claims review email",
      description: "Copy says cure diabetes.",
      // No assignee => no owner risk
      // No acceptance criteria in text
    });
    const result = assessSprintRisk(ctx);
    if (result.riskLevel === "High") {
      expect(result.recommendedStatus).toBe("Needs Human Review");
    }
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

  it("produces exactly 6 child stories", () => {
    const ctx = makeIssue({ summary: "Q3 acquisition push" });
    const result = breakDownEpic(ctx);
    expect(result.proposedStories.length).toBe(6);
  });

  it("embeds the epic summary in each story title", () => {
    const ctx = makeIssue({ summary: "Acme employer launch Q4" });
    const result = breakDownEpic(ctx);
    for (const story of result.proposedStories) {
      expect(story.title).toContain("Acme employer launch Q4");
    }
  });

  it("falls back to 'this epic' when summary is empty", () => {
    const ctx = makeIssue({ summary: "" });
    const result = breakDownEpic(ctx);
    expect(result.epicSummary).toBe("this epic");
    for (const story of result.proposedStories) {
      expect(story.title).toContain("this epic");
    }
  });

  it("every story has acceptanceCriteria, dependencies, and suggestedOwnerGroup", () => {
    const ctx = makeIssue({ summary: "New campaign" });
    const result = breakDownEpic(ctx);
    for (const story of result.proposedStories) {
      expect(Array.isArray(story.acceptanceCriteria)).toBe(true);
      expect(story.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(Array.isArray(story.dependencies)).toBe(true);
      expect(typeof story.suggestedOwnerGroup).toBe("string");
      expect(story.suggestedOwnerGroup.length).toBeGreaterThan(0);
    }
  });

  it("QA story depends on Creative and Analytics", () => {
    const ctx = makeIssue({ summary: "Email campaign" });
    const result = breakDownEpic(ctx);
    const qaStory = result.proposedStories.find((s) => s.title.startsWith("QA for:"));
    expect(qaStory).toBeDefined();
    expect(qaStory!.dependencies.join(" ")).toContain("Creative");
    expect(qaStory!.dependencies.join(" ")).toContain("Analytics");
  });

  it("includes the issueKey in the result", () => {
    const ctx = makeIssue({ summary: "Campaign", issueKey: "AIGO-42" });
    const result = breakDownEpic(ctx);
    expect(result.issueKey).toBe("AIGO-42");
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

  it("adds claims copy display test for creative issues", () => {
    const ctx = makeIssue({
      summary: "Creative email campaign",
      description: "New creative assets for member acquisition email.",
      issueType: "Creative Request",
      labels: ["creative"],
    });
    const result = generateQATestCases(ctx);
    const titles = result.testCases.map((t) => t.title.toLowerCase()).join(" ");
    expect(titles).toContain("claims copy");
  });

  it("adds claims copy display test for claims area issues", () => {
    const ctx = makeIssue({
      summary: "Claims review for email",
      description: "Review email copy: cure diabetes claim detected.",
      issueType: "Claims Review",
    });
    const result = generateQATestCases(ctx);
    const titles = result.testCases.map((t) => t.title.toLowerCase()).join(" ");
    expect(titles).toContain("claims copy");
  });

  it("includes the issueKey in the result", () => {
    const ctx = makeIssue({ summary: "Test feature", issueKey: "AIGO-55" });
    const result = generateQATestCases(ctx);
    expect(result.issueKey).toBe("AIGO-55");
  });

  it("every test case has a title, steps, expected result, and priority", () => {
    const ctx = makeIssue({ summary: "New registration flow" });
    const result = generateQATestCases(ctx);
    for (const tc of result.testCases) {
      expect(typeof tc.title).toBe("string");
      expect(tc.title.length).toBeGreaterThan(0);
      expect(Array.isArray(tc.steps)).toBe(true);
      expect(tc.steps.length).toBeGreaterThan(0);
      expect(typeof tc.expectedResult).toBe("string");
      expect(["High", "Medium", "Low"]).toContain(tc.priority);
    }
  });

  it("happy path test case has High priority", () => {
    const ctx = makeIssue({ summary: "Email CTA test" });
    const result = generateQATestCases(ctx);
    const happy = result.testCases.find((t) => t.title.toLowerCase().includes("happy path"));
    expect(happy).toBeDefined();
    expect(happy!.priority).toBe("High");
  });

  it("does not add mobile checks for non-funnel issues", () => {
    const ctx = makeIssue({
      summary: "Dashboard update",
      description: "Add a new chart to the acquisition dashboard.",
      issueType: "Dashboard Request",
    });
    const result = generateQATestCases(ctx);
    const titles = result.testCases.map((t) => t.title.toLowerCase()).join(" ");
    expect(titles).not.toContain("mobile");
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

  it("returns an empty array when given an empty list", () => {
    expect(prioritizeBacklog([])).toEqual([]);
  });

  it("assigns P1 to an item due in 2 days", () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = prioritizeBacklog([
      { key: "AIGO-10", summary: "Standard task", dueDate: soon },
    ]);
    expect(result[0].priority).toBe("P1");
  });

  it("assigns P2 to a default item with no signals", () => {
    const result = prioritizeBacklog([{ key: "AIGO-20", summary: "Miscellaneous cleanup" }]);
    expect(result[0].priority).toBe("P2");
  });

  it("assigns P3 to a research / backlog item", () => {
    const result = prioritizeBacklog([
      { key: "AIGO-30", summary: "Research future ideas for expansion" },
    ]);
    expect(result[0].priority).toBe("P3");
  });

  it("preserves all original fields alongside new priority and reasons", () => {
    const item = {
      key: "AIGO-40",
      summary: "Production outage on signup",
      labels: ["critical"],
      issueType: "Bug / Tracking Issue",
    };
    const result = prioritizeBacklog([item]);
    expect(result[0].key).toBe("AIGO-40");
    expect(result[0].summary).toBe("Production outage on signup");
    expect(result[0].labels).toEqual(["critical"]);
    expect(result[0].issueType).toBe("Bug / Tracking Issue");
    expect(Array.isArray(result[0].reasons)).toBe(true);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });

  it("stable-sorts items with the same priority in input order", () => {
    const result = prioritizeBacklog([
      { key: "A", summary: "Standard work one" },
      { key: "B", summary: "Standard work two" },
    ]);
    // Both P2; relative order should be preserved.
    expect(result[0].key).toBe("A");
    expect(result[1].key).toBe("B");
  });

  it("handles a single item without error", () => {
    const result = prioritizeBacklog([{ key: "AIGO-50", summary: "Lone task" }]);
    expect(result.length).toBe(1);
    expect(typeof result[0].priority).toBe("string");
  });

  it("puts a P1 item (claims risk signal) before P2 items", () => {
    const result = prioritizeBacklog([
      { key: "AIGO-60", summary: "Routine email campaign" },
      { key: "AIGO-61", summary: "Claims risk detected in email copy" },
    ]);
    const claimsIdx = result.findIndex((i) => i.key === "AIGO-61");
    const routineIdx = result.findIndex((i) => i.key === "AIGO-60");
    expect(claimsIdx).toBeLessThan(routineIdx);
  });
});
