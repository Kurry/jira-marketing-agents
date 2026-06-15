import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const { parseCsv, renderSeed } = require("../../scripts/render-seed.cjs") as {
  parseCsv: (text: string) => string[][];
  renderSeed: (config: {
    projectKey: string;
    seedLabel: string;
    seedTemplate: string;
    renderedSeedFile: string;
  }) => { targetPath: string; count: number };
};

describe("portable Jira instance provisioning", () => {
  it("renders seed CSVs for arbitrary Jira project keys and labels", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "aigo-seed-"));
    const source = path.join(dir, "seed.csv");
    const target = path.join(dir, "rendered.csv");

    writeFileSync(
      source,
      [
        '"summary","projectKey","issueType","description","label"',
        '"Example","AIGO","Task","Original project should be replaced","aigo-seed"',
      ].join("\n"),
    );

    const result = renderSeed({
      projectKey: "CUST",
      seedLabel: "customer-seed",
      seedTemplate: source,
      renderedSeedFile: target,
    });

    expect(result.count).toBe(1);
    const rows = parseCsv(readFileSync(target, "utf8"));
    expect(rows[1]).toEqual(["Example", "CUST", "Task", "Original project should be replaced", "customer-seed"]);
  });
});
