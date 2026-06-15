import { ClaimsRisk } from "../types";
import { normalizeText } from "./text";

// NIH-CLASSIFICATION (T-NIH-07): Twin-specific logic (acceptable, not NIH).
//   The claims-risk rule bank + scanner encode Twin healthcare-claims safety
//   policy (policies/claims-risk-policy.md). This is core custom IP that no
//   Atlassian-native tool provides and must stay custom per CLAUDE.md and
//   specs/atlassian-native-tools.md. The only platform-adjacent dependency is
//   normalizeText (see the text.ts NIH note) — the regex matching itself is
//   policy, not a re-implemented platform capability.

type ClaimRule = {
  // Regex (case-insensitive) matched against normalized text.
  pattern: RegExp;
  label: string;
  issue: string;
  saferRewrite: string;
  // Severity drives the overall risk roll-up.
  severity: "prohibited" | "risky" | "needs-substantiation";
};

// Health / claims risk rules. Patterns are deliberately broad so that close
// variants ("reverse diabetes in 30 days", "guaranteed reversal") are caught.
const CLAIM_RULES: ClaimRule[] = [
  {
    pattern: /guaranteed\s+reversal|reverse\s+diabetes(\s+in\s+\d+\s+days?)?|diabetes\s+reversal/,
    label: "diabetes reversal",
    issue: "Implies a guaranteed cure/reversal of a chronic disease.",
    saferRewrite: "May support healthier blood sugar habits for some members.",
    severity: "prohibited",
  },
  {
    pattern: /cure\s+diabetes|cures?\s+\w+\s+disease|cure\b/,
    label: "cure",
    issue: "Disease-cure claims are prohibited without rigorous substantiation.",
    saferRewrite: "Designed to help members manage their condition alongside their care team.",
    severity: "prohibited",
  },
  {
    pattern: /get\s+off\s+(your\s+)?medication|no\s+medication\s+needed|stop\s+taking\s+(your\s+)?medication|off\s+meds/,
    label: "stop medication",
    issue: "Encourages stopping prescribed medication; medically unsafe and prohibited.",
    saferRewrite: "Always talk to your doctor before making changes to your medication.",
    severity: "prohibited",
  },
  {
    pattern: /diagnose|diagnosis\s+of/,
    label: "diagnose",
    issue: "Implies the product diagnoses conditions.",
    saferRewrite: "Provides information to discuss with a qualified healthcare provider.",
    severity: "risky",
  },
  {
    pattern: /replace\s+your\s+doctor|instead\s+of\s+(your\s+)?doctor|no\s+doctor\s+needed/,
    label: "replace your doctor",
    issue: "Positions the product as a substitute for medical care.",
    saferRewrite: "Works alongside your doctor and care team.",
    severity: "prohibited",
  },
  {
    pattern: /guaranteed\s+weight\s+loss|lose\s+\d+\s*(lbs?|pounds?|kg)\s+guaranteed|guaranteed\s+results/,
    label: "guaranteed results",
    issue: "Guaranteed outcome claims require strong substantiation and are usually prohibited.",
    saferRewrite: "Results vary; many members see progress over time.",
    severity: "prohibited",
  },
  {
    pattern: /fda[-\s]?approved|fda\s+cleared/,
    label: "FDA-approved",
    issue: "FDA-approval claims must be substantiated and accurate.",
    saferRewrite: "Remove unless you can cite a specific FDA approval/clearance for the exact product.",
    severity: "needs-substantiation",
  },
  {
    pattern: /clinically\s+proven|scientifically\s+proven|proven\s+to/,
    label: "clinically proven",
    issue: "Efficacy claims require substantiation (citations to studies).",
    saferRewrite: "Informed by published research (link the specific study).",
    severity: "needs-substantiation",
  },
];

/**
 * Scan free text for risky health/marketing claims.
 * Returns an overall risk classification and the specific flagged phrases.
 */
export function scanClaimsRisk(text: string): {
  risk: ClaimsRisk;
  phrases: Array<{ phrase: string; issue: string; saferRewrite: string }>;
} {
  const normalized = normalizeText(text);
  const phrases: Array<{ phrase: string; issue: string; saferRewrite: string }> = [];
  let hasProhibited = false;
  let hasRisky = false;
  let hasNeedsSub = false;

  for (const rule of CLAIM_RULES) {
    const match = normalized.match(rule.pattern);
    if (match) {
      phrases.push({
        phrase: match[0],
        issue: rule.issue,
        saferRewrite: rule.saferRewrite,
      });
      if (rule.severity === "prohibited") hasProhibited = true;
      else if (rule.severity === "risky") hasRisky = true;
      else hasNeedsSub = true;
    }
  }

  let risk: ClaimsRisk = "Safe";
  if (hasProhibited) risk = "Prohibited";
  else if (hasRisky) risk = "Risky";
  else if (hasNeedsSub) risk = "Needs substantiation";

  return { risk, phrases };
}

/** True if the claims risk level requires a human reviewer before proceeding. */
export function requiresHumanClaimsReview(risk: ClaimsRisk): boolean {
  return risk === "Risky" || risk === "Prohibited" || risk === "Requires human review";
}
