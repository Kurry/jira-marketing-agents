import { Priority } from "../types";
import { normalizeText } from "./text";

// Phrase banks for the priority heuristic. These are intentionally explicit so
// that the scoring is auditable and unit-testable.
const P0_TERMS = [
  "production outage",
  "outage",
  "legal blocker",
  "compliance blocker",
  "broken signup",
  "signup broken",
  "cannot register",
  "can't register",
  "registration broken",
  "registration is broken",
  "bad link",
  "broken link",
  "phi",
  "privacy incident",
  "data breach",
  "p0",
];

const P1_TERMS = [
  "launch blocker",
  "blocking launch",
  "high impact",
  "high-impact",
  "conversion drop",
  "conversion issue",
  "claims risk",
  "tracking broken",
  "tracking is broken",
  "broken tracking",
  "active experiment",
  "near-term",
  "p1",
];

const P3_TERMS = [
  "research",
  "backlog",
  "nice to have",
  "nice-to-have",
  "future",
  "someday",
  "exploration",
  "idea",
  "p3",
];

/**
 * Heuristically score the priority of an issue from its text, labels,
 * issue type, and due date. Returns the priority and the reasons that drove it.
 */
export function scorePriority(input: {
  text: string;
  labels: string[];
  issueType?: string;
  dueDate?: string;
}): { priority: Priority; reasons: string[] } {
  const text = normalizeText(input.text);
  const labels = (input.labels ?? []).map(normalizeText);
  const reasons: string[] = [];

  const hasAny = (terms: string[]): string | null => {
    for (const term of terms) {
      if (text.includes(term) || labels.includes(term)) return term;
    }
    return null;
  };

  const p0 = hasAny(P0_TERMS);
  if (p0) {
    reasons.push(`Matched P0 signal: "${p0}"`);
    return { priority: "P0", reasons };
  }

  const p1 = hasAny(P1_TERMS);
  if (p1) {
    reasons.push(`Matched P1 signal: "${p1}"`);
  }

  // Due date proximity can escalate to P1.
  if (input.dueDate) {
    const due = Date.parse(input.dueDate);
    if (!Number.isNaN(due)) {
      const days = (due - Date.now()) / (1000 * 60 * 60 * 24);
      if (days <= 3) {
        reasons.push("Due date within 3 days");
        return { priority: "P1", reasons };
      }
    }
  }

  if (p1) {
    return { priority: "P1", reasons };
  }

  const p3 = hasAny(P3_TERMS);
  if (p3) {
    reasons.push(`Matched P3 signal: "${p3}"`);
    return { priority: "P3", reasons };
  }

  reasons.push("No urgent or low-priority signals; defaulting to standard priority");
  return { priority: "P2", reasons };
}

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
