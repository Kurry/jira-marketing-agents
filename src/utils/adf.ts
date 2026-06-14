// Minimal Markdown -> Atlassian Document Format (ADF) conversion.
//
// This is intentionally small: it supports paragraphs, blank-line separation,
// bullet lists ("- " / "* ") and headings ("# ".."### "). Anything else is
// emitted as a plain paragraph. ADF is required for the Jira comment API.

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
