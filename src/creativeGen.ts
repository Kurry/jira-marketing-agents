import { IssueContext, ClaimsRisk } from "./types";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";
import { normalizeText, uniq } from "./utils/text";

export type CreativeVariant = {
  channel: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
  claimsRisk: ClaimsRisk;
  flaggedPhrases: string[];
  humanReviewRequired: boolean;
};

export type CreativeGenerationResult = {
  issueKey: string;
  channel: string;
  variants: CreativeVariant[];
  overallHumanReviewRequired: boolean;
  notes: string[];
};

// Compliant angle templates for a regulated metabolic-health context. These are
// intentionally claim-free; the claims scanner re-checks every generated string.
const ANGLES: Array<{ angle: string; headline: string; body: string; cta: string }> = [
  {
    angle: "Support & care team",
    headline: "Healthier habits, with a care team beside you",
    body: "Twin pairs you with clinicians and coaches who help you build sustainable routines. Talk to your doctor about what's right for you.",
    cta: "See if you're eligible",
  },
  {
    angle: "Personalized & data-driven",
    headline: "A plan shaped around your body's signals",
    body: "Twin uses your data to personalize daily guidance. Many members build healthier habits over time.",
    cta: "Check your eligibility",
  },
  {
    angle: "Employer benefit",
    headline: "A covered benefit from your employer",
    body: "Your employer offers Twin at no extra cost to eligible members. Enrollment takes a few minutes.",
    cta: "Get started",
  },
  {
    angle: "Simple first step",
    headline: "One small step toward feeling better",
    body: "Answer a few questions to see if Twin is a fit. No pressure, and your care team guides the rest.",
    cta: "Start the check",
  },
];

function detectChannel(text: string): string {
  const t = normalizeText(text);
  if (t.includes("sms") || t.includes("text message")) return "SMS";
  if (t.includes("email")) return "Email";
  if (t.includes("paid") || t.includes(" ad") || t.includes("ads")) return "Paid social";
  if (t.includes("push")) return "Push";
  if (t.includes("direct mail") || t.includes("postcard")) return "Direct mail";
  return "Email";
}

// Channel-specific length shaping so SMS stays short, etc.
function shapeForChannel(channel: string, v: { headline: string; body: string; cta: string }) {
  if (channel === "SMS") {
    return {
      headline: v.headline,
      body: `${v.headline}. ${v.cta}. Reply STOP to opt out.`,
      cta: v.cta,
    };
  }
  if (channel === "Push") {
    return { headline: v.headline, body: v.headline, cta: v.cta };
  }
  return v;
}

/**
 * Generate compliant creative variants from an issue, scanning each for claims
 * risk. This DRAFTS copy only — it never sends. Any risky/prohibited variant is
 * marked for human review.
 */
export function generateCreativeVariants(
  ctx: IssueContext,
  opts: { count?: number } = {}
): CreativeGenerationResult {
  const channel = detectChannel(ctx.combinedText);
  const count = Math.max(1, Math.min(opts.count ?? 3, ANGLES.length));

  const variants: CreativeVariant[] = ANGLES.slice(0, count).map((a) => {
    const shaped = shapeForChannel(channel, a);
    const combined = `${shaped.headline} ${shaped.body} ${shaped.cta}`;
    const scan = scanClaimsRisk(combined);
    return {
      channel,
      angle: a.angle,
      headline: shaped.headline,
      body: shaped.body,
      cta: shaped.cta,
      claimsRisk: scan.risk,
      flaggedPhrases: scan.phrases.map((p) => p.phrase),
      humanReviewRequired: requiresHumanClaimsReview(scan.risk),
    };
  });

  // Also scan the source brief: if the request itself asks for risky claims,
  // surface that so a human edits the brief before any copy ships.
  const briefScan = scanClaimsRisk(ctx.combinedText);
  const notes: string[] = [
    "Generated copy is a draft for human review; nothing is sent.",
    "Every variant was scanned for claims risk before output.",
  ];
  if (briefScan.phrases.length > 0) {
    notes.push(
      `The request brief contains risky claim language (${uniq(
        briefScan.phrases.map((p) => p.phrase)
      ).join(", ")}). Route to Compliance before producing final copy.`
    );
  }

  const overallHumanReviewRequired =
    variants.some((v) => v.humanReviewRequired) || requiresHumanClaimsReview(briefScan.risk);

  return {
    issueKey: ctx.issueKey,
    channel,
    variants,
    overallHumanReviewRequired,
    notes,
  };
}
