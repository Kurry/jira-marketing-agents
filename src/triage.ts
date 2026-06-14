import { IssueContext, RiskLevel, WorkflowArea, ClaimsRisk, Priority } from "./types";
import { scorePriority } from "./utils/scoring";
import { scanClaimsRisk, requiresHumanClaimsReview } from "./utils/risk";
import { containsAny, normalizeText, uniq } from "./utils/text";
import { OWNER_GROUPS } from "./config";

export type TriageResult = {
  issueKey: string;
  cleanSummary: string;
  recommendedIssueType: string;
  workflowArea: WorkflowArea;
  priority: Priority;
  riskLevel: RiskLevel;
  claimsRisk?: ClaimsRisk;
  suggestedOwnerGroup: string;
  missingInformation: string[];
  recommendedNextStatus: string;
  acceptanceCriteria: string[];
  suggestedSubtasks: string[];
  humanApprovalsRequired: string[];
};

// Signal banks for workflow-area detection. Order matters: the first area with
// a match wins, except Claims/Signup which can be force-detected below.
const AREA_SIGNALS: Array<{ area: WorkflowArea; terms: string[] }> = [
  { area: "Signup Funnel", terms: ["signup", "sign up", "sign-up", "registration", "register", "onboarding", "funnel", "checkout"] },
  { area: "Claims", terms: ["claim", "health claim", "fda", "cure", "reversal", "medication", "compliance copy"] },
  { area: "Creative", terms: ["creative", "ad copy", "email copy", "headline", "banner", "asset", "landing page copy"] },
  { area: "Experiment", terms: ["experiment", "a/b", "ab test", "split test", "hypothesis", "variant", "holdout"] },
  { area: "Dashboard", terms: ["dashboard", "report", "analytics view", "looker", "tableau", "metric report"] },
  { area: "Employer Launch", terms: ["employer", "partner launch", "eligibility file", "employer launch", "client launch"] },
  { area: "Targeting", terms: ["audience", "segment", "targeting", "suppression", "lookalike", "list"] },
  { area: "Automation", terms: ["automation", "workflow rule", "trigger", "scheduled rule"] },
  { area: "Research", terms: ["research", "insight", "brief", "discovery", "user interview"] },
];

const ISSUE_TYPE_BY_AREA: Record<WorkflowArea, string> = {
  "Signup Funnel": "Signup Funnel Issue",
  Claims: "Claims Review",
  Creative: "Creative Request",
  Experiment: "Experiment",
  Dashboard: "Dashboard Request",
  "Employer Launch": "Employer Launch",
  Targeting: "Segmentation Request",
  Automation: "Automation Request",
  Research: "Insight / Research Brief",
  Unknown: "Growth Task",
};

/**
 * Detect the workflow area from the combined issue text and labels.
 * Uses a match-count score so a clear signal (e.g. "dashboard" + "report")
 * wins over an incidental keyword (e.g. "signups by channel"). Ties are broken
 * by AREA_SIGNALS order.
 */
export function detectWorkflowArea(text: string, labels: string[]): WorkflowArea {
  const haystack = normalizeText([text, ...labels].join(" "));
  let best: { area: WorkflowArea; score: number } = { area: "Unknown", score: 0 };

  for (const { area, terms } of AREA_SIGNALS) {
    const score = terms.reduce(
      (acc, t) => (haystack.includes(normalizeText(t)) ? acc + 1 : acc),
      0
    );
    if (score > best.score) {
      best = { area, score };
    }
  }

  return best.area;
}

/** Map a claims/priority/text picture into an overall risk level. */
function deriveRiskLevel(args: {
  priority: Priority;
  claimsRisk: ClaimsRisk;
  text: string;
}): RiskLevel {
  if (containsAny(args.text, ["blocked", "blocker", "cannot proceed", "waiting on"])) {
    return "Blocked";
  }
  if (args.priority === "P0" || args.claimsRisk === "Prohibited") return "High";
  if (args.priority === "P1" || requiresHumanClaimsReview(args.claimsRisk)) return "High";
  if (args.claimsRisk === "Needs substantiation") return "Medium";
  if (args.priority === "P2") return "Medium";
  return "Low";
}

