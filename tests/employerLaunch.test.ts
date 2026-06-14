import { describe, it, expect } from "vitest";
import { createEmployerLaunchPlan } from "../src/employerLaunch";
import { makeIssue } from "./helpers";

describe("createEmployerLaunchPlan", () => {
  it("gives a high readiness score when everything is present", () => {
    const ctx = makeIssue({
      issueType: "Employer Launch",
      summary: "Employer launch for Acme",
      description:
        "Launch date set. Eligibility file received. Segment and suppression defined. " +
        "Email and SMS assets ready. Landing page built. Tracking and UTMs in place. " +
        "Claims approved by compliance.",
      assignee: "Owner",
      dueDate: "2026-07-01",
    });
    const plan = createEmployerLaunchPlan(ctx);
    expect(plan.readinessScore).toBeGreaterThanOrEqual(90);
    expect(plan.blockers.length).toBe(0);
  });

  it("decreases the score for a missing launch date", () => {
    const full = makeIssue({
      description:
        "Eligibility file received. Segment and suppression defined. Email and SMS assets ready. " +
        "Landing page built. Tracking and UTMs in place. Claims approved by compliance.",
      assignee: "Owner",
    });
    const withDate = makeIssue({
      description: full.description + " Launch date is set.",
      dueDate: "2026-07-01",
      assignee: "Owner",
    });
    const a = createEmployerLaunchPlan(full);
    const b = createEmployerLaunchPlan(withDate);
    expect(a.readinessScore).toBeLessThan(b.readinessScore);
    expect(a.blockers).toContain("Missing launch date.");
  });

  it("decreases the score for missing eligibility file, tracking, and claims approval", () => {
    const ctx = makeIssue({
      issueType: "Employer Launch",
      summary: "Employer launch",
      description: "We will email members. Landing page is up.",
    });
    const plan = createEmployerLaunchPlan(ctx);
    expect(plan.blockers).toContain("Missing eligibility file.");
    expect(plan.blockers).toContain("Missing tracking.");
    expect(plan.blockers).toContain("Missing claims approval.");
    expect(plan.readinessScore).toBeLessThan(70);
  });

  it("clamps the readiness score to a 0-100 range", () => {
    const ctx = makeIssue({ summary: "Launch", description: "" });
    const plan = createEmployerLaunchPlan(ctx);
    expect(plan.readinessScore).toBeGreaterThanOrEqual(0);
    expect(plan.readinessScore).toBeLessThanOrEqual(100);
  });
});
