// NIH classification (T-NIH-07): twin-specific-keep. Referral-loop design with
// anti-kickback/inducement compliance flags and fraud guardrails is Twin
// regulated-health policy with no native Atlassian equivalent. Design-only, no
// mutation. No reduction needed.
import { IssueContext } from "./types";
import { normalizeText, uniq } from "./utils/text";

export type ReferralLoopDesign = {
  issueKey: string;
  mechanic: string;
  incentiveStructure: string;
  trigger: string;
  trackingRequirements: string[];
  fraudGuardrails: string[];
  complianceFlags: string[];
  kFactorPlan: string;
  acceptanceCriteria: string[];
  approvalsRequired: string[];
};

/**
 * Design a referral loop (mechanic, incentive, tracking, fraud guardrails).
 * Design only — it does not create incentives or send anything.
 */
export function designReferralLoop(ctx: IssueContext): ReferralLoopDesign {
  const t = normalizeText(ctx.combinedText);
  const incentivized = /incentive|reward|gift card|\$|points|bonus/.test(t);

  const complianceFlags: string[] = [
    "Healthcare referral incentives can trigger anti-kickback / inducement rules — legal review required before offering any reward.",
    "Do not condition clinical care on referrals.",
  ];
  if (incentivized) {
    complianceFlags.push("This design references a monetary/value incentive — confirm it is permissible for the member population.");
  }

  return {
    issueKey: ctx.issueKey,
    mechanic:
      "Post-activation member shares a personal referral link; referred eligible members who register are attributed to the referrer.",
    incentiveStructure: incentivized
      ? "Proposed: a compliant, non-clinical thank-you (e.g., branded item) pending legal review — NOT cash-for-signups."
      : "Recognition-only by default (no monetary incentive) unless legal approves an alternative.",
    trigger: "Offer the referral prompt only after a member reaches early activation (not at signup).",
    trackingRequirements: [
      "Unique referral link / code per member",
      "Referred-registration attribution",
      "Referrer → referee mapping",
      "Funnel: invite sent → link opened → registered → activated",
    ],
    fraudGuardrails: [
      "Deduplicate self-referrals and existing members",
      "Rate-limit invites per referrer",
      "Verify referee eligibility before any reward",
      "Monitor for anomalous referral spikes",
    ],
    complianceFlags: uniq(complianceFlags),
    kFactorPlan:
      "Measure invites/member × conversion/invite to estimate the K-factor; do not claim virality until measured.",
    acceptanceCriteria: [
      "Referral attribution is accurate and de-duplicated.",
      "Only eligible referred members count toward any reward.",
      "Incentive (if any) has documented legal approval.",
    ],
    approvalsRequired: ["Legal / compliance review of incentive and mechanic", "Data/privacy review of referral tracking"],
  };
}
