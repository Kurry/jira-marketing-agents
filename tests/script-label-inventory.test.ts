import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const LABELS = new Set(["native wrapper", "documented API gap", "Twin-specific logic"]);

function listScriptFiles(dir: string): string[] {
  const entries = readdirSync(dir).sort();
  const files: string[] = [];
  for (const entry of entries) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      files.push(...listScriptFiles(abs));
    } else if (/\.(cjs|mjs|sh)$/.test(entry)) {
      files.push(relative(REPO_ROOT, abs));
    }
  }
  return files.sort();
}

function parseInventory(): Map<string, string> {
  const text = readFileSync(join(REPO_ROOT, "docs", "script-label-inventory.md"), "utf8");
  const rows = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line.match(/^\| `(scripts\/[^`]+)` \| `([^`]+)` \|/);
    if (!match) continue;
    const [, script, label] = match;
    rows.set(script, label);
  }
  return rows;
}

describe("custom script label inventory", () => {
  it("covers every scripts/ entrypoint with exactly one allowed label", () => {
    const actual = listScriptFiles(join(REPO_ROOT, "scripts"));
    const inventory = parseInventory();
    const documented = [...inventory.keys()].sort();

    expect(documented).toEqual(actual);
    for (const [script, label] of inventory) {
      expect(LABELS.has(label), `${script}: ${label}`).toBe(true);
    }
  });
});
