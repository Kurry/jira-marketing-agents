import { describe, it, expect, vi, beforeEach } from "vitest";
import { addAnalysisComment, renderMarkdownFromResult } from "../src/comments";

// ---------------------------------------------------------------------------
// Mock the Jira addComment dependency so addAnalysisComment is testable without
// a live Forge runtime.
// ---------------------------------------------------------------------------
vi.mock("../src/jira", () => ({
  addComment: vi.fn(),
}));

import { addComment } from "../src/jira";
const mockAddComment = addComment as ReturnType<typeof vi.fn>;

const AI_MARKER = "🤖 AI Growth Ops (analysis only — no actions were taken)";

// ---------------------------------------------------------------------------
// addAnalysisComment
// ---------------------------------------------------------------------------
describe("addAnalysisComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if issueKey is missing", async () => {
    // @ts-expect-error intentional bad input
    await expect(addAnalysisComment({ commentBody: "text" })).rejects.toThrow("issueKey is required");
  });

  it("throws if payload is nullish", async () => {
    // @ts-expect-error intentional bad input
    await expect(addAnalysisComment(null)).rejects.toThrow("issueKey is required");
  });

  it("throws if commentBody is empty", async () => {
    await expect(
      addAnalysisComment({ issueKey: "AIGO-1", commentBody: "" }),
    ).rejects.toThrow("commentBody is required");
  });

  it("throws if commentBody is only whitespace", async () => {
    await expect(
      addAnalysisComment({ issueKey: "AIGO-1", commentBody: "   " }),
    ).rejects.toThrow("commentBody is required");
  });

  it("prepends the AI marker before calling addComment", async () => {
    mockAddComment.mockResolvedValueOnce({ id: "123" });
    await addAnalysisComment({ issueKey: "AIGO-5", commentBody: "Analysis complete." });

    expect(mockAddComment).toHaveBeenCalledOnce();
    const [issueKey, body] = mockAddComment.mock.calls[0] as [string, string];
    expect(issueKey).toBe("AIGO-5");
    expect(body.startsWith(AI_MARKER)).toBe(true);
    expect(body).toContain("Analysis complete.");
  });

  it("separates the AI marker from the body with two newlines", async () => {
    mockAddComment.mockResolvedValueOnce({ id: "42" });
    await addAnalysisComment({ issueKey: "AIGO-7", commentBody: "Body text here." });

    const [, body] = mockAddComment.mock.calls[0] as [string, string];
    expect(body).toBe(`${AI_MARKER}\n\nBody text here.`);
  });

  it("returns the id returned by addComment", async () => {
    mockAddComment.mockResolvedValueOnce({ id: "99" });
    const result = await addAnalysisComment({ issueKey: "AIGO-10", commentBody: "Test." });
    expect(result).toEqual({ id: "99" });
  });

  it("propagates errors thrown by addComment", async () => {
    mockAddComment.mockRejectedValueOnce(new Error("Jira API failed: 403"));
    await expect(
      addAnalysisComment({ issueKey: "AIGO-11", commentBody: "Test." }),
    ).rejects.toThrow("Jira API failed: 403");
  });

  it("passes the exact issueKey to addComment unchanged", async () => {
    mockAddComment.mockResolvedValueOnce({ id: "1" });
    await addAnalysisComment({ issueKey: "PROJ-999", commentBody: "note" });
    expect(mockAddComment.mock.calls[0][0]).toBe("PROJ-999");
  });
});

// ---------------------------------------------------------------------------
// renderMarkdownFromResult
// ---------------------------------------------------------------------------
describe("renderMarkdownFromResult", () => {
  it("renders scalars as bold key-value pairs", () => {
    const md = renderMarkdownFromResult("Triage", { priority: "P1" });
    expect(md).toContain("# Triage");
    expect(md).toContain("**Priority:** P1");
  });

  it("renders arrays as bullet lists under a heading", () => {
    const md = renderMarkdownFromResult("Risks", { items: ["a", "b", "c"] });
    expect(md).toContain("## Items");
    expect(md).toContain("- a");
    expect(md).toContain("- b");
    expect(md).toContain("- c");
  });

  it("renders an empty array as '- (none)'", () => {
    const md = renderMarkdownFromResult("Result", { gaps: [] });
    expect(md).toContain("- (none)");
  });

  it("renders null / undefined values as em-dash", () => {
    const md = renderMarkdownFromResult("Result", { reason: null });
    expect(md).toContain("—");
  });

  it("renders boolean values as string", () => {
    const md = renderMarkdownFromResult("Result", { ready: true, blocked: false });
    expect(md).toContain("**Ready:** true");
    expect(md).toContain("**Blocked:** false");
  });

  it("renders number values as string", () => {
    const md = renderMarkdownFromResult("Score", { score: 42 });
    expect(md).toContain("**Score:** 42");
  });

  it("renders nested objects under their heading", () => {
    const md = renderMarkdownFromResult("Launch", {
      details: { owner: "Alice", channel: "Email" },
    });
    expect(md).toContain("## Details");
    expect(md).toContain("Owner: Alice");
    expect(md).toContain("Channel: Email");
  });

  it("humanizes camelCase keys into Title Case with spaces", () => {
    const md = renderMarkdownFromResult("Report", { riskLevel: "High" });
    expect(md).toContain("**Risk Level:** High");
  });

  it("renders an array of objects by stringifying each entry", () => {
    const md = renderMarkdownFromResult("Stories", {
      stories: [
        { title: "Story A", owner: "Alice" },
        { title: "Story B", owner: "Bob" },
      ],
    });
    expect(md).toContain("## Stories");
    expect(md).toContain("Title: Story A");
    expect(md).toContain("Title: Story B");
  });

  it("always starts with a level-1 heading matching the title", () => {
    const md = renderMarkdownFromResult("My Report", {});
    expect(md.startsWith("# My Report")).toBe(true);
  });

  it("handles a result with many field types without throwing", () => {
    expect(() =>
      renderMarkdownFromResult("Mixed", {
        text: "hello",
        num: 7,
        flag: false,
        list: ["x"],
        obj: { k: "v" },
        empty: [],
        nil: null,
      }),
    ).not.toThrow();
  });
});
