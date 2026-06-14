// MCP tool registry for the AI Growth Ops growth-ops capabilities.
//
// Each tool wraps a PURE domain function from src/ (the same logic the Forge
// agents use) and returns structured JSON. Most tools resolve an IssueContext
// (by issueKey via the REST client, or from fields Cowork supplies) and call
// the domain function. A few are "special" (search/list/write).

import { JiraClient } from "./jiraClient";
import { resolveContext, contextFromFields, IssueInput } from "./context";

import { triageIssue } from "../src/triage";
import { analyzeRequirements, proposeAcceptanceCriteria } from "../src/requirements";
import { proposeExperimentSpec } from "../src/experiments";
import { reviewCreativeClaims } from "../src/creativeClaims";
import { createEmployerLaunchPlan } from "../src/employerLaunch";
import { createDashboardSpec } from "../src/dashboards";
import { analyzeFunnelFriction } from "../src/funnel";
import { findDuplicates, CandidateIssue } from "../src/duplicates";
import {
  assessSprintRisk,
  breakDownEpic,
  generateQATestCases,
  prioritizeBacklog,
  BacklogItem,
} from "../src/backlog";
import { buildWeeklyReadout, ReadoutIssue } from "../src/readout";
import { generateCreativeVariants } from "../src/creativeGen";
import { buildAudienceSegment, proposePersonalization } from "../src/audience";
import { buildCampaignPlan } from "../src/campaign";
import { createLandingPageSpec } from "../src/landingPage";
import { designReferralLoop } from "../src/referral";
import { proposeActivationPlan } from "../src/activation";

export type ToolDef = {
  name: string;
  description: string;
  // JSON-schema-ish input shape for the MCP tool definition.
  inputSchema: Record<string, unknown>;
  run(args: any, jira: JiraClient | null): Promise<unknown>;
};

// Shared input schema for the many issue-analysis tools: an issueKey OR fields.
const ISSUE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    issueKey: { type: "string", description: "Jira issue key (e.g. AIGO-123). Fetched if Jira is configured." },
    summary: { type: "string", description: "Issue summary (use when not passing issueKey)." },
    description: { type: "string", description: "Issue description text." },
    comments: { type: "array", items: { type: "string" }, description: "Comment texts." },
    labels: { type: "array", items: { type: "string" } },
    components: { type: "array", items: { type: "string" } },
    issueType: { type: "string" },
    status: { type: "string" },
    assignee: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] },
  },
} as const;

