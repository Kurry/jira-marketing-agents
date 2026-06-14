import { IssueContext, RiskLevel, Priority } from "./types";
import { normalizeText, uniq } from "./utils/text";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";
import { scorePriority } from "./utils/scoring";
import { detectWorkflowArea } from "./triage";
import { OWNER_GROUPS } from "./config";

// ---------------------------------------------------------------------------
// Sprint risk
// ---------------------------------------------------------------------------

export type SprintRiskResult = {
  issueKey: string;
  riskLevel: RiskLevel;
  risks: string[];
  blockers: string[];
  mitigationPlan: string[];
  recommendedStatus: string;
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return null;
  return (ts - Date.now()) / (1000 * 60 * 60 * 24);
}

/** Assess execution risk for a single ticket. Pure and testable. */
export function assessSprintRisk(ctx: IssueContext): SprintRiskResult {
  const text = normalizeText(ctx.combinedText);
  const risks: string[] = [];
  const blockers: string[] = [];
  const mitigationPlan: string[] = [];

  const hasAcceptance = /acceptance criteria|definition of done|done when/.test(text);
  if (!hasAcceptance) {
    risks.push("No acceptance criteria — scope is ambiguous.");
    mitigationPlan.push("Add clear acceptance criteria before starting.");
  }

  const hasOwner = Boolean(ctx.assignee) || /owner|dri/.test(text);
  if (!hasOwner) {
    risks.push("No owner assigned.");
    mitigationPlan.push("Assign a DRI.");
  }

  const due = daysUntil(ctx.dueDate);
  const inProgress = /in progress/i.test(ctx.status);
  if (due !== null && due <= 3 && !inProgress) {
    risks.push("Due within 3 days and not in progress.");
    mitigationPlan.push("Escalate, start now, or renegotiate the due date.");
  }

  const area = detectWorkflowArea(ctx.combinedText, ctx.labels);
  const claims = scanClaimsRisk(ctx.combinedText);
  const claimsReviewNeeded = requiresHumanClaimsReview(claims.risk) || area === "Claims";
  const claimsStarted = /claims (review )?(started|in progress|approved|complete)/.test(text);
  if (claimsReviewNeeded && !claimsStarted) {
    risks.push("Claims review required but not started.");
    mitigationPlan.push("Route claims-bearing copy to compliance now.");
  }

  if (area === "Experiment" && !/tracking|instrumentation|events?/.test(text)) {
    risks.push("Experiment tracking missing.");
    mitigationPlan.push("Define and implement tracking before launch.");
  }

  if (area === "Employer Launch") {
    const missingAssets = !/eligibility file|landing page|email|sms/.test(text);
    if (due !== null && due <= 7 && missingAssets) {
      risks.push("Employer launch date is close with missing assets.");
      mitigationPlan.push("Confirm all required launch assets immediately.");
    }
  }

  if (/blocked|blocker|waiting on|cannot proceed/.test(text)) {
    blockers.push("Issue indicates it is blocked or waiting on a dependency.");
  }

  // Roll up to a risk level.
  let riskLevel: RiskLevel = "Low";
  if (blockers.length > 0) riskLevel = "Blocked";
  else if (risks.length >= 3 || claimsReviewNeeded) riskLevel = "High";
  else if (risks.length >= 1) riskLevel = "Medium";

  const recommendedStatus =
    riskLevel === "Blocked"
      ? "Blocked"
      : riskLevel === "High"
        ? "Needs Human Review"
        : risks.length > 0
          ? "Needs Info"
          : "On Track";

  return {
    issueKey: ctx.issueKey,
    riskLevel,
    risks: uniq(risks),
    blockers: uniq(blockers),
    mitigationPlan: uniq(mitigationPlan),
    recommendedStatus,
  };
}

// ---------------------------------------------------------------------------
// Epic breakdown
// ---------------------------------------------------------------------------

export type EpicBreakdown = {
  issueKey: string;
  epicSummary: string;
  proposedStories: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    dependencies: string[];
    suggestedOwnerGroup: string;
  }>;
};

