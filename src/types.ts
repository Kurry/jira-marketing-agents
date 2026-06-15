// Shared types for the AI Growth Ops Rovo agents app.

export type IssueKeyPayload = {
  issueKey: string;
};

export type WeeklyReadoutPayload = {
  jql: string;
  days?: number;
};

export type AddCommentPayload = {
  issueKey: string;
  commentBody: string;
};

export type WorkflowArea =
  | "Targeting"
  | "Creative"
  | "Experiment"
  | "Dashboard"
  | "Employer Launch"
  | "Claims"
  | "Signup Funnel"
  | "Research"
  | "Automation"
  | "Unknown";

export type RiskLevel = "Low" | "Medium" | "High" | "Blocked";

export type ClaimsRisk =
  | "Safe"
  | "Needs substantiation"
  | "Risky"
  | "Prohibited"
  | "Requires human review";

export type DecisionRecommendation =
  | "Scale"
  | "Kill"
  | "Iterate"
  | "Extend"
  | "Approve"
  | "Block"
  | "Needs review";

export type Priority = "P0" | "P1" | "P2" | "P3";

// NIH-CLASSIFICATION (T-NIH-07): native-wrapper / DTO (acceptable).
//   IssueContext is a flattened projection of Jira's native issue model
//   (api.asApp().requestJira -> /rest/api/3/issue). It is NOT a re-implementation
//   of the Jira issue schema — it is a deliberately reduced, side-effect-free
//   view (with the pre-joined `combinedText`) that lets the pure domain modules
//   be tested without Jira. jira.js exposes generated issue types, but those are
//   the Node-SDK shape and would not run in the Forge sandbox; a small local DTO
//   is the correct seam. Keep custom. The string-union enums (WorkflowArea,
//   ClaimsRisk, Priority, etc.) encode Twin growth/safety taxonomy and are
//   Twin-specific logic per specs/atlassian-native-tools.md.
// A normalized, plain-object view of a Jira issue used across the handlers.
export type IssueContext = {
  issueKey: string;
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  status: string;
  labels: string[];
  components: string[];
  assignee: string | null;
  reporter: string | null;
  created: string | null;
  updated: string | null;
  dueDate: string | null;
  projectKey: string | null;
  parentKey: string | null;
  subtaskKeys: string[];
  comments: string[];
  // The full combined text (summary + description + comments) for scanning.
  combinedText: string;
};

export type SimilarIssue = {
  key: string;
  summary: string;
  status: string;
  similarityScore: number;
  reason: string;
};
