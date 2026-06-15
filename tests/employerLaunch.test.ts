import { describe, it, expect } from "vitest";
import { createEmployerLaunchPlan } from "../src/employerLaunch";
import { makeIssue } from "./helpers";

// ---------------------------------------------------------------------------
// Existing core tests
// ---------------------------------------------------------------------------

describe("createEmployerLaunchPlan — core readiness scoring", () => {
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

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("createEmployerLaunchPlan — output shape", () => {
  it("propagates issueKey from context", () => {
    const ctx = makeIssue({ issueKey: "AIGO-77", summary: "Employer launch", description: "" });
    expect(createEmployerLaunchPlan(ctx).issueKey).toBe("AIGO-77");
  });

  it("always returns 4 launch phases with expected titles", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "eligibility file email" });
    const phases = createEmployerLaunchPlan(ctx).launchPhases;
    expect(phases.length).toBe(4);
    const titles = phases.map((p) => p.phase);
    expect(titles).toContain("Setup");
    expect(titles).toContain("Build");
    expect(titles).toContain("Review");
    expect(titles).toContain("Launch & Monitor");
  });

  it("each phase has at least one task", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "" });
    const phases = createEmployerLaunchPlan(ctx).launchPhases;
    for (const p of phases) {
      expect(p.tasks.length).toBeGreaterThan(0);
    }
  });

  it("qaChecklist always present and covers key areas", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "" });
    const qa = createEmployerLaunchPlan(ctx).qaChecklist.join(" ").toLowerCase();
    expect(qa).toContain("eligibility");
    expect(qa).toContain("tracking");
    expect(qa).toContain("claims");
  });

  it("suggestedSubtasks always returns 6 entries with ownerGroup", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "" });
    const subtasks = createEmployerLaunchPlan(ctx).suggestedSubtasks;
    expect(subtasks.length).toBe(6);
    for (const s of subtasks) {
      expect(typeof s.ownerGroup).toBe("string");
      expect(s.ownerGroup.length).toBeGreaterThan(0);
    }
  });

  it("subtask dueOffsetDays are all negative (pre-launch)", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "" });
    const subtasks = createEmployerLaunchPlan(ctx).suggestedSubtasks;
    for (const s of subtasks) {
      expect(s.dueOffsetDays).toBeLessThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Readiness checks — individual signals
// ---------------------------------------------------------------------------

describe("createEmployerLaunchPlan — readiness checks", () => {
  it("dueDate field satisfies launch date check", () => {
    const without = makeIssue({ description: "eligibility file segment email tracking claims approved" });
    const with_ = makeIssue({ description: without.description, dueDate: "2026-09-01" });
    expect(createEmployerLaunchPlan(with_).blockers).not.toContain("Missing launch date.");
    expect(createEmployerLaunchPlan(without).blockers).toContain("Missing launch date.");
  });

  it("assignee field satisfies owner check", () => {
    const without = makeIssue({ description: "" });
    const with_ = makeIssue({ description: "", assignee: "bob" });
    expect(createEmployerLaunchPlan(with_).blockers).not.toContain("Missing owner.");
    expect(createEmployerLaunchPlan(without).blockers).toContain("Missing owner.");
  });

  it("'census' keyword satisfies eligibility file check", () => {
    const ctx = makeIssue({ description: "census received and loaded" });
    expect(createEmployerLaunchPlan(ctx).blockers).not.toContain("Missing eligibility file.");
  });

  it("'utm' keyword satisfies tracking check", () => {
    const ctx = makeIssue({ description: "utm parameters set up for all links" });
    expect(createEmployerLaunchPlan(ctx).blockers).not.toContain("Missing tracking.");
  });

  it("'microsite' keyword satisfies landing page check", () => {
    const ctx = makeIssue({ description: "microsite built and tested" });
    expect(createEmployerLaunchPlan(ctx).blockers).not.toContain("Missing landing page.");
  });

  it("'dri' keyword satisfies owner check", () => {
    const ctx = makeIssue({ description: "dri is alice" });
    expect(createEmployerLaunchPlan(ctx).blockers).not.toContain("Missing owner.");
  });
});

// ---------------------------------------------------------------------------
// Risky claims language without approval
// ---------------------------------------------------------------------------

describe("createEmployerLaunchPlan — risky claims blocker", () => {
  it("adds hard blocker when risky claims language present without documented approval", () => {
    const ctx = makeIssue({
      description: "guaranteed weight loss email for employer launch eligibility file tracking segment utm",
      dueDate: "2026-09-01",
      assignee: "owner",
    });
    const plan = createEmployerLaunchPlan(ctx);
    expect(plan.blockers.some((b) => b.toLowerCase().includes("risky claims"))).toBe(true);
  });

  it("does not add claims blocker when approval is documented alongside risky language", () => {
    const ctx = makeIssue({
      description: "guaranteed weight loss email for employer launch. Claims approved by compliance. eligibility file tracking segment utm",
      dueDate: "2026-09-01",
      assignee: "owner",
    });
    const plan = createEmployerLaunchPlan(ctx);
    expect(plan.blockers.some((b) => b.toLowerCase().includes("risky claims"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requiredAssets
// ---------------------------------------------------------------------------

describe("createEmployerLaunchPlan — requiredAssets", () => {
  it("lists assets for each missing component", () => {
    const ctx = makeIssue({ summary: "Employer launch", description: "" });
    const assets = createEmployerLaunchPlan(ctx).requiredAssets;
    expect(assets.some((a) => a.toLowerCase().includes("eligibility"))).toBe(true);
    expect(assets.some((a) => a.toLowerCase().includes("segment"))).toBe(true);
    expect(assets.some((a) => a.toLowerCase().includes("creative") || a.toLowerCase().includes("email"))).toBe(true);
    expect(assets.some((a) => a.toLowerCase().includes("landing page"))).toBe(true);
    expect(assets.some((a) => a.toLowerCase().includes("tracking"))).toBe(true);
    expect(assets.some((a) => a.toLowerCase().includes("claims"))).toBe(true);
  });

  it("requiredAssets is empty when all components are present", () => {
    const ctx = makeIssue({
      description:
        "Eligibility file received. Segment and suppression defined. Email and SMS assets ready. " +
        "Landing page built. Tracking and UTMs in place. Claims approved by compliance.",
      assignee: "Owner",
      dueDate: "2026-07-01",
    });
    expect(createEmployerLaunchPlan(ctx).requiredAssets.length).toBe(0);
  });
});
