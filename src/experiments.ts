// NIH classification (T-NIH-07): twin-specific-keep. Experiment design rigor
// (guardrails, claims gating, decision rule, regulated-health approvals) is
// Twin growth/safety policy with no Atlassian-native equivalent. No reduction:
// this is exactly the agent logic that should stay custom per "What Should Stay
// Custom" in specs/atlassian-native-tools.md.
import { IssueContext } from "./types";
import { normalizeText, uniq, containsAny } from "./utils/text";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";

export type ExperimentSpec = {
  issueKey: string;
  hypothesis: string;
  audience: string;
  segment: string;
  channel: string;
  variants: string[];
  primaryMetric: string;
  secondaryMetrics: string[];
  guardrailMetrics: string[];
  sampleSizeNote: string;
  runtimeRecommendation: string;
  trackingRequirements: string[];
  decisionRule: string;
  readoutTemplate: string[];
  approvalsRequired: string[];
  readyForDesign: boolean;
  notReadyReasons: string[];
};

// Standard guardrails for growth experiments in a regulated health context.
const GUARDRAILS = [
  "Unsubscribe rate",
  "Spam complaint rate",
  "CAC (cost per acquisition)",
  "Claims risk (no new unapproved claims)",
  "Tracking integrity",
];

const METRIC_HINTS = [
  "conversion",
  "signup",
  "sign up",
  "ctr",
  "click-through",
  "cvr",
  "open rate",
  "activation",
  "retention",
  "revenue",
  "registration",
];

function detectChannel(text: string): string {
  const t = normalizeText(text);
  if (t.includes("sms")) return "SMS";
  if (t.includes("email")) return "Email";
  if (t.includes("paid") || t.includes("ads")) return "Paid";
  if (t.includes("push")) return "Push";
  if (t.includes("landing")) return "Landing page";
  return "Unspecified";
}

function detectPrimaryMetric(text: string): string | null {
  const t = normalizeText(text);
  const hit = METRIC_HINTS.find((m) => t.includes(m));
  if (!hit) return null;
  if (hit.includes("signup") || hit.includes("sign up") || hit.includes("registration")) {
    return "Signup conversion rate";
  }
  if (hit === "ctr" || hit.includes("click")) return "Click-through rate";
  if (hit === "cvr" || hit === "conversion") return "Conversion rate";
  if (hit === "open rate") return "Email open rate";
  if (hit === "activation") return "Activation rate";
  if (hit === "retention") return "Retention rate";
  if (hit === "revenue") return "Revenue per user";
  return "Conversion rate";
}

/** Build an experiment spec from an issue. Pure and testable. */
export function proposeExperimentSpec(ctx: IssueContext): ExperimentSpec {
  const text = ctx.combinedText;
  const channel = detectChannel(text);
  const primaryMetric = detectPrimaryMetric(text);

  const notReadyReasons: string[] = [];
  if (!primaryMetric) {
    notReadyReasons.push("No measurable primary metric was found in the issue.");
  }
  if (channel === "Unspecified") {
    notReadyReasons.push("Channel is not specified.");
  }
  if (ctx.summary.trim().length < 5 && ctx.description.trim().length < 20) {
    notReadyReasons.push("Issue lacks enough detail to design an experiment.");
  }

  const claims = scanClaimsRisk(text);
  const approvalsRequired: string[] = [];
  if (requiresHumanClaimsReview(claims.risk)) {
    approvalsRequired.push("Claims / compliance review (risky language detected)");
  }
  if (channel === "SMS" || channel === "Email") {
    approvalsRequired.push("Messaging / deliverability review");
  }
  approvalsRequired.push("Experiment launch approval (human go/no-go)");

  const readyForDesign = notReadyReasons.length === 0;

  return {
    issueKey: ctx.issueKey,
    hypothesis: buildHypothesis(ctx, primaryMetric),
    audience: detectAudience(text),
    segment: detectSegment(text),
    channel,
    variants: ["Control (current experience)", "Variant A (proposed change)"],
    primaryMetric: primaryMetric ?? "NOT READY — define a measurable primary metric",
    secondaryMetrics: ["Downstream activation rate", "Revenue per exposed user"],
    guardrailMetrics: GUARDRAILS,
    sampleSizeNote:
      "Estimate sample size from the baseline rate and the minimum detectable effect (MDE). Do not start until powered.",
    runtimeRecommendation:
      "Run for at least one to two full business cycles (e.g., 1–2 weeks) and reach the pre-computed sample size before reading results.",
    trackingRequirements: [
      "Exposure/assignment event per variant",
      "Primary metric conversion event",
      "Guardrail events (unsubscribe, complaint)",
      "Tracking validated in staging before launch",
    ],
    decisionRule: primaryMetric
      ? `Ship Variant A if it beats Control on ${primaryMetric} with no guardrail regression; otherwise iterate or kill.`
      : "Decision rule cannot be set until a primary metric is defined.",
    readoutTemplate: [
      "Hypothesis and what we tested",
      "Primary metric result (with confidence interval — do not claim significance without data)",
      "Guardrail check",
      "Decision: Scale / Iterate / Kill / Extend",
      "Next steps",
    ],
    approvalsRequired: uniq(approvalsRequired),
    readyForDesign,
    notReadyReasons,
  };
}

function buildHypothesis(ctx: IssueContext, metric: string | null): string {
  const subject = ctx.summary.trim() || "the proposed change";
  const m = metric ?? "the primary metric";
  return `We believe that ${subject} will improve ${m} for the target segment. We will know we are right when ${m} increases versus control without guardrail regressions.`;
}

function detectAudience(text: string): string {
  if (containsAny(text, ["new user", "new member", "prospect", "unregistered"])) return "New / prospective users";
  if (containsAny(text, ["existing", "current member", "active user"])) return "Existing members";
  if (containsAny(text, ["employer", "partner"])) return "Employer-sourced members";
  return "Unspecified — confirm target audience";
}

function detectSegment(text: string): string {
  const t = normalizeText(text);
  const match = t.match(/segment[:\s]+([a-z0-9 \-]+)/);
  if (match) return match[1].trim();
  return "Unspecified — confirm segment definition";
}
