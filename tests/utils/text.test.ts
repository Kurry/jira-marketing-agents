import { describe, it, expect } from "vitest";
import {
  extractPlainTextFromAdf,
  normalizeText,
  containsAny,
  uniq,
  tokenize,
  jaccardSimilarity,
} from "../../src/utils/text";

// ---------------------------------------------------------------------------
// extractPlainTextFromAdf
// ---------------------------------------------------------------------------

describe("extractPlainTextFromAdf", () => {
  it("returns empty string for null/undefined", () => {
    expect(extractPlainTextFromAdf(null)).toBe("");
    expect(extractPlainTextFromAdf(undefined)).toBe("");
  });

  it("returns a plain string as-is", () => {
    expect(extractPlainTextFromAdf("hello")).toBe("hello");
  });

  it("converts numbers and booleans to strings", () => {
    expect(extractPlainTextFromAdf(42)).toBe("42");
    expect(extractPlainTextFromAdf(true)).toBe("true");
  });

  it("joins array elements with spaces", () => {
    const result = extractPlainTextFromAdf(["foo", "bar"]);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
  });

  it("extracts text from an ADF text node", () => {
    const node = { type: "text", text: "Hello World" };
    expect(extractPlainTextFromAdf(node)).toContain("Hello World");
  });

  it("recursively extracts text from nested content", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First paragraph" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second paragraph" }] },
      ],
    };
    const result = extractPlainTextFromAdf(doc);
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });

  it("adds newline for paragraph and hardBreak node types", () => {
    const doc = {
      type: "paragraph",
      content: [{ type: "text", text: "Line" }],
    };
    const result = extractPlainTextFromAdf(doc);
    expect(result).toContain("Line");
  });
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------

describe("normalizeText", () => {
  it("lowercases input", () => {
    expect(normalizeText("HELLO World")).toBe("hello world");
  });

  it("collapses multiple spaces to one", () => {
    expect(normalizeText("a   b  c")).toBe("a b c");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("handles null/undefined gracefully", () => {
    expect(normalizeText(null as unknown as string)).toBe("");
    expect(normalizeText(undefined as unknown as string)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// containsAny
// ---------------------------------------------------------------------------

describe("containsAny", () => {
  it("returns true when any term matches", () => {
    expect(containsAny("signup page broken", ["signup", "registration"])).toBe(true);
  });

  it("returns false when no term matches", () => {
    expect(containsAny("dashboard report", ["signup", "experiment"])).toBe(false);
  });

  it("matching is case-insensitive", () => {
    expect(containsAny("SIGNUP broken", ["signup"])).toBe(true);
  });

  it("returns false for empty terms array", () => {
    expect(containsAny("something", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// uniq
// ---------------------------------------------------------------------------

describe("uniq", () => {
  it("removes duplicates preserving first-seen order", () => {
    expect(uniq(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(uniq([])).toEqual([]);
  });

  it("returns single-element array unchanged", () => {
    expect(uniq(["x"])).toEqual(["x"]);
  });

  it("works with numbers", () => {
    expect(uniq([1, 2, 1, 3])).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe("tokenize", () => {
  it("splits text into lowercase tokens", () => {
    const tokens = tokenize("Signup Form Error");
    expect(tokens).toContain("signup");
    expect(tokens).toContain("form");
    expect(tokens).toContain("error");
  });

  it("filters out stopwords", () => {
    const tokens = tokenize("the and or");
    expect(tokens).toEqual([]);
  });

  it("filters out tokens shorter than 3 characters", () => {
    const tokens = tokenize("ok hi go");
    expect(tokens).toEqual([]);
  });

  it("strips punctuation", () => {
    const tokens = tokenize("broken! signup, form.");
    expect(tokens).toContain("broken");
    expect(tokens).toContain("signup");
    expect(tokens).toContain("form");
  });

  it("returns empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// jaccardSimilarity
// ---------------------------------------------------------------------------

describe("jaccardSimilarity", () => {
  it("returns 1.0 for identical strings", () => {
    expect(jaccardSimilarity("signup page broken", "signup page broken")).toBe(1);
  });

  it("returns 0 for completely unrelated strings", () => {
    const score = jaccardSimilarity("revenue analytics dashboard", "employer eligibility file");
    expect(score).toBe(0);
  });

  it("returns 0 for two empty strings", () => {
    expect(jaccardSimilarity("", "")).toBe(0);
  });

  it("returns a value between 0 and 1 for partial overlap", () => {
    const score = jaccardSimilarity("signup page broken", "signup form error");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("score is symmetric (a,b) === (b,a)", () => {
    const a = "mobile signup issue";
    const b = "signup broken on mobile safari";
    expect(jaccardSimilarity(a, b)).toBeCloseTo(jaccardSimilarity(b, a), 10);
  });

  it("higher overlap yields higher score", () => {
    const base = "signup broken on mobile safari registration form";
    const close = "signup page broken on mobile safari";
    const far = "quarterly revenue dashboard analytics";
    expect(jaccardSimilarity(base, close)).toBeGreaterThan(jaccardSimilarity(base, far));
  });
});
