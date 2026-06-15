// Webtrigger handler: CLI-callable HTTP endpoint for agent invocation.
//
// POST the webtrigger URL (from `forge webtrigger list`) with JSON:
//   {"issueKey":"AIGO-1","agentType":"triage"}
//
// agentType values:
//   triage | claims | experiment | employerLaunch | weeklyReadout
//   (weeklyReadout uses jql field instead of issueKey)
//
// The handler fetches issue context, runs the matching domain function,
// posts an AI-labeled comment via addAnalysisComment, and returns JSON.
// This is the same safe comment-writing path Jira Automation "Use agent" would
// invoke. The webtrigger provides an operator-controlled fallback while BLK-02
// (Rovo/AI activation eligibility) is unresolved.

import { getIssueContext, searchIssues } from "./jira";
import { addAnalysisComment, renderMarkdownFromResult } from "./comments";
import { triageIssue } from "./triage";
import { reviewCreativeClaims } from "./creativeClaims";
import { proposeExperimentSpec as buildExperimentSpec } from "./experiments";
import { createEmployerLaunchPlan as buildEmployerLaunchPlan } from "./employerLaunch";
import { buildWeeklyReadout, ReadoutIssue } from "./readout";
import { DEFAULT_WEEKLY_JQL } from "./config";

const AGENT_LABELS: Record<string, string> = {
  triage: "AI Growth Triage",
  claims: "AI Creative Claims Review",
  experiment: "AI Experiment Spec",
  employerLaunch: "AI Employer Launch Plan",
  weeklyReadout: "AI Weekly Growth Readout",
};

export async function agentWebtrigger(event: any) {
  let body: Record<string, string>;
  try {
    body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : (event.body ?? {});
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { issueKey, agentType, jql } = body;

  if (!agentType || !AGENT_LABELS[agentType]) {
    return jsonResponse(400, {
      error: `agentType must be one of: ${Object.keys(AGENT_LABELS).join(", ")}`,
    });
  }

  const label = AGENT_LABELS[agentType];

  try {
    if (agentType === "weeklyReadout") {
      const effectiveJql = jql ?? DEFAULT_WEEKLY_JQL;
      const raw = await searchIssues(effectiveJql, 50);
      const issues: ReadoutIssue[] = raw.map((r: any) => ({
        key: r?.key ?? "",
        summary: r?.fields?.summary ?? "",
        status: r?.fields?.status?.name ?? "Unknown",
        issueType: r?.fields?.issuetype?.name ?? "Unknown",
        labels: Array.isArray(r?.fields?.labels) ? r.fields.labels : [],
        priority: r?.fields?.priority?.name ?? "Medium",
        updated: r?.fields?.updated ?? "",
      }));
      const result = buildWeeklyReadout(issues);
      const commentBody = renderMarkdownFromResult(label, result as any);
      // Weekly readout comment goes on the first issue found, or skip if none
      if (issues.length === 0) {
        return jsonResponse(200, { agentType, message: "No issues matched JQL", result });
      }
      const targetKey = issues[0].key;
      const comment = await addAnalysisComment({ issueKey: targetKey, commentBody });
      return jsonResponse(200, { agentType, issueKey: targetKey, commentId: comment.id, result });
    }

    if (!issueKey) {
      return jsonResponse(400, { error: "issueKey is required for this agentType" });
    }

    const ctx = await getIssueContext(issueKey);
    let result: Record<string, unknown>;

    switch (agentType) {
      case "triage":
        result = triageIssue(ctx) as any;
        break;
      case "claims":
        result = reviewCreativeClaims(ctx) as any;
        break;
      case "experiment":
        result = buildExperimentSpec(ctx) as any;
        break;
      case "employerLaunch":
        result = buildEmployerLaunchPlan(ctx) as any;
        break;
      default:
        return jsonResponse(400, { error: `Unknown agentType: ${agentType}` });
    }

    const commentBody = renderMarkdownFromResult(label, result);
    const comment = await addAnalysisComment({ issueKey, commentBody });

    return jsonResponse(200, { agentType, issueKey, commentId: comment.id, result });
  } catch (err: any) {
    return jsonResponse(500, { error: String(err?.message ?? err) });
  }
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": ["application/json"] },
    body: JSON.stringify(body, null, 2),
  };
}
