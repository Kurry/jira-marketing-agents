import { describe, it, expect } from "vitest";
import { analyzeRequirements } from "../src/requirements";
import { makeIssue } from "./helpers";

describe("analyzeRequirements", () => {
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
    // Due date absent and no launch-date language -> Due date is missing.
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
