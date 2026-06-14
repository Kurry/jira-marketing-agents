import { IssueContext } from "./types";
import { normalizeText, uniq, containsAny } from "./utils/text";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";

export type CampaignPlan = {
  issueKey: string;
  objective: string;
  audienceRef: string;
  channelSequence: Array<{ step: number; channel: string; timing: string; purpose: string }>;
  cadence: string;
  guardrails: string[];
  suppressionChecks: string[];
  trackingRequirements: string[];
  approvalsRequired: string[];
  // The plan is a DRAFT for a human to execute; the app never sends.
  executionMode: "draft — human executes the send";
  readyToRequestSend: boolean;
  notReadyReasons: string[];
};

function detectChannels(text: string): string[] {
  const t = normalizeText(text);
  const channels: string[] = [];
  if (t.includes("email")) channels.push("Email");
  if (t.includes("sms") || t.includes("text")) channels.push("SMS");
  if (t.includes("push")) channels.push("Push");
  if (t.includes("direct mail") || t.includes("postcard")) channels.push("Direct mail");
  if (t.includes("paid") || t.includes("ads")) channels.push("Paid social");
  return channels.length ? channels : ["Email"];
}

/**
 * Build a multi-touch campaign / outreach plan (orchestration) for a human to
 * execute. It sequences channels, sets guardrails, and lists required
 * approvals. It NEVER sends messages or mutates audiences.
 */
export function buildCampaignPlan(ctx: IssueContext): CampaignPlan {
  const text = ctx.combinedText;
  const channels = detectChannels(text);

  const channelSequence = channels.map((channel, i) => ({
    step: i + 1,
    channel,
    timing: i === 0 ? "Day 0 (launch)" : `Day ${i * 3} (follow-up)`,
    purpose: i === 0 ? "Introduce Twin and the eligibility check" : "Reminder / address a likely objection",
  }));

  const claims = scanClaimsRisk(text);
  const approvalsRequired = [
    "Human go/no-go to execute the send",
    "Consent & suppression verification (per channel)",
  ];
  if (requiresHumanClaimsReview(claims.risk)) {
    approvalsRequired.push("Claims / compliance review of all copy");
  }
  if (channels.includes("SMS")) approvalsRequired.push("TCPA / SMS consent verification");
  if (channels.includes("Email")) approvalsRequired.push("CAN-SPAM compliance (unsubscribe, sender identity)");

  const notReadyReasons: string[] = [];
  if (!containsAny(text, ["segment", "audience", "eligibility", "list"]))
    notReadyReasons.push("No audience/segment is referenced.");
  if (!containsAny(text, ["goal", "objective", "register", "signup", "conversion"]))
    notReadyReasons.push("No clear objective is stated.");

  return {
    issueKey: ctx.issueKey,
    objective: ctx.summary.trim() || "Drive eligible members to register and activate",
    audienceRef: "Use the approved audience segment proposal (see Audience Builder agent).",
    channelSequence,
    cadence: "Respect a frequency cap (e.g., max 2 touches/week) and quiet hours for SMS.",
    guardrails: [
      "Unsubscribe / opt-out honored before every send",
      "Spam complaint rate monitored",
      "Frequency cap enforced",
      "No unapproved claims in any asset",
      "Suppression list applied",
    ],
    suppressionChecks: [
      "Already-enrolled members suppressed",
      "Opted-out members suppressed",
      "Frequency-capped members suppressed",
      "Known-ineligible members suppressed",
    ],
    trackingRequirements: [
      "Per-channel send/delivery/open/click events",
      "Registration conversion attributed to the campaign",
      "Guardrail events (unsubscribe, complaint)",
    ],
    approvalsRequired: uniq(approvalsRequired),
    executionMode: "draft — human executes the send",
    readyToRequestSend: notReadyReasons.length === 0,
    notReadyReasons,
  };
}
