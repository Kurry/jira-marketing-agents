// NIH classification (T-NIH-07): native-wrapper / candidate-to-delegate.
// This module re-implements duplicate detection (Jaccard text overlap +
// label/component overlap) that Jira partly owns natively: JQL/Lucene text
// search for candidate retrieval, and the native "Duplicate" issue-link type
// for recording confirmed duplicates. Native owner: Jira (matrix rows
// "Project/work item operations" via ACLI/REST + issue links). Severity: medium.
// Reduction: have the handler retrieve candidates via JQL `text ~`/`summary ~`
// (Lucene relevance) instead of scoring all issues here, and surface confirmed
// duplicates as `is duplicated by` issue links rather than a custom score.
// The Twin-specific part worth keeping is the label/component weighting and the
// human-review framing; the generic text-similarity ranking is the NIH part.
import { IssueContext, SimilarIssue } from "./types";
import { jaccardSimilarity, uniq } from "./utils/text";

export type DuplicateResult = {
  issueKey: string;
  possibleDuplicates: SimilarIssue[];
};

// A lightweight, raw shape for candidate issues coming from a JQL search.
export type CandidateIssue = {
  key: string;
  summary: string;
  status: string;
  labels?: string[];
  components?: string[];
};

/**
 * Score candidate issues against the current issue and return likely duplicates.
 * Similarity blends text overlap (Jaccard) with label/component overlap.
 * Pure and testable: candidates are passed in (the handler fetches them).
 */
export function findDuplicates(
  ctx: IssueContext,
  candidates: CandidateIssue[],
  opts: { threshold?: number; maxResults?: number } = {}
): DuplicateResult {
  const threshold = opts.threshold ?? 0.2;
  const maxResults = opts.maxResults ?? 5;

  const baseText = `${ctx.summary} ${ctx.description}`;
  const baseLabels = new Set(ctx.labels.map((l) => l.toLowerCase()));
  const baseComponents = new Set(ctx.components.map((c) => c.toLowerCase()));

  const scored: SimilarIssue[] = candidates
    .filter((c) => c.key && c.key !== ctx.issueKey)
    .map((c) => {
      const textScore = jaccardSimilarity(baseText, c.summary ?? "");

      const labelOverlap = (c.labels ?? []).some((l) => baseLabels.has(l.toLowerCase()));
      const componentOverlap = (c.components ?? []).some((cm) => baseComponents.has(cm.toLowerCase()));

      // Weighted blend: text dominates, labels/components nudge the score up.
      let score = textScore * 0.8;
      if (labelOverlap) score += 0.1;
      if (componentOverlap) score += 0.1;
      score = Math.min(score, 1);

      const reasonParts: string[] = [`Text overlap ${(textScore * 100).toFixed(0)}%`];
      if (labelOverlap) reasonParts.push("shared labels");
      if (componentOverlap) reasonParts.push("shared components");

      return {
        key: c.key,
        summary: c.summary ?? "",
        status: c.status ?? "Unknown",
        similarityScore: Number(score.toFixed(3)),
        reason: reasonParts.join("; "),
      };
    })
    .filter((s) => s.similarityScore >= threshold)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);

  return {
    issueKey: ctx.issueKey,
    possibleDuplicates: scored,
  };
}

export { uniq };
