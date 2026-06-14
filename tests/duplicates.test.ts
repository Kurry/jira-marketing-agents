import { describe, it, expect } from "vitest";
import { findDuplicates, CandidateIssue } from "../src/duplicates";
import { makeIssue } from "./helpers";

describe("findDuplicates", () => {
  const ctx = makeIssue({
    issueKey: "AIGO-100",
    summary: "Signup page broken on mobile Safari",
    description: "Users on mobile Safari cannot complete the signup form.",
    labels: ["funnel", "mobile"],
  });

  it("returns high similarity for a near-identical summary", () => {
    const candidates: CandidateIssue[] = [
      {
        key: "AIGO-101",
        summary: "Signup page broken on mobile Safari for new users",
        status: "Open",
        labels: ["funnel", "mobile"],
      },
    ];
    const result = findDuplicates(ctx, candidates);
    expect(result.possibleDuplicates.length).toBe(1);
    expect(result.possibleDuplicates[0].similarityScore).toBeGreaterThan(0.4);
  });

  it("returns no duplicates for an unrelated summary", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-102", summary: "Quarterly revenue dashboard refresh cadence", status: "Open" },
    ];
    const result = findDuplicates(ctx, candidates);
    expect(result.possibleDuplicates.length).toBe(0);
  });

  it("excludes the issue itself from results", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-100", summary: "Signup page broken on mobile Safari", status: "Open" },
    ];
    const result = findDuplicates(ctx, candidates);
    expect(result.possibleDuplicates.find((d) => d.key === "AIGO-100")).toBeUndefined();
  });
});
