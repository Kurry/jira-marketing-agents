import { describe, it, expect } from "vitest";
import { buildWeeklyReadout, ReadoutIssue } from "../src/readout";

const issues: ReadoutIssue[] = [
  { key: "AIGO-1", summary: "Shipped new landing page", status: "Done", issueType: "Growth Task" },
  { key: "AIGO-2", summary: "Email experiment", status: "In Progress", issueType: "Experiment" },
  { key: "AIGO-3", summary: "Claims review for SMS", status: "Blocked", issueType: "Claims Review" },
  { key: "AIGO-4", summary: "Acme launch", status: "In Progress", issueType: "Employer Launch" },
  { key: "AIGO-5", summary: "Q3 budget decision", status: "Open", issueType: "Decision Memo" },
];

describe("buildWeeklyReadout — basic bucketing", () => {
  it("buckets work by status and type", () => {
    const r = buildWeeklyReadout(issues, 7);
    expect(r.completedWork.some((l) => l.includes("AIGO-1"))).toBe(true);
    expect(r.blockedWork.some((l) => l.includes("AIGO-3"))).toBe(true);
    expect(r.experimentsToCall.some((l) => l.includes("AIGO-2"))).toBe(true);
    expect(r.claimsBottlenecks.some((l) => l.includes("AIGO-3"))).toBe(true);
    expect(r.employerLaunchRisks.some((l) => l.includes("AIGO-4"))).toBe(true);
    expect(r.decisionsNeeded.some((l) => l.includes("AIGO-5"))).toBe(true);
  });

  it("returns at most three top actions and labels the period", () => {
    const r = buildWeeklyReadout(issues, 7);
    expect(r.topThreeActions.length).toBeLessThanOrEqual(3);
    expect(r.period).toContain("7");
  });

  it("returns all empty arrays for an empty issue list", () => {
    const r = buildWeeklyReadout([], 7);
    expect(r.completedWork).toEqual([]);
    expect(r.blockedWork).toEqual([]);
    expect(r.decisionsNeeded).toEqual([]);
    expect(r.claimsBottlenecks).toEqual([]);
    expect(r.experimentsToCall).toEqual([]);
    expect(r.employerLaunchRisks).toEqual([]);
    expect(r.highImpactFunnelIssues).toEqual([]);
    expect(r.topThreeActions).toEqual([]);
  });

  it("period string reflects the days parameter", () => {
    expect(buildWeeklyReadout([], 14).period).toContain("14");
    expect(buildWeeklyReadout([], 30).period).toContain("30");
  });
});

describe("buildWeeklyReadout — done status variants", () => {
  const doneStatuses = ["Done", "Closed", "Resolved", "Complete", "Shipped"];

  for (const status of doneStatuses) {
    it(`places '${status}' issues in completedWork`, () => {
      const r = buildWeeklyReadout([{ key: "A-1", summary: "thing", status, issueType: "Growth Task" }], 7);
      expect(r.completedWork.some((l) => l.includes("A-1"))).toBe(true);
    });
  }

  it("done issues are excluded from all other buckets", () => {
    const doneExperiment: ReadoutIssue = { key: "A-1", summary: "Done experiment", status: "Done", issueType: "Experiment" };
    const r = buildWeeklyReadout([doneExperiment], 7);
    expect(r.completedWork.some((l) => l.includes("A-1"))).toBe(true);
    expect(r.experimentsToCall.some((l) => l.includes("A-1"))).toBe(false);
    expect(r.blockedWork.some((l) => l.includes("A-1"))).toBe(false);
  });
});

describe("buildWeeklyReadout — blocked status variants", () => {
  const blockedStatuses = ["Blocked", "Waiting", "On Hold"];

  for (const status of blockedStatuses) {
    it(`places '${status}' issues in blockedWork`, () => {
      const r = buildWeeklyReadout([{ key: "B-1", summary: "stalled", status, issueType: "Growth Task" }], 7);
      expect(r.blockedWork.some((l) => l.includes("B-1"))).toBe(true);
    });
  }
});

describe("buildWeeklyReadout — label-based bucketing", () => {
  it("decision-needed label routes to decisionsNeeded", () => {
    const r = buildWeeklyReadout([{ key: "D-1", summary: "pricing call", status: "Open", issueType: "Task", labels: ["decision-needed"] }], 7);
    expect(r.decisionsNeeded.some((l) => l.includes("D-1"))).toBe(true);
  });

  it("claims-risk label routes to claimsBottlenecks", () => {
    const r = buildWeeklyReadout([{ key: "C-1", summary: "ad copy", status: "Open", issueType: "Task", labels: ["claims-risk"] }], 7);
    expect(r.claimsBottlenecks.some((l) => l.includes("C-1"))).toBe(true);
  });

  it("employer-launch label routes to employerLaunchRisks", () => {
    const r = buildWeeklyReadout([{ key: "E-1", summary: "Acme", status: "Open", issueType: "Task", labels: ["employer-launch"] }], 7);
    expect(r.employerLaunchRisks.some((l) => l.includes("E-1"))).toBe(true);
  });

  it("funnel label routes to highImpactFunnelIssues", () => {
    const r = buildWeeklyReadout([{ key: "F-1", summary: "signup page", status: "Open", issueType: "Task", labels: ["funnel"] }], 7);
    expect(r.highImpactFunnelIssues.some((l) => l.includes("F-1"))).toBe(true);
  });
});

describe("buildWeeklyReadout — issue type bucketing", () => {
  it("Signup Funnel issue type routes to highImpactFunnelIssues", () => {
    const r = buildWeeklyReadout([{ key: "SF-1", summary: "Funnel friction", status: "Open", issueType: "Signup Funnel" }], 7);
    expect(r.highImpactFunnelIssues.some((l) => l.includes("SF-1"))).toBe(true);
  });

  it("Employer Launch issue type routes to employerLaunchRisks", () => {
    const r = buildWeeklyReadout([{ key: "EL-1", summary: "New employer", status: "Open", issueType: "Employer Launch" }], 7);
    expect(r.employerLaunchRisks.some((l) => l.includes("EL-1"))).toBe(true);
  });
});

describe("buildWeeklyReadout — topThreeActions ordering and cap", () => {
  it("never exceeds 3 top actions even with many input issues", () => {
    const many: ReadoutIssue[] = Array.from({ length: 10 }, (_, i) => ({
      key: `A-${i}`,
      summary: `Issue ${i}`,
      status: "Blocked",
      issueType: "Decision Memo",
    }));
    const r = buildWeeklyReadout(many, 7);
    expect(r.topThreeActions.length).toBeLessThanOrEqual(3);
  });

  it("top actions reference blocked items first", () => {
    const mixed: ReadoutIssue[] = [
      { key: "B-1", summary: "Blocked task", status: "Blocked", issueType: "Growth Task" },
      { key: "D-1", summary: "Decision needed", status: "Open", issueType: "Decision Memo" },
    ];
    const r = buildWeeklyReadout(mixed, 7);
    const firstAction = r.topThreeActions[0] ?? "";
    expect(firstAction.toLowerCase()).toContain("unblock");
  });

  it("top actions include Decide entries when no blocked work", () => {
    const r = buildWeeklyReadout([{ key: "D-1", summary: "Go/No-go call", status: "Open", issueType: "Decision Memo" }], 7);
    expect(r.topThreeActions.some((a) => a.toLowerCase().includes("decide"))).toBe(true);
  });
});