// Helper to define a standard "resolve context → call fn" tool.
function contextTool(
  name: string,
  description: string,
  fn: (ctx: ReturnType<typeof contextFromFields>) => unknown
): ToolDef {
  return {
    name,
    description,
    inputSchema: ISSUE_INPUT_SCHEMA,
    async run(args: IssueInput, jira) {
      const ctx = await resolveContext(args ?? {}, jira);
      return fn(ctx);
    },
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: "get_issue_context",
    description: "Fetch and normalize a Jira issue (summary, description, comments, labels, components, fields).",
    inputSchema: ISSUE_INPUT_SCHEMA,
    async run(args: IssueInput, jira) {
      return resolveContext(args ?? {}, jira);
    },
  },
  contextTool("classify_growth_issue", "Triage intake: workflow area, priority, risk, missing info, owner, next status.", triageIssue),
  contextTool("propose_requirements_gaps", "Identify missing requirements, clarifying questions, blockers, ready-for-work.", analyzeRequirements),
  contextTool("propose_acceptance_criteria", "Generate acceptance criteria, definition of done, and QA checks.", proposeAcceptanceCriteria),
  contextTool("break_down_epic", "Break an epic into child stories with acceptance criteria, dependencies, owners.", breakDownEpic),
  contextTool("assess_sprint_risk", "Assess ticket/sprint execution risk and propose mitigations.", assessSprintRisk),
  contextTool("generate_qa_test_cases", "Generate QA test cases (happy/edge/tracking/claims/device).", generateQATestCases),
  contextTool("propose_experiment_spec", "Draft an experiment spec with metrics, guardrails, variants, decision rule.", proposeExperimentSpec),
  contextTool("review_creative_claims_risk", "Review creative copy for claims risk and suggest safer rewrites. Never approves.", reviewCreativeClaims),
  contextTool("create_employer_launch_plan", "Build an employer launch workback plan, readiness score, and subtasks.", createEmployerLaunchPlan),
  contextTool("create_dashboard_spec", "Draft a dashboard analytics specification.", createDashboardSpec),
  contextTool("analyze_funnel_friction", "Analyze a signup funnel issue and recommend a fix.", analyzeFunnelFriction),
  contextTool("generate_creative_variants", "Draft compliant creative variants per channel; scans each for claims risk.", generateCreativeVariants),
  contextTool("build_audience_segment", "Propose a candidate audience/segment definition. Never mutates audiences.", buildAudienceSegment),
  contextTool("propose_personalization", "Propose personalization variables and rules for a segment.", proposePersonalization),
  contextTool("build_campaign_plan", "Draft a multi-touch outreach plan for a human to execute. Never sends.", buildCampaignPlan),
  contextTool("create_landing_page_spec", "Produce a landing page spec with compliance-scanned draft copy.", createLandingPageSpec),
  contextTool("design_referral_loop", "Design a referral loop with tracking, fraud guardrails, and compliance flags.", designReferralLoop),
  contextTool("propose_activation_plan", "Propose an early-activation plan for newly registered members.", proposeActivationPlan),

  {
    name: "prioritize_backlog",
    description: "Score and order a list of backlog items by priority (P0–P3).",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              summary: { type: "string" },
              labels: { type: "array", items: { type: "string" } },
              issueType: { type: "string" },
              dueDate: { type: "string" },
            },
            required: ["key", "summary"],
          },
        },
      },
    },
    async run(args: { items: BacklogItem[] }) {
      return prioritizeBacklog(args?.items ?? []);
    },
  },

  {
    name: "find_similar_issues",
    description: "Find likely duplicate issues by text/label/component overlap. Requires Jira configured.",
    inputSchema: ISSUE_INPUT_SCHEMA,
    async run(args: IssueInput, jira) {
      const ctx = await resolveContext(args ?? {}, jira);
      if (!jira) throw new Error("find_similar_issues requires Jira to be configured (JIRA_BASE_URL/EMAIL/API_TOKEN).");
      const project = ctx.projectKey ?? "AIGO";
      const jql = `project = "${project}" AND key != "${ctx.issueKey}" AND updated >= -90d ORDER BY updated DESC`;
      const raw = await jira.searchIssues(jql, 50);
      const candidates: CandidateIssue[] = raw.map((r: any) => ({
        key: r?.key,
        summary: r?.fields?.summary ?? "",
        status: r?.fields?.status?.name ?? "Unknown",
        labels: Array.isArray(r?.fields?.labels) ? r.fields.labels : [],
        components: Array.isArray(r?.fields?.components) ? r.fields.components.map((c: any) => c?.name).filter(Boolean) : [],
      }));
      return findDuplicates(ctx, candidates);
    },
  },

  {
    name: "generate_weekly_readout",
    description: "Weekly growth readout over recent AIGO issues. Requires Jira configured.",
    inputSchema: {
      type: "object",
      properties: {
        jql: { type: "string", description: "JQL (defaults to project = AIGO AND updated >= -7d ORDER BY updated DESC)." },
        days: { type: "integer", description: "Lookback days (default 7)." },
      },
    },
    async run(args: { jql?: string; days?: number }, jira) {
      if (!jira) throw new Error("generate_weekly_readout requires Jira to be configured.");
      const jql = args?.jql?.trim() || "project = AIGO AND updated >= -7d ORDER BY updated DESC";
      const raw = await jira.searchIssues(jql, 100);
      const issues: ReadoutIssue[] = raw.map((r: any) => ({
        key: r?.key,
        summary: r?.fields?.summary ?? "",
        status: r?.fields?.status?.name ?? "Unknown",
        issueType: r?.fields?.issuetype?.name ?? "Unknown",
        labels: Array.isArray(r?.fields?.labels) ? r.fields.labels : [],
        updated: r?.fields?.updated,
      }));
      return buildWeeklyReadout(issues, args?.days ?? 7);
    },
  },

  {
    name: "add_analysis_comment",
    description: "Add an AI-labeled analysis comment to an issue. The ONLY mutating tool; gated by AIGO_ALLOW_WRITES=true.",
    inputSchema: {
      type: "object",
      required: ["issueKey", "commentBody"],
      properties: {
        issueKey: { type: "string" },
        commentBody: { type: "string" },
      },
    },
    async run(args: { issueKey: string; commentBody: string }, jira) {
      if (!jira) throw new Error("add_analysis_comment requires Jira to be configured.");
      if (!args?.issueKey || !args?.commentBody?.trim()) throw new Error("issueKey and commentBody are required.");
      const body = `🤖 AI Growth Ops (analysis only — no actions were taken)\n\n${args.commentBody}`;
      return jira.addComment(args.issueKey, body);
    },
  },
];

/** Look up a tool by name. */
export function getTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}
