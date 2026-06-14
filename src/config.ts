// Optional configuration for custom Jira field IDs.
//
// Custom field IDs are instance-specific and must NOT be hard-coded. For the
// MVP, agent outputs are surfaced through comments and labels rather than
// custom field writes. If/when field writes are enabled (see policies and the
// README "Future Extensions"), wire the field IDs here via environment
// variables and gate writes behind an explicit allowlist.

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
