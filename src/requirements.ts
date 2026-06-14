import { IssueContext } from "./types";
import { detectWorkflowArea, detectMissingInfo } from "./triage";
import { normalizeText, uniq } from "./utils/text";

export type RequirementsGapResult = {
  issueKey: string;
  missingFields: string[];
  clarifyingQuestions: string[];
  blockers: string[];
  readyForWork: boolean;
};

// The canonical requirements checklist for AI Growth Ops work.
const REQUIRED_CHECKS = [
  "Goal",
  "User/customer",
  "Segment",
  "Channel",
  "Metric",
  "Owner",
  "Due date",
  "Acceptance criteria",
  "Data source",
  "Approval requirements",
];

const CHECK_TERMS: Record<string, string[]> = {
  Goal: ["goal", "objective", "we want", "in order to"],
  "User/customer": ["user", "customer", "member", "persona"],
  Segment: ["segment", "audience", "cohort"],
  Channel: ["channel", "email", "sms", "paid", "push", "landing page"],
  Metric: ["metric", "kpi", "conversion", "rate", "ctr", "cvr"],
  "Acceptance criteria": ["acceptance criteria", "definition of done", "done when"],
  "Data source": ["data source", "source system", "warehouse", "table", "tracking"],
  "Approval requirements": ["approval", "sign off", "sign-off", "compliance", "legal", "go/no-go"],
};

const QUESTION_BY_CHECK: Record<string, string> = {
  Goal: "What is the specific goal or objective of this work?",
  "User/customer": "Who is the target user or customer?",
  Segment: "Which segment or audience does this apply to?",
  Channel: "Which channel(s) are in scope (email, SMS, paid, landing page)?",
  Metric: "What is the primary metric we will move or measure?",
  Owner: "Who is the owner / DRI for this work?",
  "Due date": "What is the due date or decision date?",
  "Acceptance criteria": "What are the acceptance criteria for done?",
  "Data source": "What is the data source or system of record?",
  "Approval requirements": "What approvals are required (claims, legal, launch)?",
};

/** Pure requirements-gap analysis over an IssueContext. */
export function analyzeRequirements(ctx: IssueContext): RequirementsGapResult {
  const text = normalizeText(ctx.combinedText);

  const present = (check: string): boolean => {
    if (check === "Owner") return Boolean(ctx.assignee);
    if (check === "Due date") return Boolean(ctx.dueDate);
    const terms = CHECK_TERMS[check] ?? [check.toLowerCase()];
    return terms.some((t) => text.includes(normalizeText(t)));
  };

  const missingFields = REQUIRED_CHECKS.filter((c) => !present(c));
  const clarifyingQuestions = missingFields
    .map((c) => QUESTION_BY_CHECK[c])
    .filter(Boolean);

  // Blockers: explicit blocker language plus area-specific hard gaps.
  const area = detectWorkflowArea(ctx.combinedText, ctx.labels);
  const areaMissing = detectMissingInfo(ctx, area);
  const blockers: string[] = [];
  if (/blocked|blocker|waiting on|cannot proceed/.test(text)) {
    blockers.push("Issue text indicates it is blocked or waiting on a dependency.");
  }
  if (area === "Experiment" && areaMissing.includes("Primary metric")) {
    blockers.push("Experiment has no measurable primary metric.");
  }
  if (area === "Employer Launch" && areaMissing.includes("Launch date")) {
    blockers.push("Employer launch has no launch date.");
  }

  // Ready for work only if the critical fields are present and nothing blocks it.
  const critical = ["Goal", "Metric", "Acceptance criteria", "Owner"];
  const criticalMissing = critical.filter((c) => missingFields.includes(c));
  const readyForWork = criticalMissing.length === 0 && blockers.length === 0;

  return {
    issueKey: ctx.issueKey,
    missingFields,
    clarifyingQuestions: uniq(clarifyingQuestions),
    blockers: uniq(blockers),
    readyForWork,
  };
}

export type AcceptanceCriteriaResult = {
  issueKey: string;
  acceptanceCriteria: string[];
  definitionOfDone: string[];
  qaChecks: string[];
};

/** Generate acceptance criteria, DoD, and QA checks for an issue. */
export function proposeAcceptanceCriteria(ctx: IssueContext): AcceptanceCriteriaResult {
  const area = detectWorkflowArea(ctx.combinedText, ctx.labels);

  const acceptanceCriteria: string[] = [
    `Given the goal in ${ctx.issueKey}, when the work is delivered, then the stated objective is verifiably met.`,
  ];
  const definitionOfDone: string[] = [
    "Acceptance criteria reviewed and signed off by the owner.",
    "Changes documented in the issue.",
  ];
  const qaChecks: string[] = ["Verify the change in a staging or preview environment."];

  switch (area) {
    case "Experiment":
      acceptanceCriteria.push(
        "Given the experiment is live, when an eligible user is exposed, then they are bucketed correctly and tracking fires.",
        "Given the runtime ends, when the primary metric is read, then the decision rule determines ship/kill/iterate."
      );
      qaChecks.push("Validate variant assignment and event tracking end to end.");
      break;
    case "Creative":
      acceptanceCriteria.push(
        "Given the creative, when claims review runs, then no unresolved high-risk claim remains."
      );
      qaChecks.push("Render the asset on each target channel/device and confirm copy displays correctly.");
      break;
    case "Employer Launch":
      acceptanceCriteria.push(
        "Given the launch date, when assets and tracking are confirmed, then go/no-go can be approved."
      );
      qaChecks.push("Confirm eligibility file ingest and suppression logic in staging.");
      break;
    case "Dashboard":
      acceptanceCriteria.push(
        "Given the dashboard, when a stakeholder opens it, then it answers the stated business question."
      );
      qaChecks.push("Reconcile dashboard metrics against the source system.");
      break;
    case "Signup Funnel":
      acceptanceCriteria.push(
        "Given the affected step, when a user completes it on supported devices, then they proceed without error."
      );
      qaChecks.push("Test on mobile and desktop; confirm tracking fires for the fixed step.");
      break;
    default:
      acceptanceCriteria.push("Given the deliverable, when reviewed, then it satisfies the documented requirements.");
  }

  return {
    issueKey: ctx.issueKey,
    acceptanceCriteria: uniq(acceptanceCriteria),
    definitionOfDone: uniq(definitionOfDone),
    qaChecks: uniq(qaChecks),
  };
}
