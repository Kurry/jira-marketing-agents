// NIH classification (T-NIH-07): twin-specific-keep. Signup-funnel friction
// diagnosis (step taxonomy, work-type routing, compliant-fix guidance) is Twin
// growth-ops analysis, not a generic Atlassian capability. No reduction needed.
import { IssueContext } from "./types";
import { normalizeText, uniq } from "./utils/text";

export type FunnelFrictionResult = {
  issueKey: string;
  affectedStep: string;
  problemStatement: string;
  evidence: string[];
  likelyCause: string;
  recommendedFix: string;
  expectedImpact: string;
  qaRequirements: string[];
  acceptanceCriteria: string[];
  workType: "Copy" | "Product" | "Analytics" | "Engineering" | "Unknown";
};

const STEP_SIGNALS: Array<{ step: string; terms: string[] }> = [
  { step: "Landing page", terms: ["landing page", "homepage", "first page", "lp"] },
  { step: "Email capture", terms: ["email capture", "enter email", "email field"] },
  { step: "Account creation", terms: ["account creation", "create account", "password", "sign up form", "registration form"] },
  { step: "Eligibility / verification", terms: ["eligibility", "verify", "verification", "insurance", "employer code"] },
  { step: "Payment", terms: ["payment", "checkout", "billing", "card"] },
  { step: "Confirmation", terms: ["confirmation", "thank you", "welcome screen"] },
];

function detectStep(text: string): string {
  const t = normalizeText(text);
  for (const { step, terms } of STEP_SIGNALS) {
    if (terms.some((x) => t.includes(normalizeText(x)))) return step;
  }
  return "Unspecified step";
}

function detectWorkType(text: string): FunnelFrictionResult["workType"] {
  const t = normalizeText(text);
  if (/error|crash|bug|broken|500|exception|timeout/.test(t)) return "Engineering";
  if (/tracking|event not firing|analytics|attribution|utm/.test(t)) return "Analytics";
  if (/copy|wording|headline|confusing text|cta text/.test(t)) return "Copy";
  if (/flow|step order|ux|layout|button|form field|validation/.test(t)) return "Product";
  return "Unknown";
}

/** Analyze a signup funnel issue. Pure and testable. */
export function analyzeFunnelFriction(ctx: IssueContext): FunnelFrictionResult {
  const text = ctx.combinedText;
  const t = normalizeText(text);
  const affectedStep = detectStep(text);
  const workType = detectWorkType(text);

  const evidence: string[] = [];
  if (/drop[\s-]?off|dropoff|abandon/.test(t)) evidence.push("Reported drop-off / abandonment at this step.");
  if (/\d+%/.test(t)) {
    const pct = text.match(/\d+%/g);
    if (pct) evidence.push(`Quantified signal in issue: ${uniq(pct).join(", ")}.`);
  }
  if (/mobile|ios|android/.test(t)) evidence.push("Issue references mobile devices.");
  if (evidence.length === 0) evidence.push("No quantitative evidence in issue — pull funnel analytics to confirm.");

  let likelyCause = "Unclear — requires diagnosis with funnel analytics and session replay.";
  let recommendedFix = "Reproduce the issue, pull step-level analytics, then fix the root cause.";
  switch (workType) {
    case "Engineering":
      likelyCause = "A technical error or broken element is blocking completion of the step.";
      recommendedFix = "Reproduce, capture logs, fix the error, and add regression coverage.";
      break;
    case "Analytics":
      likelyCause = "Tracking is misfiring, so the step may appear broken or under-measured.";
      recommendedFix = "Audit the event implementation and correct the tracking; re-validate the funnel.";
      break;
    case "Copy":
      likelyCause = "Confusing or non-compliant copy is reducing completion.";
      recommendedFix = "Rewrite the copy for clarity (and route any claims through review), then A/B test.";
      break;
    case "Product":
      likelyCause = "A UX / flow friction point is causing users to abandon the step.";
      recommendedFix = "Simplify the step (reduce fields / clarify CTA), then validate with an experiment.";
      break;
  }

  return {
    issueKey: ctx.issueKey,
    affectedStep,
    problemStatement:
      ctx.summary.trim() ||
      `Users are experiencing friction at the ${affectedStep} step of the signup funnel.`,
    evidence: uniq(evidence),
    likelyCause,
    recommendedFix,
    expectedImpact:
      "Recovering drop-off at this step should increase end-to-end signup conversion; quantify against the baseline step rate.",
    qaRequirements: [
      "Reproduce on mobile and desktop.",
      "Confirm the fix does not regress adjacent steps.",
      "Validate tracking fires for the affected step.",
    ],
    acceptanceCriteria: [
      `Users complete the ${affectedStep} step without the reported friction.`,
      "Step completion rate improves versus the pre-fix baseline.",
    ],
    workType,
  };
}
