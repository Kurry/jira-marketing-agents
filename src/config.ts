// Optional configuration for custom Jira field IDs.
//
// Custom field IDs are instance-specific and must NOT be hard-coded. For the
// MVP, agent outputs are surfaced through comments and labels rather than
// custom field writes. If/when field writes are enabled (see policies and the
// README "Future Extensions"), wire the field IDs here via environment
// variables and gate writes behind an explicit allowlist.
//
// NIH-CLASSIFICATION (T-NIH-07): native-wrapper / instance-binding (acceptable,
// with a caveat).
//   The FIELD_IDS env-var indirection is the correct portability seam: the
//   field-ID -> meaning mapping should be OWNED by the golden company-managed
//   template project + ACLI `jira field` (matrix rows "Jira admin configuration"
//   and "Project/work item operations"), and merely READ here at runtime. That
//   is legitimate glue, not NIH. CAVEAT: OWNER_GROUPS and DEFAULT_WEEKLY_JQL
//   below are advisory routing/query defaults baked into code — these duplicate
//   what Jira components/assignee-rules and saved Jira filters (ACLI `jira
//   filter`) own natively. Keep them as fallbacks only; the native owners are a
//   saved filter (for the readout JQL) and component/group routing (for owners),
//   not this file. RECOMMENDATION ONLY — no behavior change here.

export const FIELD_IDS: Record<string, string | undefined> = {
  workflowArea: process.env.WORKFLOW_AREA_FIELD_ID ?? undefined,
  claimsRisk: process.env.CLAIMS_RISK_FIELD_ID ?? undefined,
  priorityScore: process.env.PRIORITY_SCORE_FIELD_ID ?? undefined,
  segment: process.env.SEGMENT_FIELD_ID ?? undefined,
  primaryMetric: process.env.PRIMARY_METRIC_FIELD_ID ?? undefined,
  experimentId: process.env.EXPERIMENT_ID_FIELD_ID ?? undefined,
};

// Default project key for the AI Growth Ops project.
export const DEFAULT_PROJECT_KEY = process.env.AIGO_PROJECT_KEY ?? "AIGO";

// Default JQL for the weekly readout when none is supplied.
export const DEFAULT_WEEKLY_JQL = `project = ${DEFAULT_PROJECT_KEY} AND updated >= -7d ORDER BY updated DESC`;

// Owner group routing by workflow area. These are advisory labels, not Jira
// groups; they help reviewers assign work. Override as needed for your org.
export const OWNER_GROUPS: Record<string, string> = {
  Targeting: "Growth – Targeting",
  Creative: "Growth – Creative",
  Experiment: "Growth – Experimentation",
  Dashboard: "Growth – Analytics",
  "Employer Launch": "Growth – Partnerships",
  Claims: "Compliance / Medical Review",
  "Signup Funnel": "Growth – Product",
  Research: "Growth – Insights",
  Automation: "Growth – Ops",
  Unknown: "Growth – Triage",
};
