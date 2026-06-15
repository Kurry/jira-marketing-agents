/**
 * tests/automation/rules.test.ts
 *
 * Contract tests for the AIGO Jira Automation rule templates.
 * Covers VM-AUTOMATION-RENDER, VM-AUTOMATION-IMPORT, VM-AUTOMATION-VALIDATE.
 *
 * Tests run against:
 *   - Raw templates:   automation/rules/*.json (excluding the bundle)
 *   - Rendered output: automation/rules/rendered/*.json
 *   - Manifest:        manifest.yml
 *   - Example config:  instances/aigo.example.json
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..", "..");

function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts);
}

/** Read and parse a JSON file */
function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/** Extract all rovo:agent keys from manifest.yml using regex (no YAML dep needed) */
function loadManifestAgentKeys(): Set<string> {
  const text = fs.readFileSync(repoPath("manifest.yml"), "utf8");
  const keys = new Set<string>();
  const keyRegex = /^\s+-\s+key:\s+(\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(text)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

/** Collect rule template files (excluding the bundle and README) */
function getRuleTemplateFiles(): string[] {
  const rulesDir = repoPath("automation", "rules");
  const EXCLUDED = new Set(["aigo-automation-ruleset.json", "README.md"]);
  return fs
    .readdirSync(rulesDir)
    .filter((f) => f.endsWith(".json") && !EXCLUDED.has(f))
    .sort()
    .map((f) => path.join(rulesDir, f));
}

/** Collect rendered rule files */
function getRenderedRuleFiles(): string[] {
  const renderedDir = repoPath("automation", "rules", "rendered");
  if (!fs.existsSync(renderedDir)) return [];
  return fs
    .readdirSync(renderedDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(renderedDir, f));
}

/**
 * Recursively scan a value for any string matching a pattern.
 * Returns all matching strings found.
 */
function findStringMatches(value: unknown, pattern: RegExp): string[] {
  const found: string[] = [];
  function recurse(v: unknown) {
    if (typeof v === "string") {
      const matches = [...v.matchAll(new RegExp(pattern.source, pattern.flags))];
      found.push(...matches.map((m) => m[0]));
    } else if (Array.isArray(v)) {
      v.forEach(recurse);
    } else if (v !== null && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(recurse);
    }
  }
  recurse(value);
  return found;
}

/**
 * Recursively scan for any object that has a key matching keyPattern and whose
 * value (when stringified) matches valuePattern.
 */
function findFieldValues(
  value: unknown,
  keyPattern: RegExp,
  valuePattern: RegExp,
): string[] {
  const found: string[] = [];
  function recurse(v: unknown) {
    if (Array.isArray(v)) {
      v.forEach(recurse);
    } else if (v !== null && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      for (const [k, val] of Object.entries(obj)) {
        if (keyPattern.test(k) && typeof val === "string" && valuePattern.test(val)) {
          found.push(`${k}=${val}`);
        }
        recurse(val);
      }
    }
  }
  recurse(value);
  return found;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let templateFiles: string[] = [];
let renderedFiles: string[] = [];
let manifestKeys: Set<string>;
let exampleConfig: Record<string, unknown>;

// Known agent key placeholders and their expected manifest keys
const AGENT_KEY_MAP: Record<string, string> = {
  __TRIAGE_AGENT_KEY__: "growth-triage-agent",
  __CREATIVE_CLAIMS_AGENT_KEY__: "creative-claims-agent",
  __EXPERIMENT_DESIGN_AGENT_KEY__: "experiment-design-agent",
  __EMPLOYER_LAUNCH_AGENT_KEY__: "employer-launch-agent",
  __WEEKLY_READOUT_AGENT_KEY__: "weekly-readout-agent",
};

beforeAll(() => {
  templateFiles = getRuleTemplateFiles();
  renderedFiles = getRenderedRuleFiles();
  manifestKeys = loadManifestAgentKeys();
  exampleConfig = readJson(repoPath("instances", "aigo.example.json")) as Record<
    string,
    unknown
  >;
});

// ---------------------------------------------------------------------------
// Suite 1: Template structural invariants
// ---------------------------------------------------------------------------

describe("automation rule templates — structural invariants", () => {
  it("finds exactly 5 rule template files", () => {
    expect(templateFiles).toHaveLength(5);
  });

  it("each template is valid JSON", () => {
    for (const filePath of templateFiles) {
      expect(() => readJson(filePath), `${path.basename(filePath)} must be valid JSON`).not.toThrow();
    }
  });

  it("each template has a top-level 'version' field", () => {
    for (const filePath of templateFiles) {
      const rule = readJson(filePath) as Record<string, unknown>;
      expect(rule, path.basename(filePath)).toHaveProperty("version");
    }
  });

  it("each template has a 'rules' array with at least one entry", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath) as { rules?: unknown[] };
      expect(Array.isArray(ruleset.rules), `${path.basename(filePath)} rules array`).toBe(true);
      expect((ruleset.rules as unknown[]).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Safety — no APPROVE action
// ---------------------------------------------------------------------------

describe("automation rule templates — safety: no approve step", () => {
  it("no template has a step with type APPROVE", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath);
      const matches = findFieldValues(ruleset, /^type$/i, /^APPROVE$/i);
      expect(
        matches,
        `${path.basename(filePath)} must not contain type=APPROVE`,
      ).toHaveLength(0);
    }
  });

  it("no template has a step with action 'approve'", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath);
      const matches = findFieldValues(ruleset, /^action$/i, /^approve$/i);
      expect(
        matches,
        `${path.basename(filePath)} must not contain action=approve`,
      ).toHaveLength(0);
    }
  });

  it("creative-claims template prompt says 'Never approve claims'", () => {
    const claimsPath = templateFiles.find((f) => f.includes("creative-claims"));
    expect(claimsPath, "creative-claims.json not found").toBeTruthy();
    const ruleset = readJson(claimsPath!);
    const prompts = findFieldValues(ruleset, /^prompt$/, /never approve claims/i);
    expect(prompts.length, "creative-claims rule must contain 'Never approve claims' in its prompt").toBeGreaterThan(0);
  });

  it("creative-claims comment body explicitly says 'not an approval'", () => {
    const claimsPath = templateFiles.find((f) => f.includes("creative-claims"));
    expect(claimsPath).toBeTruthy();
    const ruleset = readJson(claimsPath!);
    const bodies = findFieldValues(ruleset, /^body$/, /not an approval/i);
    expect(bodies.length, "creative-claims comment body must say 'not an approval'").toBeGreaterThan(0);
  });

  it("no template has a step that transitions to an 'Approved' status", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath);
      const matches = findFieldValues(ruleset, /^status$/, /^approved$/i);
      expect(
        matches,
        `${path.basename(filePath)} must not transition to 'Approved' status`,
      ).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Safety — no campaign launch / audience mutation
// ---------------------------------------------------------------------------

describe("automation rule templates — safety: no launch or audience mutation", () => {
  it("no template has an action type that sends messages", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath);
      const dangerousTypes = findFieldValues(ruleset, /^type$/, /send|deploy|publish|broadcast/i);
      expect(
        dangerousTypes,
        `${path.basename(filePath)} must not contain send/deploy/publish/broadcast action types`,
      ).toHaveLength(0);
    }
  });

  it("every rule's 'state' is DISABLED", () => {
    for (const filePath of templateFiles) {
      const ruleset = readJson(filePath) as { rules: Array<{ state?: string; name?: string }> };
      for (const rule of ruleset.rules) {
        expect(
          rule.state,
          `Rule '${rule.name}' in ${path.basename(filePath)} must be DISABLED`,
        ).toBe("DISABLED");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 4: Agent key validation against manifest
// ---------------------------------------------------------------------------

describe("automation rule templates — agent key validation", () => {
  it("each known agent key placeholder maps to a key present in manifest.yml", () => {
    for (const [placeholder, manifestKey] of Object.entries(AGENT_KEY_MAP)) {
      expect(
        manifestKeys.has(manifestKey),
        `manifest.yml must contain agent key '${manifestKey}' (mapped from ${placeholder})`,
      ).toBe(true);
    }
  });

  it("every __*_AGENT_KEY__ placeholder used in templates maps to a known manifest key", () => {
    for (const filePath of templateFiles) {
      const raw = fs.readFileSync(filePath, "utf8");
      const agentKeyRefs = [...raw.matchAll(/__[A-Z_]+_AGENT_KEY__/g)].map((m) => m[0]);
      for (const placeholder of agentKeyRefs) {
        const manifestKey = AGENT_KEY_MAP[placeholder];
        expect(
          manifestKey,
          `${path.basename(filePath)}: unknown agent key placeholder '${placeholder}'`,
        ).toBeTruthy();
        expect(
          manifestKeys.has(manifestKey),
          `${path.basename(filePath)}: agent key '${manifestKey}' not found in manifest.yml`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Rendered output — no remaining __...__ tokens (non-sentinel)
// ---------------------------------------------------------------------------

describe("rendered rules — no unresolved placeholders", () => {
  it("rendered directory exists after running render:automation", () => {
    const renderedDir = repoPath("automation", "rules", "rendered");
    expect(fs.existsSync(renderedDir), "automation/rules/rendered/ must exist").toBe(true);
  });

  it("finds rendered files for each template", () => {
    // Skip if rendered dir doesn't exist yet
    if (renderedFiles.length === 0) return;
    expect(renderedFiles.length).toBe(templateFiles.length);
  });

  it("no rendered file contains unexpected __...__ tokens", () => {
    // Sentinels for known-missing example-config fields are allowed
    const ALLOWED_SENTINELS = new Set(["__MISSING_PROJECT_ID__", "__MISSING_ACTOR_ACCOUNT_ID__"]);

    for (const filePath of renderedFiles) {
      const text = fs.readFileSync(filePath, "utf8");
      const remaining = [...text.matchAll(/__[A-Z][A-Z0-9_]*__/g)]
        .map((m) => m[0])
        .filter((t) => !ALLOWED_SENTINELS.has(t));

      expect(
        remaining,
        `${path.basename(filePath)} must have no unresolved __...__ tokens (found: ${remaining.join(", ")})`,
      ).toHaveLength(0);
    }
  });

  it("rendered files are valid JSON", () => {
    for (const filePath of renderedFiles) {
      expect(
        () => readJson(filePath),
        `${path.basename(filePath)} must be valid JSON after rendering`,
      ).not.toThrow();
    }
  });

  it("rendered files replace __PROJECT_KEY__ with the config projectKey", () => {
    const projectKey = String(exampleConfig.projectKey || "AIGO");
    for (const filePath of renderedFiles) {
      const text = fs.readFileSync(filePath, "utf8");
      // __PROJECT_KEY__ should NOT appear literally in rendered output
      expect(
        text.includes("__PROJECT_KEY__"),
        `${path.basename(filePath)} must not contain literal __PROJECT_KEY__ after rendering`,
      ).toBe(false);
      // The actual project key value should appear
      expect(
        text.includes(projectKey),
        `${path.basename(filePath)} must contain the resolved projectKey '${projectKey}'`,
      ).toBe(true);
    }
  });

  it("rendered files replace agent key placeholders with manifest keys", () => {
    for (const filePath of renderedFiles) {
      const text = fs.readFileSync(filePath, "utf8");
      // No __*_AGENT_KEY__ should remain
      const agentKeyTokens = [...text.matchAll(/__[A-Z_]+_AGENT_KEY__/g)].map((m) => m[0]);
      expect(
        agentKeyTokens,
        `${path.basename(filePath)} must have no remaining agent key placeholders`,
      ).toHaveLength(0);
    }
  });

  it("rendered files preserve Jira smart value tokens ({{...}}) unchanged", () => {
    for (const filePath of renderedFiles) {
      const text = fs.readFileSync(filePath, "utf8");
      // {{issue.key}} and {{agentResponse}} are Jira runtime tokens — must be present
      // in the rules that use them
      const ruleName = path.basename(filePath);
      if (ruleName !== "weekly-readout.json") {
        // Most rules use {{issue.key}}
        if (text.includes('"issueKey"')) {
          expect(
            text.includes("{{issue.key}}"),
            `${ruleName} must preserve {{issue.key}} Jira smart value`,
          ).toBe(true);
        }
      }
    }
  });

  it("rendered rules remain DISABLED", () => {
    for (const filePath of renderedFiles) {
      const ruleset = readJson(filePath) as { rules: Array<{ state?: string; name?: string }> };
      for (const rule of ruleset.rules) {
        expect(
          rule.state,
          `Rendered rule '${rule.name}' in ${path.basename(filePath)} must remain DISABLED`,
        ).toBe("DISABLED");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 6: Example config completeness
// ---------------------------------------------------------------------------

describe("example config — structure check", () => {
  it("has a projectKey field", () => {
    expect(exampleConfig).toHaveProperty("projectKey");
  });

  it("projectKey is a non-empty string", () => {
    expect(typeof exampleConfig.projectKey).toBe("string");
    expect(String(exampleConfig.projectKey).length).toBeGreaterThan(0);
  });

  it("has projectId for provisioning and is missing actorAccountId (expected for example config)", () => {
    // projectId is now present in the example config as part of the IaC
    // provisioning story (scripts/provision-jira.cjs reads it to scope
    // issue types, statuses, and field options to the correct project).
    // actorAccountId is still intentionally absent — real deployments must
    // supply this separately via environment or instance override.
    expect(typeof exampleConfig.projectId).toBe("string");
    expect(String(exampleConfig.projectId).length).toBeGreaterThan(0);
    expect(exampleConfig.actorAccountId).toBeUndefined();
  });
});
