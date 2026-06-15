import { addComment } from "./jira";
import { AddCommentPayload } from "./types";

// A short marker prepended to AI-generated comments so humans can tell the
// difference between agent output and human comments.
const AI_MARKER = "🤖 AI Growth Ops (analysis only — no actions were taken)";

/**
 * The ONLY mutating operation in the MVP. Adds an analysis comment to an issue.
 * It never changes fields, transitions, audiences, suppression, or claims state.
 */
export async function addAnalysisComment(payload: AddCommentPayload): Promise<{ id: string }> {
  if (!payload?.issueKey) throw new Error("issueKey is required");
  if (!payload?.commentBody || !payload.commentBody.trim()) {
    throw new Error("commentBody is required");
  }

  const body = `${AI_MARKER}\n\n${payload.commentBody}`;
  return addComment(payload.issueKey, body);
}

// NIH-CLASSIFICATION (T-NIH-07): Twin-specific logic (acceptable).
//   addAnalysisComment + the AI_MARKER are the intentionally-custom safety
//   surface called out in CLAUDE.md ("the ONLY mutating action") and
//   specs/atlassian-native-tools.md "What Should Stay Custom" — keep custom.
//   renderMarkdownFromResult/humanizeKey/stringifyValue below are a generic
//   object->Markdown serializer; this is NOT an Atlassian-native capability
//   (Jira has no "render object to comment" API), so it is not NIH. The
//   Markdown it produces is later turned into ADF by src/utils/adf.ts — see the
//   ADF NIH note there for the official-builder recommendation.
/** Render a generic structured object into a readable Markdown comment. */
export function renderMarkdownFromResult(title: string, result: Record<string, unknown>): string {
  const lines: string[] = [`# ${title}`, ""];

  for (const [key, value] of Object.entries(result)) {
    const label = humanizeKey(key);
    if (Array.isArray(value)) {
      lines.push(`## ${label}`);
      if (value.length === 0) {
        lines.push("- (none)");
      } else {
        for (const v of value) {
          lines.push(`- ${stringifyValue(v)}`);
        }
      }
      lines.push("");
    } else if (value && typeof value === "object") {
      lines.push(`## ${label}`);
      lines.push(stringifyValue(value));
      lines.push("");
    } else {
      lines.push(`**${label}:** ${stringifyValue(value)}`);
    }
  }

  return lines.join("\n");
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function stringifyValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${humanizeKey(k)}: ${stringifyValue(v)}`)
      .join("; ");
  }
  return String(value);
}
