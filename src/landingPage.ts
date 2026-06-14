import { IssueContext } from "./types";
import { scanClaimsRisk } from "./utils/risk";
import { normalizeText, uniq } from "./utils/text";

export type LandingPageSpec = {
  issueKey: string;
  goal: string;
  audience: string;
  sections: Array<{ section: string; purpose: string; draftCopy: string }>;
  primaryCta: string;
  formFields: string[];
  trackingRequirements: string[];
  abTestPlan: string[];
  claimsRiskInCopy: string;
  flaggedPhrases: string[];
  qaChecks: string[];
  acceptanceCriteria: string[];
};

/**
 * Produce a landing page specification with draft, compliance-scanned copy and
 * a conversion-optimized structure. Spec only — it does not deploy a page.
 */
export function createLandingPageSpec(ctx: IssueContext): LandingPageSpec {
  const t = normalizeText(ctx.combinedText);
  const isEmployer = /employer|partner|eligibility/.test(t);

  const sections = [
    {
      section: "Hero",
      purpose: "Communicate the core value and drive the eligibility check.",
      draftCopy: isEmployer
        ? "A covered benefit from your employer — build healthier habits with a care team."
        : "Build healthier habits with a care team that knows your data.",
    },
    {
      section: "How it works",
      purpose: "Reduce uncertainty with 3 simple steps.",
      draftCopy: "1) Check eligibility. 2) Get matched with your care team. 3) Start your personalized plan.",
    },
    {
      section: "Trust / social proof",
      purpose: "Build credibility without unsubstantiated claims.",
      draftCopy: "Members work with clinicians and coaches. Talk to your doctor about what's right for you.",
    },
    {
      section: "Eligibility form",
      purpose: "Capture the minimum needed to qualify and register.",
      draftCopy: "See if you're eligible in under 2 minutes.",
    },
    {
      section: "FAQ",
      purpose: "Pre-empt objections (cost, time, privacy).",
      draftCopy: "Is it really covered? How much time does it take? How is my data protected?",
    },
  ];

  const scan = scanClaimsRisk(sections.map((s) => s.draftCopy).join(" ") + " " + ctx.combinedText);

  return {
    issueKey: ctx.issueKey,
    goal: ctx.summary.trim() || "Convert eligible visitors into registrations",
    audience: isEmployer ? "Employer-eligible members" : "Eligible prospective members",
    sections,
    primaryCta: "Check your eligibility",
    formFields: uniq([
      "Email",
      ...(isEmployer ? ["Employer / partner code"] : []),
      "Phone (optional, for SMS with consent)",
    ]),
    trackingRequirements: [
      "Page view event",
      "Form start / form submit events",
      "Registration conversion event",
      "Source / UTM attribution",
    ],
    abTestPlan: [
      "Test hero headline (support vs. personalized angle)",
      "Test CTA copy (\"Check eligibility\" vs. \"Get started\")",
      "Test form length (minimal vs. full)",
    ],
    claimsRiskInCopy: scan.risk,
    flaggedPhrases: scan.phrases.map((p) => p.phrase),
    qaChecks: [
      "Renders correctly on mobile and desktop",
      "Form validation and error states work",
      "Tracking events fire end to end",
      "No unapproved health claims in any section",
    ],
    acceptanceCriteria: [
      "Visitors can complete the eligibility/registration flow without error.",
      "Conversion and attribution tracking is validated.",
      "All copy passes claims review.",
    ],
  };
}
