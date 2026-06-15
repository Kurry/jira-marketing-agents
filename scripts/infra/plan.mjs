#!/usr/bin/env node
// generated_by: scripts/infra/plan.mjs (T-R-INFRA-02)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (partial NIH).
//   This is a bespoke Terraform-like drift engine layered over documented Jira
//   REST getters. The drift/converge semantics re-implement what `acli jira
//   project|field|filter|dashboard` + golden-template cloning already provide;
//   only the read-only diff against documented REST getters is a legitimate gap
//   filler. See specs/atlassian-native-tools.md finding #4/#5 and the "IaC hard
//   reset" reduction — this layer should wrap native primitives, not build a
//   parallel product model. Native owner: ACLI / documented Jira REST + golden
//   template project (matrix rows "Project/work item operations" and "Jira admin
//   configuration").
// Drift detection: read the declared infra/ tree, compare it against live Jira
// via scripts/lib/jira.mjs, and report what apply.mjs would change. Read-only —
// performs NO mutations. Exits 0 with changes:[] when fully converged.
//
// Plan envelope contract (consumed by scripts/infra/apply.mjs):
//   envelope.data = {
//     ready: boolean,                 // false when infra/ tree is absent
//     changes: [                      // empty when converged
//       { resource, action, name, detail } // action: create|update|delete
//     ],
//     by_resource: { <resource>: { declared, live, changes } }
//   }
//
// Flags:
//   --json   print only the JSON envelope (no human lines)
//   --help

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp } from '../lib/staging.mjs';
import { planJira } from '../lib/plan-jira.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const INFRA_DIR = join(REPO_ROOT, 'infra');
const OUT = join(REPO_ROOT, 'evidence', 'infra', 'plan.json');

const jsonOnly = process.argv.slice(2).includes('--json');

function log(line) {
  if (!jsonOnly) console.log(line);
}

export async function buildPlan() {
  if (!existsSync(INFRA_DIR)) {
    return {
      ready: false,
      changes: [],
      by_resource: {},
      note: 'infra/ tree does not exist yet (T-R-INFRA-01 pending)',
    };
  }
  // Per-domain planners produce a flat change list + per-resource breakdown.
  const jira = await planJira({ repoRoot: REPO_ROOT, infraDir: INFRA_DIR });
  return {
    ready: true,
    changes: jira.changes,
    by_resource: jira.by_resource,
  };
}

async function main() {
  const plan = await buildPlan();
  const exitCode = 0; // plan never fails on drift; it only reports.

  const summary = !plan.ready
    ? 'infra plan: infra/ tree absent — nothing declared yet (not ready)'
    : plan.changes.length === 0
      ? 'infra plan: converged — 0 changes'
      : `infra plan: ${plan.changes.length} change(s) needed`;

  const env = envelope({
    generatedBy: 'scripts/infra/plan.mjs',
    exitCode,
    summary,
    data: plan,
  });
  writeEvidence(OUT, env);

  log(summary);
  for (const c of plan.changes) {
    log(`  ${c.action.toUpperCase()} ${c.resource}: ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  }
  console.log(JSON.stringify(env));
  process.exit(exitCode);
}

function runCli() {
  if (wantsHelp()) {
    console.log(
      'infra plan: diff declared infra/ against live Jira (read-only). ' +
        'Exit 0 with changes:[] when converged. --json prints only the envelope.'
    );
    process.exit(0);
  }
  main().catch((err) => {
    const env = envelope({
      generatedBy: 'scripts/infra/plan.mjs',
      exitCode: 1,
      summary: `infra plan crashed: ${err.message}`,
      data: { ready: false, changes: [], error: err.stack || String(err) },
    });
    try {
      writeEvidence(OUT, env);
    } catch {
      /* best effort */
    }
    process.stderr.write(`infra plan failed: ${err.message}\n`);
    console.log(JSON.stringify(env));
    process.exit(1);
  });
}

// Only run the CLI when invoked directly, not when imported by apply.mjs.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
