import { IssueContext } from "./types";
import { normalizeText, uniq, containsAny } from "./utils/text";

export type AudienceSegmentProposal = {
  issueKey: string;
  segmentName: string;
  hypothesis: string;
  includeCriteria: string[];
  excludeCriteria: string[];
  signals: string[];
  requiredDataSources: string[];
  estimatedReachNote: string;
  measurement: string[];
  approvalsRequired: string[];
  // This proposal NEVER mutates a production audience or suppression list.
  mutatesProductionAudience: false;
};

// Candidate signals the targeting logic can key off of. Detection is heuristic;
// real reach must be computed against the data warehouse (not done here).
const SIGNAL_BANK = [
  { key: "eligible employer population", terms: ["employer", "partner", "eligibility", "census"] },
  { key: "prediabetes / type 2 indicators", terms: ["prediabetes", "type 2", "a1c", "diabetes", "metabolic"] },
  { key: "engagement / activity signal", terms: ["engaged", "opened", "clicked", "visited", "active"] },
  { key: "lapsed / re-engagement", terms: ["lapsed", "inactive", "dropped off", "churn"] },
  { key: "geography", terms: ["region", "state", "zip", "geo"] },
  { key: "device / channel preference", terms: ["mobile", "sms", "email preference"] },
];

const SUPPRESSION_DEFAULTS = [
  "Already enrolled / active members",
  "Opted-out of the channel (email/SMS consent revoked)",
  "Recently contacted within the frequency-cap window",
  "Known ineligible (clinical or plan exclusions)",
];

/**
 * Propose a candidate audience/segment definition from the issue's goal and
 * signals. This is a PROPOSAL for human review and warehouse computation — it
 * never reads or writes a production audience or suppression list.
 */
export function buildAudienceSegment(ctx: IssueContext): AudienceSegmentProposal {
  const text = ctx.combinedText;
  const t = normalizeText(text);

  const signals = SIGNAL_BANK.filter((s) => s.terms.some((term) => t.includes(term))).map((s) => s.key);
  if (signals.length === 0) {
    signals.push("Confirm targeting signal(s) with the data team");
  }

  const includeCriteria: string[] = [];
  if (containsAny(text, ["employer", "partner"])) includeCriteria.push("On an active employer eligibility file");
  if (containsAny(text, ["prediabetes", "type 2", "a1c", "metabolic", "diabetes"]))
    includeCriteria.push("Meets clinical eligibility for the metabolic program");
  if (containsAny(text, ["new", "prospect", "unregistered"])) includeCriteria.push("Not yet registered");
  if (containsAny(text, ["lapsed", "inactive", "churn"])) includeCriteria.push("Previously eligible but not activated");
  if (includeCriteria.length === 0) includeCriteria.push("Define inclusion rule with the data team based on the goal");

  const requiredDataSources: string[] = [];
  if (/warehouse|snowflake|bigquery|redshift/.test(t)) requiredDataSources.push("Data warehouse");
  if (/eligibility|census|employer/.test(t)) requiredDataSources.push("Employer eligibility file");
  if (/amplitude|mixpanel|ga4|product analytics/.test(t)) requiredDataSources.push("Product analytics");
  if (requiredDataSources.length === 0) requiredDataSources.push("Confirm source of truth with the data team");

  return {
    issueKey: ctx.issueKey,
    segmentName: ctx.summary.trim() ? `Segment: ${ctx.summary.trim()}` : "Proposed segment (name TBD)",
    hypothesis:
      "These members are most likely to benefit from Twin and to register, based on the detected signals.",
    includeCriteria: uniq(includeCriteria),
    excludeCriteria: uniq(SUPPRESSION_DEFAULTS),
    signals: uniq(signals),
    requiredDataSources: uniq(requiredDataSources),
    estimatedReachNote:
      "Estimated reach must be computed against the warehouse before launch; do not assume a count here.",
    measurement: [
      "Registration rate within the segment",
      "Activation rate post-registration",
      "CAC for the segment",
    ],
    approvalsRequired: [
      "Data/privacy review of targeting signals",
      "Suppression & consent verification before any send",
    ],
    mutatesProductionAudience: false,
  };
}

export type PersonalizationProposal = {
  issueKey: string;
  variables: string[];
  rules: Array<{ when: string; show: string }>;
  fallbacks: string[];
  privacyNotes: string[];
};

/** Propose personalization variables and rules for a segment. Draft only. */
export function proposePersonalization(ctx: IssueContext): PersonalizationProposal {
  const t = normalizeText(ctx.combinedText);
  const variables: string[] = ["First name", "Employer / partner name"];
  if (/region|state|geo|zip/.test(t)) variables.push("Region");
  if (/channel|email|sms/.test(t)) variables.push("Preferred channel");
  if (/lapsed|inactive|re-?engage/.test(t)) variables.push("Last engagement recency");

  return {
    issueKey: ctx.issueKey,
    variables: uniq(variables),
    rules: [
      { when: "Member is on an employer eligibility file", show: "Co-branded employer benefit message" },
      { when: "Member previously engaged but did not register", show: "Re-engagement angle with a simple first step" },
      { when: "No strong signal", show: "Default support & care-team angle" },
    ],
    fallbacks: ["If a variable is missing, drop to a generic, compliant default (never expose raw tokens)."],
    privacyNotes: [
      "Never use protected health information (PHI) in personalization tokens.",
      "Personalization rules require data/privacy review before launch.",
    ],
  };
}
