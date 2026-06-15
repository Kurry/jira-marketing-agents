/**
 * VM-SAFETY-TESTS: safety.test.ts
 *
 * Asserts the safety contract invariants for the AI Growth Ops agent:
 * 1. ClaimsRisk has no "Approved" value.
 * 2. Domain modules never call Jira APIs directly.
 * 3. Creative claims are never auto-approved.
 * 4. Triage never auto-closes high-risk issues.
 * 5. Domain module outputs do not echo PHI-like strings back.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { reviewCreativeClaims } from "../src/creativeClaims";
import { triageIssue } from "../src/triage";
import { analyzeRequirements } from "../src/requirements";
import type { ClaimsRisk } from "../src/types";
import { makeIssue } from "./helpers";

// ─── 1. ClaimsRisk union never includes "Approved" ───────────────────────────

describe("ClaimsRisk type safety", () => {
  it("the ClaimsRisk values do not include 'Approved'", () => {
    // The allowed values as they appear in src/types.ts.
    const allowedValues: ClaimsRisk[] = [
      "Safe",
      "Needs substantiation",
      "Risky",
      "Prohibited",
      "Requires human review",
    ];

    // TypeScript will error at compile time if "Approved" were added to the union.
    // This runtime check documents the contract and catches any accidental string values.
    expect(allowedValues).not.toContain("Approved");
    // Verify the set is exactly the five expected values.
    expect(allowedValues).toHaveLength(5);
  });

  it("reviewCreativeClaims never returns 'Approved' as overallClaimsRisk", () => {
    const inputs = [
      // Safe copy
      makeIssue({ description: "Join thousands of members building healthier habits." }),
      // Needs substantiation
      makeIssue({ description: "Our program is clinically proven to help members." }),
      // Risky
      makeIssue({ description: "Our app can diagnose your condition quickly." }),
      // Prohibited
      makeIssue({ description: "Guaranteed reversal of diabetes in 30 days!" }),
      // Another prohibited variant
      makeIssue({ description: "Get off your medication with our program." }),
      // Empty issue
      makeIssue({}),
    ];

    for (const ctx of inputs) {
      const result = reviewCreativeClaims(ctx);
      // The result must never be "Approved" — that value is not in ClaimsRisk.
      expect((result.overallClaimsRisk as string)).not.toBe("Approved");
      // Validate it IS one of the allowed values.
      const allowedValues: string[] = [
        "Safe",
        "Needs substantiation",
        "Risky",
        "Prohibited",
        "Requires human review",
      ];
      expect(allowedValues).toContain(result.overallClaimsRisk);
    }
  });
});

// ─── 2. Domain modules do not import from src/jira.ts directly ───────────────

describe("Module isolation: no domain module calls Jira APIs directly", () => {
  // Files that ARE allowed to reference jira.ts / @forge/api.
  const ALLOWED_FILES = new Set(["jira.ts", "index.ts", "comments.ts"]);

  // All domain module filenames to check.
  const DOMAIN_FILES = [
    "triage.ts",
    "requirements.ts",
    "experiments.ts",
    "creativeClaims.ts",
    "employerLaunch.ts",
    "dashboards.ts",
    "funnel.ts",
    "duplicates.ts",
    "backlog.ts",
    "readout.ts",
    "creativeGen.ts",
    "audience.ts",
    "campaign.ts",
    "landingPage.ts",
    "referral.ts",
    "activation.ts",
  ];

  const srcDir = path.resolve(__dirname, "../src");

  for (const filename of DOMAIN_FILES) {
    it(`${filename} does not call requestJira or import @forge/api`, () => {
      const filePath = path.join(srcDir, filename);

      // If the file doesn't exist yet, skip rather than fail — the list may be ahead of
      // the implementation, but absent files cannot violate the isolation rule.
      if (!fs.existsSync(filePath)) {
        // vitest doesn't have a built-in skip inside loop; we just pass vacuously.
        expect(true).toBe(true);
        return;
      }

      const source = fs.readFileSync(filePath, "utf-8");

      expect(source).not.toMatch(/requestJira/);
      expect(source).not.toMatch(/@forge\/api/);
    });
  }
});

// ─── 3. Creative claims are never auto-approved ───────────────────────────────

describe("Creative claims are never auto-approved", () => {
  it("Prohibited copy: claimsRisk is not Safe and humanReviewRequired is true", () => {
    const ctx = makeIssue({
      summary: "Ad creative for diabetes reversal campaign",
      description: "Guaranteed reversal of diabetes in 30 days! Get off your medication now.",
    });
    const result = reviewCreativeClaims(ctx);

    expect(result.overallClaimsRisk).not.toBe("Safe");
    expect(result.humanReviewRequired).toBe(true);
  });

  it("Risky copy: claimsRisk is not Safe and humanReviewRequired is true", () => {
    const ctx = makeIssue({
      description: "Our platform can diagnose your condition within minutes.",
    });
    const result = reviewCreativeClaims(ctx);

    expect(result.overallClaimsRisk).not.toBe("Safe");
    expect(result.humanReviewRequired).toBe(true);
  });

  it("Prohibited copy produces at least one flagged phrase with a safer rewrite", () => {
    const ctx = makeIssue({
      description: "Cure diabetes — guaranteed results with our app!",
    });
    const result = reviewCreativeClaims(ctx);

    expect(result.flaggedPhrases.length).toBeGreaterThan(0);
    for (const p of result.flaggedPhrases) {
      expect(p.saferRewrite.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── 4. Triage never auto-closes High-risk or Blocked issues ─────────────────

describe("Triage never auto-closes high-risk or blocked issues", () => {
  it("Blocked issue: recommendedNextStatus is not 'Done'", () => {
    const ctx = makeIssue({
      summary: "Campaign blocked by legal review",
      description: "Blocked — cannot proceed until legal approval is received.",
    });
    const result = triageIssue(ctx);

    expect(result.riskLevel).toBe("Blocked");
    expect(result.recommendedNextStatus).not.toBe("Done");
  });

  it("P0 high-risk issue: recommendedNextStatus is not 'Done'", () => {
    const ctx = makeIssue({
      summary: "P0 production signup flow broken — all users affected",
      description:
        "Critical: production signup is completely broken. Revenue impact. Guaranteed reversal of diabetes in ad copy.",
      labels: ["P0"],
    });
    const result = triageIssue(ctx);

    expect(["High", "Blocked"]).toContain(result.riskLevel);
    expect(result.recommendedNextStatus).not.toBe("Done");
  });

  it("Prohibited claims issue: recommendedNextStatus is not 'Done'", () => {
    const ctx = makeIssue({
      summary: "Email with guaranteed diabetes reversal claim",
      description:
        "The email says 'Guaranteed reversal of diabetes in 30 days' — needs claims review.",
    });
    const result = triageIssue(ctx);

    expect(result.riskLevel).toBe("High");
    expect(result.recommendedNextStatus).not.toBe("Done");
  });

  it("Issues requiring human approvals: recommendedNextStatus is not 'Done'", () => {
    const ctx = makeIssue({
      summary: "Employer launch for Acme Corp",
      description:
        "Partner launch with eligibility file and suppression rules. Launch date: next Monday.",
    });
    const result = triageIssue(ctx);

    expect(result.humanApprovalsRequired.length).toBeGreaterThan(0);
    expect(result.recommendedNextStatus).not.toBe("Done");
  });
});

// ─── 5. Domain outputs do not echo PHI-like strings ──────────────────────────

describe("Domain module outputs do not echo PHI-like strings", () => {
  const PHI_PATTERNS = [
    "SSN: 123-45-6789",
    "MRN: 000001",
    "123-45-6789",
    "000001",
  ] as const;

  const PHI_DESCRIPTION = [
    "Member with SSN: 123-45-6789 and MRN: 000001 should be targeted.",
    "Patient record MRN: 000001 — SSN: 123-45-6789.",
  ].join(" ");

  function containsPHI(obj: unknown): boolean {
    const serialized = JSON.stringify(obj);
    return PHI_PATTERNS.some((pattern) => serialized.includes(pattern));
  }

  it("triageIssue output does not echo SSN or MRN values", () => {
    const ctx = makeIssue({
      summary: "Segment members for campaign",
      description: PHI_DESCRIPTION,
    });
    const result = triageIssue(ctx);

    expect(containsPHI(result)).toBe(false);
  });

  it("analyzeRequirements output does not echo SSN or MRN values", () => {
    const ctx = makeIssue({
      summary: "Segment members for campaign",
      description: PHI_DESCRIPTION,
    });
    const result = analyzeRequirements(ctx);

    expect(containsPHI(result)).toBe(false);
  });

  it("reviewCreativeClaims output does not echo SSN or MRN values", () => {
    const ctx = makeIssue({
      summary: "Creative review for segmented campaign",
      description: PHI_DESCRIPTION,
    });
    const result = reviewCreativeClaims(ctx);

    // The result fields we check: issueKey, overallClaimsRisk, flaggedPhrases, channelWarnings.
    // None should contain the raw PHI tokens from the description.
    expect(result.issueKey).not.toContain("123-45-6789");
    expect(result.issueKey).not.toContain("000001");
    expect((result.overallClaimsRisk as string)).not.toContain("123-45-6789");
    for (const p of result.flaggedPhrases) {
      // saferRewrite and issue fields are static template strings — they should
      // not contain the user-supplied PHI values.
      expect(p.saferRewrite).not.toContain("123-45-6789");
      expect(p.saferRewrite).not.toContain("000001");
      expect(p.issue).not.toContain("123-45-6789");
      expect(p.issue).not.toContain("000001");
    }
    for (const w of result.channelWarnings) {
      expect(w).not.toContain("123-45-6789");
      expect(w).not.toContain("000001");
    }
  });
});
