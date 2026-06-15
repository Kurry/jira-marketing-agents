// Minimal Markdown -> Atlassian Document Format (ADF) conversion.
//
// This is intentionally small: it supports paragraphs, blank-line separation,
// bullet lists ("- " / "* ") and headings ("# ".."### "). Anything else is
// emitted as a plain paragraph. ADF is required for the Jira comment API.
//
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (partial NIH).
//   Native owner: the official ADF builder/utilities (@atlaskit/adf-utils
//   `doc`/`p`/`h`/`ul`/`li` builders, or a Markdown->ADF transformer such as
//   @atlaskit/editor-markdown-transformer). @forge/api 7.2.2 ships requestJira
//   but NO ADF helper, so some local construction is a real platform gap.
//   However, the hand-rolled node factories (textNode/paragraph/heading/
//   bulletList) and the regex Markdown parser below re-implement the official
//   ADF node schema and a Markdown reader by hand — that part is NIH. Per
//   CLAUDE.md "src/comments.ts and ADF rendering ... is meant to stay custom"
//   the AI-labeled rendering intent is legitimate, but the node-shape +
//   Markdown-parse mechanics should adopt @atlaskit/adf-utils builders to stay
//   schema-correct. RECOMMENDATION ONLY: adding @atlaskit/adf-utils is a new
//   npm dependency and is out of scope for a comment-only reduction.

type AdfNode = Record<string, unknown>;

function textNode(text: string): AdfNode {
  return { type: "text", text };
}

function paragraph(text: string): AdfNode {
  return {
    type: "paragraph",
    content: text.length ? [textNode(text)] : [],
  };
}

function heading(text: string, level: number): AdfNode {
  return {
    type: "heading",
    attrs: { level },
    content: [textNode(text)],
  };
}

function bulletList(items: string[]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

/**
 * Convert a Markdown-ish string into an ADF document.
 * Always returns a valid ADF doc (version 1).
 */
export function toAdf(markdown: string): AdfNode {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const content: AdfNode[] = [];

  let pendingBullets: string[] = [];
  const flushBullets = () => {
    if (pendingBullets.length) {
      content.push(bulletList(pendingBullets));
      pendingBullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      pendingBullets.push(bulletMatch[1]);
      continue;
    }

    flushBullets();

    if (line.trim() === "") {
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      content.push(heading(headingMatch[2], Math.min(headingMatch[1].length, 6)));
      continue;
    }

    content.push(paragraph(line));
  }

  flushBullets();

  if (content.length === 0) {
    content.push(paragraph(""));
  }

  return {
    type: "doc",
    version: 1,
    content,
  };
}
