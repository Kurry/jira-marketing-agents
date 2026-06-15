import { describe, it, expect } from "vitest";
import { scorePriority, clamp } from "../../src/utils/scoring";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe("clamp", () => {
  it("returns the value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min when below range", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max when above range", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it("returns max when value equals max", () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// scorePriority — P0 signals
// ---------------------------------------------------------------------------

describe("scorePriority — P0 signals", () => {
  const p0Cases = [
    "production outage blocking all signups",
    "signup broken cannot register on mobile",
    "registration is broken for new users",
    "legal blocker preventing launch",
    "compliance blocker requires immediate fix",
    "phi data exposed privacy incident",
    "data breach discovered in prod",
    "broken link on signup page",
    "p0 issue must fix now",
  ];

  for (const text of p0Cases) {
    it(`'${text.slice(0, 40)}...' → P0`, () => {
      const { priority } = scorePriority({ text, labels: [] });
      expect(priority).toBe("P0");
    });
  }

  it("reason mentions the matched P0 signal", () => {
    const { reasons } = scorePriority({ text: "production outage", labels: [] });
    expect(reasons.join(" ").toLowerCase()).toContain("p0");
  });
});

// ---------------------------------------------------------------------------
// scorePriority — P1 signals
// ---------------------------------------------------------------------------

describe("scorePriority — P1 signals", () => {
  const p1Cases = [
    "launch blocker must resolve before go-live",
    "high impact conversion drop this week",
    "claims risk flagged in creative",
    "tracking broken on checkout page",
    "active experiment running needs fix",
    "p1 priority issue",
  ];

  for (const text of p1Cases) {
    it(`'${text.slice(0, 40)}...' → P1`, () => {
      const { priority } = scorePriority({ text, labels: [] });
      expect(priority).toBe("P1");
    });
  }

  it("P1 signal from labels array", () => {
    const { priority } = scorePriority({ text: "some issue", labels: ["launch blocker"] });
    expect(priority).toBe("P1");
  });
});

// ---------------------------------------------------------------------------
// scorePriority — P3 signals
// ---------------------------------------------------------------------------

describe("scorePriority — P3 signals", () => {
  const p3Cases = [
    "research idea for future consideration",
    "backlog item nice to have",
    "someday we could add this feature",
    "exploration spike for next quarter",
  ];

  for (const text of p3Cases) {
    it(`'${text.slice(0, 40)}...' → P3`, () => {
      const { priority } = scorePriority({ text, labels: [] });
      expect(priority).toBe("P3");
    });
  }
});

// ---------------------------------------------------------------------------
// scorePriority — P2 default
// ---------------------------------------------------------------------------

describe("scorePriority — P2 default", () => {
  it("defaults to P2 when no priority signal matches", () => {
    const { priority } = scorePriority({ text: "add a dashboard for channel performance", labels: [] });
    expect(priority).toBe("P2");
  });

  it("P0 takes priority over P3 when both signals are present", () => {
    const { priority } = scorePriority({ text: "production outage research investigation", labels: [] });
    expect(priority).toBe("P0");
  });
});

// ---------------------------------------------------------------------------
// scorePriority — due date proximity escalation
// ---------------------------------------------------------------------------

describe("scorePriority — due date escalation", () => {
  it("escalates to P1 when due date is within 3 days", () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { priority } = scorePriority({ text: "standard dashboard update", labels: [], dueDate: soon });
    expect(priority).toBe("P1");
  });

  it("does not escalate when due date is far in the future", () => {
    const { priority } = scorePriority({ text: "standard dashboard update", labels: [], dueDate: "2030-01-01" });
    expect(priority).toBe("P2");
  });

  it("ignores invalid due date strings", () => {
    const { priority } = scorePriority({ text: "standard update", labels: [], dueDate: "not-a-date" });
    expect(priority).toBe("P2");
  });
});
