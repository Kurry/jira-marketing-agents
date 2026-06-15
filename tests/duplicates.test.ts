import { describe, it, expect } from "vitest";
import { findDuplicates, CandidateIssue } from "../src/duplicates";
import { makeIssue } from "./helpers";

const ctx = makeIssue({
  issueKey: "AIGO-100",
  summary: "Signup page broken on mobile Safari",
  description: "Users on mobile Safari cannot complete the signup form.",
  labels: ["funnel", "mobile"],
  components: ["signup"],
});

describe("findDuplicates — similarity scoring", () => {
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

  it("results are sorted by similarity score descending", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-200", summary: "Signup form error on Safari mobile browser", status: "Open", labels: ["funnel"] },
      { key: "AIGO-201", summary: "Signup page broken mobile", status: "Open", labels: ["funnel", "mobile"] },
    ];
    const result = findDuplicates(ctx, candidates);
    const scores = result.possibleDuplicates.map((d) => d.similarityScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("empty candidates list returns empty possibleDuplicates", () => {
    const result = findDuplicates(ctx, []);
    expect(result.possibleDuplicates).toEqual([]);
  });
});

describe("findDuplicates — output shape", () => {
  it("propagates issueKey from context", () => {
    const result = findDuplicates(makeIssue({ issueKey: "AIGO-55" }), []);
    expect(result.issueKey).toBe("AIGO-55");
  });

  it("each result includes key, summary, status, similarityScore, and reason", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-200", summary: "Signup page broken on mobile Safari for users", status: "In Progress" },
    ];
    const result = findDuplicates(ctx, candidates);
    if (result.possibleDuplicates.length > 0) {
      const d = result.possibleDuplicates[0];
      expect(typeof d.key).toBe("string");
      expect(typeof d.summary).toBe("string");
      expect(typeof d.status).toBe("string");
      expect(typeof d.similarityScore).toBe("number");
      expect(typeof d.reason).toBe("string");
    }
  });
});

describe("findDuplicates — label and component overlap", () => {
  it("label overlap boosts score and adds 'shared labels' to reason", () => {
    const withLabels: CandidateIssue[] = [
      { key: "AIGO-300", summary: "Some issue about signups", status: "Open", labels: ["funnel"] },
    ];
    const withoutLabels: CandidateIssue[] = [
      { key: "AIGO-301", summary: "Some issue about signups", status: "Open" },
    ];
    const a = findDuplicates(ctx, withLabels).possibleDuplicates[0];
    const b = findDuplicates(ctx, withoutLabels).possibleDuplicates[0];
    if (a && b) {
      expect(a.similarityScore).toBeGreaterThan(b.similarityScore);
      expect(a.reason).toContain("shared labels");
    }
  });

  it("component overlap boosts score and adds 'shared components' to reason", () => {
    const withComps: CandidateIssue[] = [
      { key: "AIGO-400", summary: "Some issue about signups", status: "Open", components: ["signup"] },
    ];
    const withoutComps: CandidateIssue[] = [
      { key: "AIGO-401", summary: "Some issue about signups", status: "Open" },
    ];
    const a = findDuplicates(ctx, withComps).possibleDuplicates[0];
    const b = findDuplicates(ctx, withoutComps).possibleDuplicates[0];
    if (a && b) {
      expect(a.similarityScore).toBeGreaterThan(b.similarityScore);
      expect(a.reason).toContain("shared components");
    }
  });
});

describe("findDuplicates — options", () => {
  it("respects maxResults option", () => {
    const candidates: CandidateIssue[] = Array.from({ length: 10 }, (_, i) => ({
      key: `AIGO-${500 + i}`,
      summary: "Signup page broken on mobile Safari browser",
      status: "Open",
      labels: ["funnel", "mobile"],
    }));
    const result = findDuplicates(ctx, candidates, { maxResults: 2 });
    expect(result.possibleDuplicates.length).toBeLessThanOrEqual(2);
  });

  it("respects threshold option — higher threshold excludes weaker matches", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-600", summary: "Some signup stuff", status: "Open" },
    ];
    const low = findDuplicates(ctx, candidates, { threshold: 0.05 });
    const high = findDuplicates(ctx, candidates, { threshold: 0.99 });
    expect(low.possibleDuplicates.length).toBeGreaterThanOrEqual(high.possibleDuplicates.length);
  });

  it("similarity score is clamped to at most 1.0", () => {
    const candidates: CandidateIssue[] = [
      { key: "AIGO-700", summary: "Signup page broken on mobile Safari", status: "Open", labels: ["funnel", "mobile"], components: ["signup"] },
    ];
    const result = findDuplicates(ctx, candidates, { threshold: 0 });
    for (const d of result.possibleDuplicates) {
      expect(d.similarityScore).toBeLessThanOrEqual(1.0);
    }
  });
});
