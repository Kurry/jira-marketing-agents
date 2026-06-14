import { IssueContext } from "./types";
import { normalizeText, uniq } from "./utils/text";

export type DashboardSpec = {
  issueKey: string;
  businessQuestion: string;
  users: string[];
  metrics: string[];
  dimensions: string[];
  filters: string[];
  sourceSystems: string[];
  refreshCadence: string;
  charts: string[];
  qaChecks: string[];
  acceptanceCriteria: string[];
};

type DashboardCategory = {
  name: string;
  match: string[];
  businessQuestion: string;
  metrics: string[];
  dimensions: string[];
  charts: string[];
};

// Categories from the spec. The first matching category drives the defaults.
const CATEGORIES: DashboardCategory[] = [
  {
    name: "Executive acquisition",
    match: ["executive", "acquisition overview", "exec dashboard", "leadership"],
    businessQuestion: "How is overall member acquisition trending against goal?",
    metrics: ["New signups", "CAC", "Conversion rate", "Cost per signup"],
    dimensions: ["Week", "Channel", "Segment"],
    charts: ["Signups over time", "CAC trend", "Channel mix"],
  },
  {
    name: "Segment performance",
    match: ["segment performance", "segment dashboard", "by segment"],
    businessQuestion: "Which segments are converting best and worst?",
    metrics: ["Conversion rate", "Signups", "Revenue per user"],
    dimensions: ["Segment", "Channel", "Week"],
    charts: ["Conversion by segment", "Signups by segment"],
  },
  {
    name: "Employer launch",
    match: ["employer launch", "partner launch dashboard", "employer dashboard"],
    businessQuestion: "How are employer launches performing post go-live?",
    metrics: ["Eligible population", "Activation rate", "Signups", "Suppression rate"],
    dimensions: ["Employer", "Week", "Channel"],
    charts: ["Activation by employer", "Signups vs eligible"],
  },
  {
    name: "Experimentation",
    match: ["experiment dashboard", "experimentation", "a/b dashboard", "test results"],
    businessQuestion: "What is the status and result of active experiments?",
    metrics: ["Primary metric lift", "Exposure count", "Guardrail metrics"],
    dimensions: ["Experiment", "Variant", "Segment"],
    charts: ["Lift by experiment", "Guardrail monitor"],
  },
  {
    name: "Creative performance",
    match: ["creative performance", "creative dashboard", "ad performance"],
    businessQuestion: "Which creatives drive the best engagement and conversion?",
    metrics: ["CTR", "Conversion rate", "Spend", "ROAS"],
    dimensions: ["Creative", "Channel", "Segment"],
    charts: ["CTR by creative", "Conversion by creative"],
  },
  {
    name: "Signup funnel",
    match: ["signup funnel", "funnel dashboard", "conversion funnel"],
    businessQuestion: "Where are users dropping off in the signup funnel?",
    metrics: ["Step completion rate", "Drop-off rate", "Time on step"],
    dimensions: ["Funnel step", "Device", "Channel"],
    charts: ["Funnel drop-off", "Completion by device"],
  },
  {
    name: "Channel performance",
    match: ["channel performance", "channel dashboard", "by channel"],
    businessQuestion: "How is each acquisition channel performing?",
    metrics: ["Signups", "CAC", "Conversion rate", "Spend"],
    dimensions: ["Channel", "Week", "Campaign"],
    charts: ["Signups by channel", "CAC by channel"],
  },
  {
    name: "Claims review",
    match: ["claims review dashboard", "claims dashboard", "compliance dashboard"],
    businessQuestion: "What is the volume and status of claims reviews?",
    metrics: ["Reviews in queue", "Avg review time", "Risk distribution"],
    dimensions: ["Risk level", "Channel", "Week"],
    charts: ["Queue over time", "Risk distribution"],
  },
  {
    name: "Member objection",
    match: ["member objection", "objection dashboard", "complaint dashboard"],
    businessQuestion: "What objections and complaints are members raising?",
    metrics: ["Complaint rate", "Unsubscribe rate", "Objection volume"],
    dimensions: ["Objection type", "Channel", "Segment"],
    charts: ["Objections by type", "Complaint trend"],
  },
  {
    name: "Weekly growth decision",
    match: ["weekly growth", "decision dashboard", "weekly decision"],
    businessQuestion: "What decisions do we need to make this week to hit growth goals?",
    metrics: ["Goal attainment", "Pipeline of experiments", "Blocked items"],
    dimensions: ["Week", "Workflow area", "Owner"],
    charts: ["Goal vs actual", "Decisions needed"],
  },
];

function pickCategory(text: string): DashboardCategory {
  const t = normalizeText(text);
  for (const c of CATEGORIES) {
    if (c.match.some((m) => t.includes(normalizeText(m)))) return c;
  }
  // Default to executive acquisition when no category is detected.
  return CATEGORIES[0];
}

/** Build a dashboard spec from an issue. Pure and testable. */
export function createDashboardSpec(ctx: IssueContext): DashboardSpec {
  const category = pickCategory(ctx.combinedText);
  const t = normalizeText(ctx.combinedText);

  const sourceSystems: string[] = [];
  if (/warehouse|snowflake|bigquery|redshift/.test(t)) sourceSystems.push("Data warehouse");
  if (/amplitude|mixpanel|ga4|google analytics/.test(t)) sourceSystems.push("Product analytics");
  if (/salesforce|crm|hubspot/.test(t)) sourceSystems.push("CRM");
  if (sourceSystems.length === 0) sourceSystems.push("Confirm source system(s) with data team");

  return {
    issueKey: ctx.issueKey,
    businessQuestion: category.businessQuestion,
    users: ["Growth leadership", "Workflow owners", "Analytics"],
    metrics: category.metrics,
    dimensions: category.dimensions,
    filters: ["Date range", "Channel", "Segment", "Employer (where applicable)"],
    sourceSystems: uniq(sourceSystems),
    refreshCadence: /real[\s-]?time|hourly/.test(t) ? "Hourly" : "Daily",
    charts: category.charts,
    qaChecks: [
      "Metrics reconcile against the source system within tolerance.",
      "Filters apply correctly across all charts.",
      "No null/duplicate rows in the underlying query.",
    ],
    acceptanceCriteria: [
      `Dashboard answers: "${category.businessQuestion}"`,
      "Stakeholders can self-serve the listed metrics and dimensions.",
      "Refresh cadence meets the stated decision timeline.",
    ],
  };
}
