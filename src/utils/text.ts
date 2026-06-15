// Text utilities for parsing ADF and comparing issue content.
//
// NIH-CLASSIFICATION (T-NIH-07): mixed.
//   - extractPlainTextFromAdf: documented-API-gap (partial NIH). Native owner is
//     the official ADF traversal/extraction utilities in @atlaskit/adf-utils
//     (e.g. `traverse`) which know the full node schema (mediaSingle, table,
//     inlineCard, mention, emoji, etc.); this hand-rolled walker only handles
//     text/content/paragraph/hardBreak and silently drops the rest.
//     RECOMMENDATION ONLY (new npm dep, out of scope for comment-only reduction).
//   - tokenize / normalizeText / jaccardSimilarity: Twin-specific logic that is
//     ACCEPTABLE as custom code. These power the lightweight duplicate detector
//     (duplicates.ts). They are NOT an attempt to re-implement Lucene/JQL text
//     search — that belongs to Jira's native JQL engine (see searchIssues in
//     src/jira.ts). If full-text relevance ranking is ever needed, prefer a JQL
//     `text ~ "..."` query over growing this tokenizer into a search engine.

/**
 * Recursively extract plain text from an Atlassian Document Format (ADF) node.
 * Falls back gracefully for strings, arrays, and unexpected shapes.
 */
export function extractPlainTextFromAdf(adf: unknown): string {
  if (adf == null) return "";
  if (typeof adf === "string") return adf;
  if (typeof adf === "number" || typeof adf === "boolean") return String(adf);

  if (Array.isArray(adf)) {
    return adf.map(extractPlainTextFromAdf).filter(Boolean).join(" ");
  }

  if (typeof adf === "object") {
    const node = adf as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof node.text === "string") {
      parts.push(node.text);
    }

    if (Array.isArray(node.content)) {
      parts.push(extractPlainTextFromAdf(node.content));
    }

    // hardBreak / paragraph boundaries add whitespace for readability.
    if (node.type === "hardBreak" || node.type === "paragraph") {
      parts.push("\n");
    }

    return parts.join(" ").replace(/[ \t]+\n/g, "\n").trim();
  }

  return "";
}

/** Lowercase and collapse whitespace for stable comparisons. */
export function normalizeText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[\s ]+/g, " ")
    .trim();
}

/** True if the (normalized) text contains any of the supplied terms. */
export function containsAny(text: string, terms: string[]): boolean {
  const haystack = normalizeText(text);
  return terms.some((t) => haystack.includes(normalizeText(t)));
}

/** Stable de-duplication preserving first-seen order. */
export function uniq<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/** Tokenize into lowercase word tokens, dropping short stopword-like tokens. */
export function tokenize(text: string): string[] {
  const STOP = new Set([
    "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "is",
    "are", "be", "with", "this", "that", "it", "as", "at", "by", "we",
    "our", "from", "not", "but", "can", "will", "should", "would",
  ]);
  return normalizeText(text)
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Jaccard similarity over token sets. Returns a value in [0, 1].
 * Used by the duplicate detector for a lightweight overlap score.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
