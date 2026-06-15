// NIH classification (T-NIH-07): mixed — bucketing is native-adjacent, the
// decision memo is twin-specific-keep. The status/type/label classification of
// issues into completed/blocked/decisions/etc. duplicates what a saved JQL
// filter, a Jira dashboard gadget, or Atlassian Analytics can group natively.
// Native owner: Jira filters/dashboards + Atlassian Analytics (matrix row
// "Weekly readouts and dashboards"). Severity: low. Reduction: drive the
// buckets from saved JQL filters / Analytics groupings instead of re-bucketing
// in TS; KEEP the "top three actions" prioritization and the AI decision-memo
// framing, which are Twin growth-ops logic and the point of the agent.
import { uniq } from "./utils/text";

export type WeeklyReadout = {
  period: string;
  completedWork: string[];
  blockedWork: string[];
  decisionsNeeded: string[];
  claimsBottlenecks: string[];
  experimentsToCall: string[];
  employerLaunchRisks: string[];
  highImpactFunnelIssues: string[];
  topThreeActions: string[];
};

// Minimal shape of a search result issue used for the readout.
export type ReadoutIssue = {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  labels?: string[];
  updated?: string;
};

const DONE_STATUSES = ["done", "closed", "resolved", "complete", "shipped"];
const BLOCKED_STATUSES = ["blocked", "waiting", "on hold"];

function isStatus(status: string, set: string[]): boolean {
  const s = (status ?? "").toLowerCase();
  return set.some((x) => s.includes(x));
}

/**
 * Build a weekly readout from a list of recently-updated issues.
 * Pure and testable: the handler supplies the issues (via JQL search).
 */
export function buildWeeklyReadout(issues: ReadoutIssue[], days = 7): WeeklyReadout {
  const completedWork: string[] = [];
  const blockedWork: string[] = [];
  const decisionsNeeded: string[] = [];
  const claimsBottlenecks: string[] = [];
  const experimentsToCall: string[] = [];
  const employerLaunchRisks: string[] = [];
  const highImpactFunnelIssues: string[] = [];

  for (const issue of issues) {
    const line = `${issue.key}: ${issue.summary}`;
    const type = (issue.issueType ?? "").toLowerCase();
    const labels = (issue.labels ?? []).map((l) => l.toLowerCase());

    if (isStatus(issue.status, DONE_STATUSES)) {
      completedWork.push(line);
      continue;
    }
    if (isStatus(issue.status, BLOCKED_STATUSES)) {
      blockedWork.push(line);
    }

    if (type.includes("decision") || labels.includes("decision-needed")) {
      decisionsNeeded.push(line);
    }
    if (type.includes("claims") || labels.includes("claims-risk")) {
      claimsBottlenecks.push(line);
    }
    if (type.includes("experiment")) {
      experimentsToCall.push(line);
    }
    if (type.includes("employer launch") || labels.includes("employer-launch")) {
      employerLaunchRisks.push(line);
    }
    if (type.includes("signup funnel") || labels.includes("funnel")) {
      highImpactFunnelIssues.push(line);
    }
  }

  // Top three actions: prioritize unblocking, decisions, and claims bottlenecks.
  const topThreeActions = uniq([
    ...blockedWork.map((l) => `Unblock — ${l}`),
    ...decisionsNeeded.map((l) => `Decide — ${l}`),
    ...claimsBottlenecks.map((l) => `Clear claims review — ${l}`),
    ...experimentsToCall.map((l) => `Call experiment — ${l}`),
  ]).slice(0, 3);

  return {
    period: `Last ${days} day(s)`,
    completedWork: uniq(completedWork),
    blockedWork: uniq(blockedWork),
    decisionsNeeded: uniq(decisionsNeeded),
    claimsBottlenecks: uniq(claimsBottlenecks),
    experimentsToCall: uniq(experimentsToCall),
    employerLaunchRisks: uniq(employerLaunchRisks),
    highImpactFunnelIssues: uniq(highImpactFunnelIssues),
    topThreeActions,
  };
}
