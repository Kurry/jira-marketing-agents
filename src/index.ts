// Forge function handlers for the AI Growth Ops Rovo agents.
//
// Each read handler fetches an IssueContext and delegates to a pure function in
// a domain module, returning structured JSON. The only mutating handler is
// addAnalysisComment. Handlers never mutate issues, approve claims, launch
// campaigns, change audiences, alter suppression, or edit production systems.

import api, { route } from "@forge/api";
import { getIssueContext as fetchIssueContext, searchIssues } from "./jira";
import {
  IssueKeyPayload,
  WeeklyReadoutPayload,
  AddCommentPayload,
} from "./types";
import { DEFAULT_WEEKLY_JQL } from "./config";

import { triageIssue } from "./triage";
import { analyzeRequirements, proposeAcceptanceCriteria as buildAcceptanceCriteria } from "./requirements";
import { proposeExperimentSpec as buildExperimentSpec } from "./experiments";
import { reviewCreativeClaims } from "./creativeClaims";
import { createEmployerLaunchPlan as buildEmployerLaunchPlan } from "./employerLaunch";
import { createDashboardSpec as buildDashboardSpec } from "./dashboards";
import { analyzeFunnelFriction as buildFunnelAnalysis } from "./funnel";
import { findDuplicates, CandidateIssue } from "./duplicates";
import { assessSprintRisk as buildSprintRisk, breakDownEpic as buildEpicBreakdown, generateQATestCases as buildQATestCases } from "./backlog";
import { buildWeeklyReadout, ReadoutIssue } from "./readout";
import { addAnalysisComment as doAddComment } from "./comments";
import { generateCreativeVariants as buildCreativeVariants } from "./creativeGen";
import { buildAudienceSegment as buildAudience, proposePersonalization as buildPersonalization } from "./audience";
import { buildCampaignPlan as buildCampaign } from "./campaign";
import { createLandingPageSpec as buildLandingPageSpec } from "./landingPage";
import { designReferralLoop as buildReferralLoop } from "./referral";
import { proposeActivationPlan as buildActivationPlan } from "./activation";

// Forge invokes handlers with the action inputs as the first argument. Inputs
// may arrive nested under `payload` depending on the invocation path, so we
// normalize defensively.
function resolvePayload<T>(arg: any): T {
  if (arg && typeof arg === "object" && "payload" in arg && arg.payload) {
    return arg.payload as T;
  }
  return arg as T;
}

function requireIssueKey(arg: any): string {
  const { issueKey } = resolvePayload<IssueKeyPayload>(arg);
  if (!issueKey) throw new Error("issueKey is required");
  return issueKey;
}

// --- Read actions ---------------------------------------------------------

export async function getIssueContext(req: any) {
  const issueKey = requireIssueKey(req);
  return fetchIssueContext(issueKey);
}

export async function classifyGrowthIssue(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return triageIssue(ctx);
}

export async function findSimilarIssues(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));

  // Search recent issues in the same project, excluding the current one.
  const project = ctx.projectKey ?? "AIGO";
  const jql = `project = "${project}" AND key != "${ctx.issueKey}" AND updated >= -90d ORDER BY updated DESC`;
  const raw = await searchIssues(jql, 50);

  const candidates: CandidateIssue[] = raw.map((r: any) => ({
    key: r?.key,
    summary: r?.fields?.summary ?? "",
    status: r?.fields?.status?.name ?? "Unknown",
    labels: Array.isArray(r?.fields?.labels) ? r.fields.labels : [],
    components: Array.isArray(r?.fields?.components)
      ? r.fields.components.map((c: any) => c?.name).filter(Boolean)
      : [],
  }));

  return findDuplicates(ctx, candidates);
}

export async function proposeAcceptanceCriteria(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildAcceptanceCriteria(ctx);
}

export async function proposeRequirementsGaps(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return analyzeRequirements(ctx);
}

export async function breakDownEpic(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildEpicBreakdown(ctx);
}

export async function assessSprintRisk(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildSprintRisk(ctx);
}

export async function generateQATestCases(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildQATestCases(ctx);
}

export async function proposeExperimentSpec(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildExperimentSpec(ctx);
}

export async function reviewCreativeClaimsRisk(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return reviewCreativeClaims(ctx);
}

export async function createEmployerLaunchPlan(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildEmployerLaunchPlan(ctx);
}

export async function createDashboardSpec(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildDashboardSpec(ctx);
}

export async function analyzeFunnelFriction(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildFunnelAnalysis(ctx);
}

export async function generateWeeklyReadout(req: any) {
  const { jql, days } = resolvePayload<WeeklyReadoutPayload>(req);
  const effectiveJql = jql && jql.trim() ? jql : DEFAULT_WEEKLY_JQL;
  const raw = await searchIssues(effectiveJql, 100);

  const issues: ReadoutIssue[] = raw.map((r: any) => ({
    key: r?.key,
    summary: r?.fields?.summary ?? "",
    status: r?.fields?.status?.name ?? "Unknown",
    issueType: r?.fields?.issuetype?.name ?? "Unknown",
    labels: Array.isArray(r?.fields?.labels) ? r.fields.labels : [],
    updated: r?.fields?.updated,
  }));

  return buildWeeklyReadout(issues, days ?? 7);
}

// --- Growth execution agents (draft / plan / spec — never autonomous) ------

export async function generateCreativeVariants(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildCreativeVariants(ctx);
}

export async function buildAudienceSegment(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildAudience(ctx);
}

export async function proposePersonalization(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildPersonalization(ctx);
}

export async function buildCampaignPlan(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildCampaign(ctx);
}

export async function createLandingPageSpec(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildLandingPageSpec(ctx);
}

export async function designReferralLoop(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildReferralLoop(ctx);
}

export async function proposeActivationPlan(req: any) {
  const ctx = await fetchIssueContext(requireIssueKey(req));
  return buildActivationPlan(ctx);
}

// --- Mutating action (explicit, allowlisted) ------------------------------

export async function addAnalysisComment(req: any) {
  const payload = resolvePayload<AddCommentPayload>(req);
  return doAddComment(payload);
}

// --- Automation import (operator-invoked only, all rules imported DISABLED) ---

interface ImportAutomationPayload {
  cloudId: string;
  rules: object[];
  dryRun?: boolean;
}

export async function importAutomationRules(req: any) {
  const { cloudId, rules, dryRun } = resolvePayload<ImportAutomationPayload>(req);

  if (!cloudId) throw new Error("cloudId is required");
  if (!Array.isArray(rules) || rules.length === 0) throw new Error("rules array is required and must not be empty");

  if (dryRun) {
    return { dryRun: true, ruleCount: rules.length, message: "Dry run — no rules imported" };
  }

  const results: Array<{ name: string; status: number; body: unknown }> = [];

  for (const rule of rules as any[]) {
    const resp = await api.asApp().requestJira(
      route`/gateway/api/automation/internal-api/jira/${cloudId}/pro/rest/GLOBAL/rules/import`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, state: "DISABLED" }),
      }
    );

    let body: unknown;
    try { body = await resp.json(); } catch { body = null; }

    results.push({ name: rule.name ?? "(unnamed)", status: resp.status, body });
  }

  const failed = results.filter((r) => r.status >= 400);
  return {
    imported: results.filter((r) => r.status < 400).length,
    failed: failed.length,
    results,
    ...(failed.length > 0 && { errors: failed }),
  };
}