/**
 * Core triage logic. Pure: takes an IssueContext, returns a TriageResult.
 * Never mutates the issue.
 */
export function triageIssue(ctx: IssueContext): TriageResult {
  const text = ctx.combinedText;
  const workflowArea = detectWorkflowArea(text, ctx.labels);

  const { priority, reasons } = scorePriority({
    text,
    labels: ctx.labels,
    issueType: ctx.issueType,
    dueDate: ctx.dueDate ?? undefined,
  });

  const claims = scanClaimsRisk(text);
  const claimsRisk = claims.risk;

  const riskLevel = deriveRiskLevel({ priority, claimsRisk, text });

  // Missing-information checks shared with the requirements agent.
  const missingInformation = detectMissingInfo(ctx, workflowArea);

  // Human approvals: claims, launches, audience changes, production signup.
  const humanApprovalsRequired: string[] = [];
  if (requiresHumanClaimsReview(claimsRisk) || workflowArea === "Claims") {
    humanApprovalsRequired.push("Compliance / medical claims review");
  }
  if (workflowArea === "Employer Launch") {
    humanApprovalsRequired.push("Launch go/no-go approval");
  }
  if (workflowArea === "Targeting" || containsAny(text, ["audience", "suppression", "segment"])) {
    humanApprovalsRequired.push("Audience / suppression change approval");
  }
  if (workflowArea === "Signup Funnel" || containsAny(text, ["production signup", "production sign up", "live signup"])) {
    humanApprovalsRequired.push("Production signup-flow change approval");
  }

  const isAmbiguous =
    workflowArea === "Unknown" || ctx.summary.trim().length < 5 || missingInformation.length >= 4;

  const recommendedNextStatus = computeNextStatus({
    isAmbiguous,
    riskLevel,
    humanApprovals: humanApprovalsRequired,
    missingInformation,
  });

  const acceptanceCriteria = baselineAcceptanceCriteria(workflowArea);
  const suggestedSubtasks = baselineSubtasks(workflowArea);

  return {
    issueKey: ctx.issueKey,
    cleanSummary: cleanSummary(ctx.summary, workflowArea),
    recommendedIssueType: ISSUE_TYPE_BY_AREA[workflowArea],
    workflowArea,
    priority,
    riskLevel,
    claimsRisk,
    suggestedOwnerGroup: OWNER_GROUPS[workflowArea] ?? OWNER_GROUPS.Unknown,
    missingInformation,
    recommendedNextStatus,
    acceptanceCriteria,
    suggestedSubtasks,
    humanApprovalsRequired: uniq(humanApprovalsRequired),
  };
}

function computeNextStatus(args: {
  isAmbiguous: boolean;
  riskLevel: RiskLevel;
  humanApprovals: string[];
  missingInformation: string[];
}): string {
  if (args.isAmbiguous) return "Needs Human Review";
  if (args.riskLevel === "High" || args.humanApprovals.length > 0) return "Needs Human Review";
  if (args.missingInformation.length > 0) return "Needs Info";
  return "Ready";
}

