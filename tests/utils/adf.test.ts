import { describe, it, expect } from "vitest";
import { toAdf } from "../../src/utils/adf";

// ---------------------------------------------------------------------------
// toAdf — basic structure
// ---------------------------------------------------------------------------

describe("toAdf — document structure", () => {
  it("returns a valid ADF doc with type, version, and content", () => {
    const doc = toAdf("hello");
    expect(doc.type).toBe("doc");
    expect(doc.version).toBe(1);
    expect(Array.isArray(doc.content)).toBe(true);
  });

  it("produces a single paragraph for a plain string", () => {
    const doc = toAdf("hello world") as { content: Array<{ type: string }> };
    expect(doc.content.length).toBe(1);
    expect(doc.content[0].type).toBe("paragraph");
  });

  it("falls back to an empty paragraph for an empty string", () => {
    const doc = toAdf("") as { content: Array<{ type: string }> };
    expect(doc.content.length).toBe(1);
    expect(doc.content[0].type).toBe("paragraph");
  });

  it("handles null/undefined via nullish coalescing", () => {
    // toAdf coerces null with ?? ""
    const doc = toAdf(null as unknown as string) as { content: unknown[] };
    expect(doc.type).toBe("doc");
    expect(doc.content.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// toAdf — paragraphs
// ---------------------------------------------------------------------------

describe("toAdf — paragraphs", () => {
  it("wraps each non-blank, non-list, non-heading line as a paragraph", () => {
    const doc = toAdf("line one\nline two") as {
      content: Array<{ type: string; content: Array<{ text: string }> }>;
    };
    expect(doc.content.length).toBe(2);
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content[0].text).toBe("line one");
    expect(doc.content[1].content[0].text).toBe("line two");
  });

  it("skips blank lines (does not add empty nodes between paragraphs)", () => {
    const doc = toAdf("first\n\nsecond") as {
      content: Array<{ type: string }>;
    };
    expect(doc.content.length).toBe(2);
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[1].type).toBe("paragraph");
  });

  it("trims trailing whitespace from each line", () => {
    const doc = toAdf("hello   ") as {
      content: Array<{ content: Array<{ text: string }> }>;
    };
    expect(doc.content[0].content[0].text).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// toAdf — headings
// ---------------------------------------------------------------------------

describe("toAdf — headings", () => {
  it("converts # to a level-1 heading", () => {
    const doc = toAdf("# Title") as {
      content: Array<{ type: string; attrs: { level: number }; content: Array<{ text: string }> }>;
    };
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content[0].attrs.level).toBe(1);
    expect(doc.content[0].content[0].text).toBe("Title");
  });

  it("converts ## to a level-2 heading", () => {
    const doc = toAdf("## Section") as {
      content: Array<{ attrs: { level: number } }>;
    };
    expect(doc.content[0].attrs.level).toBe(2);
  });

  it("converts ### to a level-3 heading", () => {
    const doc = toAdf("### Sub") as {
      content: Array<{ attrs: { level: number } }>;
    };
    expect(doc.content[0].attrs.level).toBe(3);
  });

  it("treats 6 hashes as a level-6 heading (maximum recognised)", () => {
    const doc = toAdf("###### Deep") as {
      content: Array<{ type: string; attrs: { level: number } }>;
    };
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content[0].attrs.level).toBe(6);
  });

  it("emits 7+ hashes as a plain paragraph (beyond regex range)", () => {
    const doc = toAdf("####### TooDeep") as {
      content: Array<{ type: string }>;
    };
    expect(doc.content[0].type).toBe("paragraph");
  });
});

// ---------------------------------------------------------------------------
// toAdf — bullet lists
// ---------------------------------------------------------------------------

describe("toAdf — bullet lists", () => {
  it("groups consecutive - items into a bulletList node", () => {
    const doc = toAdf("- alpha\n- beta\n- gamma") as {
      content: Array<{ type: string; content: unknown[] }>;
    };
    expect(doc.content.length).toBe(1);
    expect(doc.content[0].type).toBe("bulletList");
    expect(doc.content[0].content.length).toBe(3);
  });

  it("also accepts * as a bullet marker", () => {
    const doc = toAdf("* item one\n* item two") as {
      content: Array<{ type: string; content: unknown[] }>;
    };
    expect(doc.content[0].type).toBe("bulletList");
    expect(doc.content[0].content.length).toBe(2);
  });

  it("flushes the bullet list when a non-bullet line is encountered", () => {
    const doc = toAdf("intro\n- item\n- item 2\nparagraph after") as {
      content: Array<{ type: string }>;
    };
    // intro paragraph, bulletList, paragraph after
    expect(doc.content.length).toBe(3);
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[1].type).toBe("bulletList");
    expect(doc.content[2].type).toBe("paragraph");
  });

  it("flushes a trailing bullet list at end of input", () => {
    const doc = toAdf("lead\n- last item") as {
      content: Array<{ type: string }>;
    };
    expect(doc.content[1].type).toBe("bulletList");
  });

  it("each listItem wraps text in a paragraph content node", () => {
    const doc = toAdf("- hello") as {
      content: Array<{
        content: Array<{
          type: string;
          content: Array<{ type: string; content: Array<{ text: string }> }>;
        }>;
      }>;
    };
    const listItem = doc.content[0].content[0];
    expect(listItem.type).toBe("listItem");
    expect(listItem.content[0].content[0].text).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// toAdf — mixed content
// ---------------------------------------------------------------------------

describe("toAdf — mixed markdown", () => {
  it("handles heading + bullets + paragraph in sequence", () => {
    const md = "# Overview\n- point one\n- point two\nConclusion text";
    const doc = toAdf(md) as { content: Array<{ type: string }> };
    expect(doc.content[0].type).toBe("heading");
    expect(doc.content[1].type).toBe("bulletList");
    expect(doc.content[2].type).toBe("paragraph");
  });

  it("handles Windows-style CRLF line endings", () => {
    const doc = toAdf("line one\r\nline two") as {
      content: Array<{ type: string }>;
    };
    expect(doc.content.length).toBe(2);
    expect(doc.content[0].type).toBe("paragraph");
  });
});
