// NIH classification (T-NIH-07): twin-specific-keep. Early-activation plan
// (member milestones, consent/claims-safe nudges, guardrails) is Twin product/
// safety logic with no native Atlassian equivalent. No reduction needed.
import { IssueContext } from "./types";
import { normalizeText, uniq } from "./utils/text";

export type ActivationPlan = {
  issueKey: string;
  activationDefinition: string;
  milestones: Array<{ milestone: string; targetTiming: string }>;
  onboardingSteps: string[];
  nudges: Array<{ channel: string; timing: string; message: string }>;
  metrics: string[];
  guardrails: string[];
  acceptanceCriteria: string[];
};

/**
 * Propose an early-activation plan: what "activated" means, onboarding steps,
 * nudges, and the metrics to watch. Draft only — it does not send nudges.
 */
export function proposeActivationPlan(ctx: IssueContext): ActivationPlan {
  const t = normalizeText(ctx.combinedText);
  const hasDevice = /sensor|cgm|device|wearable|monitor/.test(t);

  const onboardingSteps = [
    "Complete registration",
    "Match with care team",
    ...(hasDevice ? ["Activate the device/sensor"] : []),
    "Complete first guided session",
    "Log the first data point",
  ];

  return {
    issueKey: ctx.issueKey,
    activationDefinition:
      "Early activation = member completes onboarding and reaches first value (first session + first data point) within 7 days of registration.",
    milestones: [
      { milestone: "Registered", targetTiming: "Day 0" },
      { milestone: "Care team matched", targetTiming: "Day 0–1" },
      { milestone: "First session completed", targetTiming: "Day 1–3" },
      { milestone: "First data point logged", targetTiming: "Day 1–7" },
    ],
    onboardingSteps: uniq(onboardingSteps),
    nudges: [
      { channel: "Email", timing: "Day 1 if not activated", message: "Welcome — here's your first step (compliant, no health claims)." },
      { channel: "SMS", timing: "Day 3 if not activated (with consent)", message: "A quick reminder to finish setup. Reply STOP to opt out." },
      { channel: "Push", timing: "Day 5 if not activated", message: "Your care team is ready when you are." },
    ],
    metrics: [
      "Activation rate (% activated within 7 days)",
      "Time to first value",
      "Onboarding step completion rates",
      "Drop-off by step",
    ],
    guardrails: [
      "Respect channel consent and frequency caps",
      "No unapproved health claims in nudges",
      "Stop nudging once activated or opted out",
    ],
    acceptanceCriteria: [
      "Activation is measurable and instrumented per step.",
      "Nudges honor consent, frequency caps, and claims policy.",
    ],
  };
}
