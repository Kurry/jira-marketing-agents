import { IssueContext } from "./types";
import { normalizeText, uniq } from "./utils/text";
import { scanClaimsRisk } from "./utils/risk";
import { clamp } from "./utils/scoring";

export type EmployerLaunchPlan = {
  issueKey: string;
  readinessScore: number;
  launchPhases: Array<{ phase: string; tasks: string[] }>;
  blockers: string[];
  requiredAssets: string[];
  qaChecklist: string[];
  suggestedSubtasks: Array<{
    title: string;
    description: string;
    dueOffsetDays: number;
    ownerGroup: string;
  }>;
};

// Each readiness component: how to detect it and the penalty if missing.
type ReadinessCheck = {
  key: string;
  penalty: number;
  present: (ctx: IssueContext, text: string) => boolean;
  blocker: string;
  asset?: string;
};

const READINESS_CHECKS: ReadinessCheck[] = [
  {
    key: "launch date",
    penalty: 15,
    present: (ctx, text) => Boolean(ctx.dueDate) || /launch date|go[\s-]?live|launch on/.test(text),
    blocker: "Missing launch date.",
  },
  {
    key: "eligibility file",
    penalty: 15,
    present: (_ctx, text) => /eligibility file|eligibility list|census|enrollment file/.test(text),
    blocker: "Missing eligibility file.",
    asset: "Employer eligibility file / census",
  },
  {
    key: "segment/suppression logic",
    penalty: 10,
    present: (_ctx, text) => /segment|suppression|exclusion|targeting logic/.test(text),
    blocker: "Missing segment / suppression logic.",
    asset: "Segment & suppression rules",
  },
  {
    key: "email/sms assets",
    penalty: 10,
    present: (_ctx, text) => /email|sms|message copy|creative/.test(text),
    blocker: "Missing email/SMS assets.",
    asset: "Email and/or SMS creative",
  },
  {
    key: "landing page",
    penalty: 10,
    present: (_ctx, text) => /landing page|microsite|registration page/.test(text),
    blocker: "Missing landing page.",
    asset: "Co-branded landing page",
  },
  {
    key: "tracking",
    penalty: 10,
    present: (_ctx, text) => /tracking|utm|analytics|attribution/.test(text),
    blocker: "Missing tracking.",
    asset: "Tracking / UTM plan",
  },
  {
    key: "claims approval",
    penalty: 10,
    present: (_ctx, text) => /claims approved|compliance approved|legal approved|claims sign[\s-]?off/.test(text),
    blocker: "Missing claims approval.",
    asset: "Documented claims approval",
  },
  {
    key: "owner",
    penalty: 10,
    present: (ctx, text) => Boolean(ctx.assignee) || /owner|dri|responsible/.test(text),
    blocker: "Missing owner.",
  },
];

/** Build an employer launch plan with a readiness score. Pure and testable. */
export function createEmployerLaunchPlan(ctx: IssueContext): EmployerLaunchPlan {
  const text = normalizeText(ctx.combinedText);

  let score = 100;
  const blockers: string[] = [];
  const requiredAssets: string[] = [];

  for (const check of READINESS_CHECKS) {
    if (!check.present(ctx, text)) {
      score -= check.penalty;
      blockers.push(check.blocker);
      if (check.asset) requiredAssets.push(check.asset);
    }
  }

  // Claims language present without documented approval is a hard blocker.
  const claims = scanClaimsRisk(ctx.combinedText);
  if ((claims.risk === "Risky" || claims.risk === "Prohibited") &&
      !/claims approved|compliance approved|legal approved/.test(text)) {
    blockers.push("Risky claims language detected without documented approval.");
  }

  const readinessScore = clamp(score, 0, 100);

  return {
    issueKey: ctx.issueKey,
    readinessScore,
    launchPhases: [
      {
        phase: "Setup",
        tasks: ["Confirm employer / partner details", "Ingest eligibility file", "Define segments & suppression"],
      },
      {
        phase: "Build",
        tasks: ["Build email/SMS assets", "Build landing page", "Implement tracking & UTMs"],
      },
      {
        phase: "Review",
        tasks: ["Claims / compliance review", "QA assets & tracking", "Go/no-go approval"],
      },
      {
        phase: "Launch & Monitor",
        tasks: ["Schedule send", "Monitor deliverability & guardrails", "Post-launch readout"],
      },
    ],
    blockers: uniq(blockers),
    requiredAssets: uniq(requiredAssets),
    qaChecklist: [
      "Eligibility file ingested and row counts reconciled.",
      "Suppression logic verified in staging.",
      "Assets render on target devices and channels.",
      "Tracking/UTMs fire and attribute correctly.",
      "Claims-bearing copy has documented approval.",
    ],
    suggestedSubtasks: [
      { title: "Ingest & validate eligibility file", description: "Load census and reconcile counts.", dueOffsetDays: -14, ownerGroup: "Growth – Ops" },
      { title: "Build segments & suppression", description: "Define audience and exclusions.", dueOffsetDays: -12, ownerGroup: "Growth – Targeting" },
      { title: "Create email/SMS assets", description: "Draft and finalize creative.", dueOffsetDays: -10, ownerGroup: "Growth – Creative" },
      { title: "Claims / compliance review", description: "Review all claims-bearing copy.", dueOffsetDays: -8, ownerGroup: "Compliance / Medical Review" },
      { title: "Implement & QA tracking", description: "Set up UTMs and validate events.", dueOffsetDays: -6, ownerGroup: "Growth – Analytics" },
      { title: "Go/no-go review", description: "Final readiness sign-off.", dueOffsetDays: -2, ownerGroup: "Growth – Partnerships" },
    ],
  };
}
