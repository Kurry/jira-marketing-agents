import { describe, it, expect } from "vitest";
import { TOOLS, getTool } from "../mcp/tools";
import { contextFromFields, resolveContext } from "../mcp/context";

describe("MCP tool registry", () => {
  it("registers a tool for every growth-ops capability", () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain("classify_growth_issue");
    expect(names).toContain("propose_experiment_spec");
    expect(names).toContain("review_creative_claims_risk");
    expect(names).toContain("create_employer_launch_plan");
    expect(names).toContain("generate_creative_variants");
    expect(names).toContain("add_analysis_comment");
    // 21 issue/list tools + find_similar + weekly_readout + add_comment.
    expect(TOOLS.length).toBeGreaterThanOrEqual(20);
    // Every tool has a name, description, and schema.
    for (const t of TOOLS) {
      expect(t.name).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.inputSchema).toBeTruthy();
    }
  });

  it("runs analysis tools offline from issue fields (Cowork-connector mode)", async () => {
    const triage = getTool("classify_growth_issue")!;
    const result: any = await triage.run(
      {
        summary: "Signup broken — users cannot register on mobile",
        description: "Registration is broken at account creation.",
      },
      null // no Jira client — pure field-input mode
    );
    expect(result.workflowArea).toBe("Signup Funnel");
    expect(["P0", "P1"]).toContain(result.priority);
  });

  it("flags prohibited claims through the claims tool", async () => {
    const claims = getTool("review_creative_claims_risk")!;
    const result: any = await claims.run(
      { description: "Guaranteed reversal of diabetes in 30 days." },
      null
    );
    expect(result.overallClaimsRisk).toBe("Prohibited");
    expect(result.humanReviewRequired).toBe(true);
  });

  it("requires Jira config for search/write tools", async () => {
    await expect(getTool("find_similar_issues")!.run({ summary: "x" }, null)).rejects.toThrow(/requires Jira/);
    await expect(
      getTool("add_analysis_comment")!.run({ issueKey: "AIGO-1", commentBody: "hi" }, null)
    ).rejects.toThrow(/requires Jira/);
  });

  it("prioritizes a backlog without any Jira access", async () => {
    const result: any = await getTool("prioritize_backlog")!.run(
      {
        items: [
          { key: "AIGO-1", summary: "Research future ideas" },
          { key: "AIGO-2", summary: "Production outage on signup" },
        ],
      },
      null
    );
    expect(result[0].key).toBe("AIGO-2");
    expect(result[0].priority).toBe("P0");
  });

  it("contextFromFields builds combinedText and resolveContext throws without input", async () => {
    const ctx = contextFromFields({ summary: "a", description: "b", comments: ["c"] });
    expect(ctx.combinedText).toContain("a");
    expect(ctx.combinedText).toContain("c");
    await expect(resolveContext({}, null)).rejects.toThrow();
  });
});
