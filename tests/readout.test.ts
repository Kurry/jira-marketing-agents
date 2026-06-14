import { describe, it, expect } from "vitest";
import { buildWeeklyReadout, ReadoutIssue } from "../src/readout";

const issues: ReadoutIssue[] = [
  { key: "AIGO-1", summary: "Shipped new landing page", status: "Done", issueType: "Growth Task" },
  { key: "AIGO-2", summary: "Email experiment", status: "In Progress", issueType: "Experiment" },
  { key: "AIGO-3", summary: "Claims review for SMS", status: "Blocked", issueType: "Claims Review" },
  { key: "AIGO-4", summary: "Acme launch", status: "In Progress", issueType: "Employer Launch" },
  { key: "AIGO-5", summary: "Q3 budget decision", status: "Open", issueType: "Decision Memo" },
];

describe("buildWeeklyReadout", () => {
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
});
