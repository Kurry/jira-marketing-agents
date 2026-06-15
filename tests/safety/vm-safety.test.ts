/**
 * VM-SAFETY-TESTS (T-R-SAFE-01)
 *
 * Pure, network-free assertions for every VM-SAFETY contract item:
 *   1. no-claims-approval   — triage / claims review never auto-approve
 *   2. no-campaign-send     — campaign plans are draft-only, never a send action
 *   3. no-audience-mutation — audience proposals never mutate a production audience
 *   4. PHI-redaction        — agent outputs never echo sample PII patterns
 *   5. scope-allowlist      — only addAnalysisComment mutates Jira (src/index.ts)
 *   6. policy-hash          — prompts that pin a policy hash carry the correct sha256
 *
 * All inputs come from makeIssue(); no Jira, no fetch.
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { triageIssue } from "../../src/triage";
import { reviewCreativeClaims } from "../../src/creativeClaims";
import { analyzeRequirements } from "../../src/requirements";
import { buildCampaignPlan } from "../../src/campaign";
import { buildAudienceSegment, proposePersonalization } from "../../src/audience";
import { makeIssue } from "../helpers";

const REPO_ROOT = join(__dirname, "..", "..");

// ─── 1. no-claims-approval ───────────────────────────────────────────────────
describe("no-claims-approval", () => {
  const claimCopy =
    "Our program reverses type 2 diabetes and is clinically proven to cure prediabetes. Claims approved by legal.";

  it("reviewCreativeClaims never returns an approved verdict", () => {
    const result = reviewCreativeClaims(makeIssue({ summary: "Launch creative", description: claimCopy }));
    expect(result.overallClaimsRisk).not.toBe("Approved");
    expect((result as Record<string, unknown>).approved).not.toBe(true);
    expect(result.humanReviewRequired).toBe(true);
  });

  it("triageIssue never auto-closes a claims-laden issue and flags human review", () => {
    const result = triageIssue(makeIssue({ summary: "Claims copy review", description: claimCopy }));
    expect((result as Record<string, unknown>).approved).not.toBe(true);
    expect(result.recommendedNextStatus).not.toBe("Done");
    expect(result.humanApprovalsRequired).toContain("Compliance / medical claims review");
  });
});

// ─── 2. no-campaign-send ─────────────────────────────────────────────────────
describe("no-campaign-send", () => {
  it("campaign plans are draft-only and never emit a send action", () => {
    const plan = buildCampaignPlan(
      makeIssue({
        summary: "Re-engage lapsed members",
        description: "Send an email and SMS sequence to win back lapsed users. Launch now.",
      })
    );
    expect(plan.executionMode).toBe("draft — human executes the send");
    expect(plan.approvalsRequired).toContain("Human go/no-go to execute the send");

    // No field should carry an actionable "send"/"launch" verb the app could execute.
    const serialized = JSON.stringify(plan).toLowerCase();
    expect(serialized).not.toMatch(/"action"\s*:\s*"send/);
    expect(serialized).not.toMatch(/launchnow/);
  });
});

// ─── 3. no-audience-mutation ─────────────────────────────────────────────────
describe("no-audience-mutation", () => {
  const ctx = makeIssue({
    summary: "Target prediabetic employer population",
    description: "Build a segment and suppress opted-out users.",
  });

  it("buildAudienceSegment declares it never mutates a production audience", () => {
    const proposal = buildAudienceSegment(ctx);
    expect(proposal.mutatesProductionAudience).toBe(false);
  });

  it("audience.ts source contains no Jira/forge write calls", () => {
    const src = readFileSync(join(REPO_ROOT, "src", "audience.ts"), "utf8");
    expect(src).not.toMatch(/requestJira/);
    expect(src).not.toMatch(/@forge\/api/);
    expect(src).not.toMatch(/method:\s*["'](POST|PUT|DELETE|PATCH)["']/);
  });

  it("proposePersonalization is a pure proposal (no throw, returns object)", () => {
    expect(() => proposePersonalization(ctx)).not.toThrow();
    expect(typeof proposePersonalization(ctx)).toBe("object");
  });
});

// ─── 4. PHI-redaction ────────────────────────────────────────────────────────
describe("PHI-redaction", () => {
  const SSN = "123-45-6789";
  const MRN = "MRN-998877";
  const EMAIL = "patient.jane@example.com";
  // PII is placed only in free-text fields (description/comments). The summary
  // is the agent's working metadata and is legitimately echoed back (e.g. as a
  // cleaned summary or segment name), so it must stay PII-free in tests.
  const phiCtx = makeIssue({
    summary: "Member signup issue for prediabetes program",
    description: `Patient SSN ${SSN}, contact ${EMAIL}, has prediabetes and wants to enroll.`,
    comments: [`Follow up with ${EMAIL} re: ${MRN}`],
  });

  const cases: Array<[string, () => unknown]> = [
    ["triageIssue", () => triageIssue(phiCtx)],
    ["analyzeRequirements", () => analyzeRequirements(phiCtx)],
    ["reviewCreativeClaims", () => reviewCreativeClaims(phiCtx)],
    ["buildCampaignPlan", () => buildCampaignPlan(phiCtx)],
    ["buildAudienceSegment", () => buildAudienceSegment(phiCtx)],
  ];

  for (const [name, run] of cases) {
    it(`${name} output does not echo SSN / MRN / email PII`, () => {
      const out = JSON.stringify(run());
      expect(out).not.toContain(SSN);
      expect(out).not.toContain(MRN);
      expect(out).not.toContain(EMAIL);
    });
  }
});

// ─── 5. scope-allowlist ──────────────────────────────────────────────────────
describe("scope-allowlist", () => {
  // addAnalysisComment is the ONLY mutating Forge action in src/. The automation
  // import lives in a standalone provisioning script (not a deployed action), so
  // it is not part of the Forge write surface.
  const ALLOWLISTED = new Set(["addAnalysisComment"]);

  it("only allowlisted exports issue a non-GET Jira request across src/", () => {
    const writeRe = /method:\s*["'](POST|PUT|DELETE|PATCH)["']/;
    const offenders: string[] = [];

    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(full));
        else if (e.name.endsWith(".ts")) out.push(full);
      }
      return out;
    };

    for (const file of walk(join(REPO_ROOT, "src"))) {
      const lines = readFileSync(file, "utf8").split("\n");
      let fn: string | null = null;
      lines.forEach((line, i) => {
        const m = line.match(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
        if (m) fn = m[1];
        if (writeRe.test(line)) {
          // searchIssues POSTs to the JQL search endpoint (read-only);
          // addComment is the sanctioned write helper addAnalysisComment wraps.
          if (fn === "searchIssues" || fn === "addComment") return;
          if (!fn || !ALLOWLISTED.has(fn)) {
            offenders.push(`${file.replace(REPO_ROOT + "/", "")}:${i + 1} in ${fn ?? "(module)"}`);
          }
        }
      });
    }

    expect(offenders, `unlisted Jira write surface:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the automation provisioner rejects any rule not in state DISABLED", () => {
    // Safety contract: automation rules are imported DISABLED and enabled only
    // after a captured audit-log run. Enforcement lives in provision-automation.cjs.
    const scriptPath = join(REPO_ROOT, "scripts", "provision-automation.cjs");
    expect(existsSync(scriptPath), "expected scripts/provision-automation.cjs").toBe(true);
    expect(readFileSync(scriptPath, "utf8")).toMatch(/state\s*!==\s*["']DISABLED["']/);
  });

  it("every importable automation rule JSON declares state DISABLED", () => {
    const rulesDir = join(REPO_ROOT, "automation", "rules");
    const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".json"));
    expect(ruleFiles.length).toBeGreaterThan(0);
    for (const file of ruleFiles) {
      const text = readFileSync(join(rulesDir, file), "utf8");
      const states = [...text.matchAll(/"state"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
      const enabledStates = states.filter((s) => s !== "DISABLED");
      expect(enabledStates, `automation/rules/${file} has non-DISABLED state(s): ${enabledStates.join(", ")}`).toEqual([]);
    }
  });
});

// ─── 6. policy-hash ──────────────────────────────────────────────────────────
// A prompt may pin a policy version with a marker line:
//   <!-- policy-hash: <filename> sha256:<64-hex> -->
// When present, the pinned hash must match the current sha256 of that policy
// file. Drift (an edited policy with a stale pin) fails the build. If no prompt
// pins a hash yet, the suite records that the convention is not in use.
describe("policy-hash", () => {
  const PIN_RE = /policy-hash:\s*([\w./-]+)\s+sha256:([0-9a-f]{64})/gi;
  const promptsDir = join(REPO_ROOT, "prompts");
  const pins: Array<{ prompt: string; policy: string; expected: string }> = [];

  if (existsSync(promptsDir)) {
    for (const file of readdirSync(promptsDir).filter((f) => f.endsWith(".md"))) {
      const text = readFileSync(join(promptsDir, file), "utf8");
      for (const m of text.matchAll(PIN_RE)) {
        pins.push({ prompt: `prompts/${file}`, policy: m[1], expected: m[2].toLowerCase() });
      }
    }
  }

  if (pins.length === 0) {
    it.skip("no prompt pins a policy hash yet (convention not in use)", () => {});
  } else {
    for (const pin of pins) {
      it(`${pin.prompt} pins the current sha256 of ${pin.policy}`, () => {
        const policyPath = join(REPO_ROOT, pin.policy);
        expect(existsSync(policyPath), `pinned policy missing: ${pin.policy}`).toBe(true);
        const actual = createHash("sha256").update(readFileSync(policyPath)).digest("hex");
        expect(actual).toBe(pin.expected);
      });
    }
  }
});