function cleanSummary(summary: string, area: WorkflowArea): string {
  const trimmed = (summary ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return `[${area}] (no summary provided)`;
  return trimmed;
}

const BASE_CHECKS = ["Goal", "Owner", "Due date", "Acceptance criteria"];
const AREA_EXTRA_CHECKS: Partial<Record<WorkflowArea, string[]>> = {
  Experiment: ["Primary metric", "Audience / segment", "Channel", "Decision rule"],
  Creative: ["Channel", "Claims approval status"],
  "Employer Launch": ["Launch date", "Eligibility file", "Segment / suppression logic"],
  Dashboard: ["Business question", "Source system", "Metrics"],
  "Signup Funnel": ["Affected step", "Evidence / data", "Device coverage"],
  Targeting: ["Segment definition", "Suppression rules"],
};

/** Detect missing requirements relevant to the issue's workflow area. */
export function detectMissingInfo(ctx: IssueContext, area: WorkflowArea): string[] {
  const text = normalizeText(ctx.combinedText);
  const missing: string[] = [];

  const checkMap: Record<string, string[]> = {
    Goal: ["goal", "objective", "we want", "in order to"],
    Owner: ["owner", "assignee", "dri", "responsible"],
    "Due date": ["due", "deadline", "by "],
    "Acceptance criteria": ["acceptance criteria", "definition of done", "done when"],
    "Primary metric": ["metric", "kpi", "conversion", "rate"],
    "Audience / segment": ["audience", "segment", "cohort"],
    Channel: ["channel", "email", "sms", "paid", "push"],
    "Decision rule": ["decision rule", "ship if", "kill if", "success criteria"],
    "Claims approval status": ["claims approved", "compliance approved", "legal approved"],
    "Launch date": ["launch date", "go live", "go-live", "launch on"],
    "Eligibility file": ["eligibility file", "eligibility list", "census"],
    "Segment / suppression logic": ["suppression", "segment logic", "exclusion"],
    "Business question": ["business question", "question we", "decision this answers"],
    "Source system": ["source system", "data source", "warehouse", "table"],
    Metrics: ["metric", "measure", "kpi"],
    "Affected step": ["step", "screen", "page", "field"],
    "Evidence / data": ["evidence", "data shows", "analytics", "drop-off", "dropoff"],
    "Device coverage": ["mobile", "desktop", "ios", "android", "device"],
    "Segment definition": ["segment", "audience definition"],
    "Suppression rules": ["suppression", "exclude"],
  };

  // Use the assignee field directly for ownership presence.
  const present = (label: string): boolean => {
    if (label === "Owner" && ctx.assignee) return true;
    if (label === "Due date" && ctx.dueDate) return true;
    const terms = checkMap[label] ?? [label.toLowerCase()];
    return terms.some((t) => text.includes(normalizeText(t)));
  };

  const checks = uniq([...BASE_CHECKS, ...(AREA_EXTRA_CHECKS[area] ?? [])]);
  for (const c of checks) {
    if (!present(c)) missing.push(c);
  }
  return missing;
}

function baselineAcceptanceCriteria(area: WorkflowArea): string[] {
  switch (area) {
    case "Experiment":
      return [
        "Hypothesis, primary metric, and decision rule are documented.",
        "Tracking is implemented and validated before launch.",
        "Guardrail metrics are defined and monitored.",
      ];
    case "Creative":
      return [
        "Copy passes claims review with no unresolved high-risk phrases.",
        "Asset renders correctly on target channels and devices.",
      ];
    case "Employer Launch":
      return [
        "Launch date, eligibility file, and tracking are confirmed.",
        "Claims-bearing assets have documented approval.",
      ];
    case "Dashboard":
      return [
        "Dashboard answers the stated business question.",
        "Metrics reconcile against the source system.",
      ];
    case "Signup Funnel":
      return [
        "The affected step works on supported devices.",
        "Tracking fires correctly for the fixed step.",
      ];
    default:
      return ["Goal is met and verified.", "Acceptance criteria are documented and reviewed."];
  }
}

function baselineSubtasks(area: WorkflowArea): string[] {
  switch (area) {
    case "Experiment":
      return ["Define experiment spec", "Implement tracking", "QA tracking", "Launch & monitor", "Readout & decision"];
    case "Creative":
      return ["Draft copy/asset", "Claims review", "QA on channels", "Schedule"];
    case "Employer Launch":
      return ["Confirm eligibility file", "Build segments", "Claims review", "QA tracking", "Go/no-go review"];
    case "Dashboard":
      return ["Define metrics & sources", "Build dashboard", "QA reconciliation", "Stakeholder review"];
    case "Signup Funnel":
      return ["Reproduce issue", "Diagnose root cause", "Fix", "QA across devices", "Validate tracking"];
    default:
      return ["Clarify requirements", "Execute", "Review"];
  }
}
