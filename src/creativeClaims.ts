// NIH classification (T-NIH-07): twin-specific-keep. Claims-risk review that
// never approves and always routes risky/prohibited copy to humans is the
// central Twin safety invariant — explicitly listed under "What Should Stay
// Custom" in specs/atlassian-native-tools.md. No native Atlassian equivalent;
// must stay custom and must never become an auto-approver.
import { IssueContext, ClaimsRisk } from "./types";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";
import { containsAny, uniq } from "./utils/text";

export type CreativeClaimsResult = {
  issueKey: string;
  overallClaimsRisk: ClaimsRisk;
  flaggedPhrases: Array<{
    phrase: string;
    issue: string;
    saferRewrite: string;
  }>;
  channelWarnings: string[];
  humanReviewRequired: boolean;
};

/**
 * Review creative copy for claims risk. This NEVER approves claims; it only
 * classifies risk and suggests safer rewrites. Risky/prohibited results always
 * require human review.
 */
export function reviewCreativeClaims(ctx: IssueContext): CreativeClaimsResult {
  const text = ctx.combinedText;
  const scan = scanClaimsRisk(text);

  const channelWarnings: string[] = [];
  if (containsAny(text, ["sms", "text message"])) {
    channelWarnings.push("SMS: ensure consent and opt-out language; health claims are especially scrutinized.");
  }
  if (containsAny(text, ["email"])) {
    channelWarnings.push("Email: include unsubscribe; avoid unsubstantiated health outcomes in subject lines.");
  }
  if (containsAny(text, ["paid", "ad", "ads", "meta", "google ads"])) {
    channelWarnings.push("Paid ads: platforms restrict health/medical claims; risky copy may be rejected or penalized.");
  }

  const humanReviewRequired = requiresHumanClaimsReview(scan.risk);

  return {
    issueKey: ctx.issueKey,
    overallClaimsRisk: scan.risk,
    flaggedPhrases: uniq(scan.phrases.map((p) => p.phrase)).map((phrase) => {
      const found = scan.phrases.find((p) => p.phrase === phrase)!;
      return { phrase: found.phrase, issue: found.issue, saferRewrite: found.saferRewrite };
    }),
    channelWarnings,
    humanReviewRequired,
  };
}