/** Break an epic into the standard growth child stories. Pure and testable. */
export function breakDownEpic(ctx: IssueContext): EpicBreakdown {
  const base = ctx.summary.trim() || "this epic";

  const proposedStories = [
    {
      title: `Data setup for: ${base}`,
      description: "Establish data sources, eligibility/segments, and tracking foundations.",
      acceptanceCriteria: ["Data sources confirmed.", "Segments defined.", "Tracking plan documented."],
      dependencies: [],
      suggestedOwnerGroup: OWNER_GROUPS.Targeting,
    },
    {
      title: `Creative for: ${base}`,
      description: "Produce the creative assets required for this initiative.",
      acceptanceCriteria: ["Assets drafted.", "Assets QA'd on target channels."],
      dependencies: ["Data setup"],
      suggestedOwnerGroup: OWNER_GROUPS.Creative,
    },
    {
      title: `Claims review for: ${base}`,
      description: "Review all claims-bearing copy for compliance risk.",
      acceptanceCriteria: ["No unresolved high-risk claims.", "Approval documented."],
      dependencies: ["Creative"],
      suggestedOwnerGroup: OWNER_GROUPS.Claims,
    },
    {
      title: `Analytics & tracking for: ${base}`,
      description: "Implement and validate the tracking and reporting.",
      acceptanceCriteria: ["Events implemented.", "Tracking validated in staging."],
      dependencies: ["Data setup"],
      suggestedOwnerGroup: OWNER_GROUPS.Dashboard,
    },
    {
      title: `QA for: ${base}`,
      description: "End-to-end QA across devices, channels, and tracking.",
      acceptanceCriteria: ["Happy path verified.", "Edge cases verified.", "Tracking verified."],
      dependencies: ["Creative", "Analytics & tracking"],
      suggestedOwnerGroup: OWNER_GROUPS["Signup Funnel"],
    },
    {
      title: `Launch & readout for: ${base}`,
      description: "Launch with go/no-go approval and produce a readout.",
      acceptanceCriteria: ["Go/no-go approved.", "Readout published with a decision."],
      dependencies: ["Claims review", "QA"],
      suggestedOwnerGroup: OWNER_GROUPS["Employer Launch"],
    },
  ];

  return { issueKey: ctx.issueKey, epicSummary: base, proposedStories };
}

// ---------------------------------------------------------------------------
// QA test cases
// ---------------------------------------------------------------------------

export type QATestCasesResult = {
  issueKey: string;
  testCases: Array<{
    title: string;
    preconditions: string[];
    steps: string[];
    expectedResult: string;
    priority: "High" | "Medium" | "Low";
  }>;
};

/** Generate QA test cases for an issue. Pure and testable. */
export function generateQATestCases(ctx: IssueContext): QATestCasesResult {
  const area = detectWorkflowArea(ctx.combinedText, ctx.labels);
  const subject = ctx.summary.trim() || "the change";

  const testCases: QATestCasesResult["testCases"] = [
    {
      title: `Happy path: ${subject}`,
      preconditions: ["Valid user/session in the supported environment."],
      steps: ["Perform the primary user flow end to end."],
      expectedResult: "The flow completes successfully and meets the acceptance criteria.",
      priority: "High",
    },
    {
      title: `Edge cases: ${subject}`,
      preconditions: ["Invalid/empty inputs and boundary values prepared."],
      steps: ["Submit invalid, empty, and boundary inputs."],
      expectedResult: "The system handles errors gracefully with clear messaging; no crashes.",
      priority: "Medium",
    },
    {
      title: "Tracking validation",
      preconditions: ["Analytics debugger/inspector available."],
      steps: ["Complete the flow while observing fired events."],
      expectedResult: "All expected events fire once with correct properties.",
      priority: "High",
    },
  ];

  if (area === "Creative" || area === "Claims") {
    testCases.push({
      title: "Claims copy display",
      preconditions: ["Approved copy loaded for the target channel."],
      steps: ["Render the asset on each target channel/device."],
      expectedResult: "Only approved, compliant copy displays; no prohibited claims appear.",
      priority: "High",
    });
  }

  if (area === "Signup Funnel") {
    testCases.push({
      title: "Mobile/device checks",
      preconditions: ["iOS and Android devices (or emulators) ready."],
      steps: ["Complete the funnel step on mobile and desktop."],
      expectedResult: "The step works correctly across devices and viewports.",
      priority: "High",
    });
  }

  return { issueKey: ctx.issueKey, testCases };
}

// ---------------------------------------------------------------------------
// Backlog prioritization
// ---------------------------------------------------------------------------

export type BacklogItem = {
  key: string;
  summary: string;
  labels?: string[];
  issueType?: string;
  dueDate?: string;
};

export type PrioritizedBacklogItem = BacklogItem & {
  priority: Priority;
  reasons: string[];
};

/** Score and order backlog items by priority. Pure and testable. */
export function prioritizeBacklog(items: BacklogItem[]): PrioritizedBacklogItem[] {
  const rank: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return items
    .map((item) => {
      const { priority, reasons } = scorePriority({
        text: item.summary ?? "",
        labels: item.labels ?? [],
        issueType: item.issueType,
        dueDate: item.dueDate,
      });
      return { ...item, priority, reasons };
    })
    .sort((a, b) => rank[a.priority] - rank[b.priority]);
}
