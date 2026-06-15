import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

vi.mock("../../src/jira", () => ({
  addComment: vi.fn(),
  getIssueContext: vi.fn(),
  searchIssues: vi.fn(),
}));

import * as handlerExports from "../../src/index";

type ForgeAction = {
  key: string;
  function: string;
  actionVerb: string;
  description?: string;
  inputs?: Record<string, { description?: string; required?: boolean; type?: string }>;
};

type ForgeFunction = {
  key: string;
  handler: string;
};

type RovoAgent = {
  key: string;
  name: string;
  prompt: string;
  actions?: string[];
  conversationStarters?: string[];
};

const repoRoot = path.resolve(__dirname, "../..");
const manifest = parse(readFileSync(path.join(repoRoot, "manifest.yml"), "utf8")) as any;
const agents = manifest.modules["rovo:agent"] as RovoAgent[];
const actions = manifest.modules.action as ForgeAction[];
const functions = manifest.modules.function as ForgeFunction[];

const byKey = <T extends { key: string }>(items: T[]) => new Map(items.map((item) => [item.key, item]));

describe("Forge/Rovo manifest integration contract", () => {
  it("declares the expected Forge runtime, resources, and scopes", () => {
    expect(manifest.app.runtime.name).toMatch(/^nodejs(22|24)\.x$/);
    expect(manifest.permissions.scopes).toEqual(
      expect.arrayContaining(["read:jira-work", "write:jira-work", "read:chat:rovo"]),
    );
    expect(manifest.resources).toContainEqual({ key: "agent-prompts", path: "prompts" });
  });

  it("keeps every Rovo agent prompt resource present on disk", () => {
    expect(agents).toHaveLength(19);

    for (const agent of agents) {
      expect(agent.name).toBeTruthy();
      expect(agent.conversationStarters?.length ?? 0).toBeGreaterThan(0);

      const match = agent.prompt.match(/^resource:agent-prompts;(.+\.md)$/);
      expect(match, `${agent.key} prompt should use the shared prompt resource`).not.toBeNull();

      const promptPath = path.join(repoRoot, "prompts", match![1]);
      expect(existsSync(promptPath), `${agent.key} prompt missing: ${promptPath}`).toBe(true);
      expect(readFileSync(promptPath, "utf8").trim().length).toBeGreaterThan(80);
    }
  });

  it("keeps agent action references, action modules, and exported handlers aligned", () => {
    const actionsByKey = byKey(actions);
    const functionsByKey = byKey(functions);

    expect(actions).toHaveLength(22);
    expect(new Set(actions.map((action) => action.key)).size).toBe(actions.length);
    expect(new Set(functions.map((fn) => fn.key)).size).toBe(functions.length);
    expect(functions.every((fn) => fn.key.length <= 23)).toBe(true);

    const actionKeys = new Set(actions.map((action) => action.key));
    for (const fn of functions) {
      expect(actionKeys.has(fn.key), `${fn.key} must not duplicate an action key`).toBe(false);
    }

    for (const agent of agents) {
      for (const actionKey of agent.actions ?? []) {
        expect(actionsByKey.has(actionKey), `${agent.key} references missing action ${actionKey}`).toBe(true);
      }
    }

    for (const action of actions) {
      const fn = functionsByKey.get(action.function);
      expect(fn, `${action.key} references missing function module ${action.function}`).toBeTruthy();
      expect(fn!.handler.startsWith("index.")).toBe(true);

      for (const input of Object.values(action.inputs ?? {})) {
        expect(input.description).toBeTruthy();
      }

      const exportName = fn!.handler.replace("index.", "");
      expect(typeof (handlerExports as Record<string, unknown>)[exportName]).toBe("function");
    }
  });

  it("keeps Rovo agents read-style and exposes only the explicit comment mutation", () => {
    const mutatingActions = actions.filter((action) => action.actionVerb !== "GET");
    expect(mutatingActions.map((action) => action.key)).toEqual(["addAnalysisComment"]);

    const addComment = mutatingActions[0];
    expect(addComment.actionVerb).toBe("UPDATE");
    expect(addComment.description).toMatch(/only mutating action/i);
    expect(Object.keys(addComment.inputs ?? {}).sort()).toEqual(["commentBody", "issueKey"]);
    expect(addComment.inputs?.issueKey.required).toBe(true);
    expect(addComment.inputs?.commentBody.required).toBe(true);

    for (const agent of agents) {
      expect(agent.actions ?? [], `${agent.key} must not call mutating action directly`).not.toContain(
        "addAnalysisComment",
      );
    }
  });

  it("standalone Forge functions map to exported handlers in src/index.ts", () => {
    // Actions' backing functions are already checked above. This test covers
    // functions that are NOT backing a Rovo action (e.g. fn-import-automation).
    const actionFnKeys = new Set(actions.map((action) => action.function));
    const standaloneFns = functions.filter((fn) => !actionFnKeys.has(fn.key));

    for (const fn of standaloneFns) {
      expect(fn.handler.startsWith("index."), `${fn.key} handler must be index.<name>`).toBe(true);
      const exportName = fn.handler.replace("index.", "");
      expect(
        typeof (handlerExports as Record<string, unknown>)[exportName],
        `${fn.key} handler '${exportName}' not exported from src/index.ts`,
      ).toBe("function");
    }
  });
});
