import { describe, it, expect } from "vitest";
import { toAdf } from "../src/utils/adf";
import { renderMarkdownFromResult } from "../src/comments";

describe("toAdf", () => {
  it("produces a valid ADF doc with paragraphs, headings, and bullets", () => {
    const doc: any = toAdf("# Title\n\nSome text\n\n- one\n- two");
    expect(doc.type).toBe("doc");
    expect(doc.version).toBe(1);
    const types = doc.content.map((n: any) => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
  });

  it("never returns an empty content array", () => {
    const doc: any = toAdf("");
    expect(Array.isArray(doc.content)).toBe(true);
    expect(doc.content.length).toBeGreaterThan(0);
  });
});

describe("renderMarkdownFromResult", () => {
  it("renders arrays as bullet lists and scalars as bold labels", () => {
    const md = renderMarkdownFromResult("Triage", {
      priority: "P1",
      risks: ["a", "b"],
      empty: [],
    });
    expect(md).toContain("# Triage");
    expect(md).toContain("**Priority:** P1");
    expect(md).toContain("- a");
    expect(md).toContain("- (none)");
  });
});
