import { describe, it, expect } from "vitest";
import { analyzeRequirements, proposeAcceptanceCriteria } from "../src/requirements";
import { makeIssue } from "./helpers";

// ---------------------------------------------------------------------------
// analyzeRequirements — existing
// ---------------------------------------------------------------------------

describe("analyzeRequirements — existing", () => {
  it("detects missing acceptance criteria", () => {
    const ctx = makeIssue({
      summary: "Improve email open rate",
      description: "Goal is to lift opens for the new member segment via email. Metric is open rate.",
      assignee: "Alice",
      dueDate: "2026-07-01",
    });
    const result = analyzeRequirements(ctx);
    expect(result.missingFields).toContain("Acceptance criteria");
  });

  it("detects missing metric for an experiment", () => {
    const ctx = makeIssue({
      issueType: "Experiment",
      summary: "Test a new landing page layout",
      description: "We want to try a different hero section for the audience.",
    });
    const result = analyzeRequirements(ctx);
    expect(result.missingFields).toContain("Metric");
    expect(result.readyForWork).toBe(false);
  });

  it("detects missing launch date for an employer launch", () => {
    const ctx = makeIssue({
      issueType: "Employer Launch",
      summary: "Employer launch for Globex",
      description: "Launch with eligibility file. Owner TBD.",
    });
    const result = analyzeRequirements(ctx);
    expect(result.missingFields).toContain("Due date");
  });

  it("marks a fully specified issue ready for work", () => {
    const ctx = makeIssue({
      summary: "Add tracking to signup CTA",
      description:
        "Goal: measure clicks. Customer: new members. Segment: prospects. Channel: landing page. " +
        "Metric: conversion rate. Data source: warehouse. Acceptance criteria: event fires. " +
        "Approval: compliance not required.",
      assignee: "Bob",
      dueDate: "2026-08-01",
    });
    const result = analyzeRequirements(ctx);
    expect(result.readyForWork).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// analyzeRequirements — output shape and additional paths
// ---------------------------------------------------------------------------

describe("analyzeRequirements — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-111", summary: "requirements", description: "" });
    expect(analyzeRequirements(ctx).issueKey).toBe("AIGO-111");
  });

  it("generates clarifyingQuestions for each missing field", () => {
    const ctx = makeIssue({ summary: "vague request", description: "" });
    const result = analyzeRequirements(ctx);
    expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
    expect(result.clarifyingQuestions.length).toBeLessThanOrEqual(result.missingFields.length);
  });

  it("Owner satisfied by assignee field (not text keyword)", () => {
    const ctx = makeIssue({
      summary: "do something",
      description: "vague request with no owner text",
      assignee: "carol",
    });
    const result = analyzeRequirements(ctx);
    expect(result.missingFields).not.toContain("Owner");
  });

  it("Due date satisfied by dueDate field", () => {
    const ctx = makeIssue({
      summary: "do something",
      description: "vague request",
      dueDate: "2026-10-01",
    });
    const result = analyzeRequirements(ctx);
    expect(result.missingFields).not.toContain("Due date");
  });
});

describe("analyzeRequirements — blockers", () => {
  it("blocked language in issue adds a blocker", () => {
    const ctx = makeIssue({ summary: "dashboard", description: "blocked cannot proceed waiting on partner" });
    const result = analyzeRequirements(ctx);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.readyForWork).toBe(false);
  });

  it("Experiment with no primary metric adds an experiment-specific blocker", () => {
    const ctx = makeIssue({
      issueType: "Experiment",
      summary: "email a/b test hypothesis experiment variant",
      description: "test email subject line hypothesis variant experiment holdout",
    });
    const result = analyzeRequirements(ctx);
    expect(result.blockers.some((b) => b.toLowerCase().includes("metric"))).toBe(true);
  });

  it("Employer Launch with no launch date adds a launch-specific blocker", () => {
    const ctx = makeIssue({
      issueType: "Employer Launch",
      summary: "Employer launch for Globex",
      description: "Launch with eligibility file. Owner TBD.",
    });
    const result = analyzeRequirements(ctx);
    expect(result.blockers.some((b) => b.toLowerCase().includes("launch date"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// proposeAcceptanceCriteria
// ---------------------------------------------------------------------------

describe("proposeAcceptanceCriteria — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-222", summary: "signup funnel", description: "signup registration broken" });
    expect(proposeAcceptanceCriteria(ctx).issueKey).toBe("AIGO-222");
  });

  it("always returns non-empty acceptanceCriteria, definitionOfDone, and qaChecks", () => {
    const ctx = makeIssue({ summary: "do something", description: "" });
    const result = proposeAcceptanceCriteria(ctx);
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.definitionOfDone.length).toBeGreaterThan(0);
    expect(result.qaChecks.length).toBeGreaterThan(0);
  });
});

describe("proposeAcceptanceCriteria — area-specific criteria", () => {
  it("Experiment area includes tracking validation criterion", () => {
    const ctx = makeIssue({ summary: "email experiment a/b variant", description: "email a/b test hypothesis variant" });
    const result = proposeAcceptanceCriteria(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("tracking");
  });

  it("Creative area includes claims review criterion", () => {
    const ctx = makeIssue({ summary: "ad copy creative headline", description: "email copy banner creative asset" });
    const result = proposeAcceptanceCriteria(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("claims");
  });

  it("Employer Launch area includes go/no-go approval criterion", () => {
    const ctx = makeIssue({ summary: "employer launch eligibility", description: "employer partner eligibility launch" });
    const result = proposeAcceptanceCriteria(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("go/no-go");
  });

  it("Dashboard area includes business question criterion", () => {
    const ctx = makeIssue({ summary: "dashboard report analytics", description: "channel performance dashboard looker" });
    const result = proposeAcceptanceCriteria(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("business question");
  });

  it("Signup Funnel area includes mobile device criterion", () => {
    const ctx = makeIssue({ summary: "signup funnel registration broken", description: "signup funnel registration device mobile" });
    const result = proposeAcceptanceCriteria(ctx);
    const qa = result.qaChecks.join(" ").toLowerCase();
    expect(qa).toContain("mobile");
  });

  it("Unknown area falls back to generic documented requirements criterion", () => {
    const ctx = makeIssue({ summary: "do something", description: "unclear request" });
    const result = proposeAcceptanceCriteria(ctx);
    const ac = result.acceptanceCriteria.join(" ").toLowerCase();
    expect(ac).toContain("requirements");
  });
});
