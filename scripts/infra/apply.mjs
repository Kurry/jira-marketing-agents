#!/usr/bin/env node
// generated_by: scripts/infra/apply.mjs (T-R-INFRA-03)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (partial NIH).
//   Bespoke "converge"/idempotency engine over the Jira SDK. The apply/re-plan
//   idempotency loop re-implements Terraform-style reconciliation that ACLI's
//   create-if-absent commands and golden-template cloning provide natively.
//   Native owner: ACLI `jira project|field|filter` + golden template project
//   (matrix rows "Project/work item operations", "Jira admin configuration").
//   See specs/atlassian-native-tools.md finding #4/#5 and "IaC hard reset".
//   Keep custom only for: staging-guard + additive-only safety enforcement.
// Idempotent converge: build the plan, apply ONLY the delta to live Jira, then
// re-plan to confirm convergence. A second run must report applied:[] (idempotent).
//
// Safety:
//   - assertStagingOnly() runs before any mutation (exit 4 off-staging).
//   - The plan is CONVERGENT/ADDITIVE: it only ever proposes `create`. apply
//     refuses to perform any non-create action (defense in depth vs the safety
//     contract — no deletes/destructive config mutation).
//
// Evidence: evidence/infra/apply.json. VM row: VM-IDEMPOTENCY.

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp, assertStagingOnly } from '../lib/staging.mjs';
import { buildPlan } from './plan.mjs';
import { applyJiraChange } from '../lib/apply-jira.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT = join(REPO_ROOT, 'evidence', 'infra', 'apply.json');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');

if (wantsHelp()) {
  console.log(
    'infra apply: converge live Jira to declared infra/ (staging-only, mutating). ' +
      'Applies only the plan delta, then re-plans to confirm idempotency. ' +
      '--dry-run reports the delta without mutating.'
  );
  process.exit(0);
}

async function main() {
  const plan = await buildPlan();

  if (!plan.ready) {
    const env = envelope({
      generatedBy: 'scripts/infra/apply.mjs',
      exitCode: 0,
      summary: 'infra apply: infra/ tree absent — nothing to apply (not ready)',
      data: { row: 'VM-IDEMPOTENCY', ready: false, applied: [], remaining: [] },
    });
    writeEvidence(OUT, env);
    console.log(env.summary);
    console.log(JSON.stringify(env));
    process.exit(0);
  }

  // Defense in depth: refuse anything but additive creates.
  const illegal = plan.changes.filter((c) => c.action !== 'create');
  if (illegal.length > 0) {
    const env = envelope({
      generatedBy: 'scripts/infra/apply.mjs',
      exitCode: 2,
      summary: `infra apply: refusing — plan contains ${illegal.length} non-create action(s)`,
      data: { row: 'VM-IDEMPOTENCY', ready: true, applied: [], illegal },
    });
    writeEvidence(OUT, env);
    process.stderr.write(env.summary + '\n');
    console.log(JSON.stringify(env));
    process.exit(2);
  }

  if (plan.changes.length === 0) {
    const env = envelope({
      generatedBy: 'scripts/infra/apply.mjs',
      exitCode: 0,
      summary: 'infra apply: already converged — 0 changes applied (idempotent)',
      data: { row: 'VM-IDEMPOTENCY', ready: true, applied: [], remaining: [], idempotent: true },
    });
    writeEvidence(OUT, env);
    console.log(env.summary);
    console.log(JSON.stringify(env));
    process.exit(0);
  }

  if (dryRun) {
    const env = envelope({
      generatedBy: 'scripts/infra/apply.mjs',
      exitCode: 0,
      summary: `infra apply --dry-run: ${plan.changes.length} change(s) would be applied`,
      data: { row: 'VM-IDEMPOTENCY', ready: true, dry_run: true, would_apply: plan.changes },
    });
    writeEvidence(OUT, env);
    console.log(env.summary);
    console.log(JSON.stringify(env));
    process.exit(0);
  }

  // We are about to mutate — enforce staging.
  assertStagingOnly();

  const applied = [];
  const failed = [];
  for (const change of plan.changes) {
    try {
      const result = await applyJiraChange(change);
      applied.push({ ...change, result });
    } catch (err) {
      failed.push({ ...change, error: err.message });
    }
  }

  // Re-plan to prove idempotency: after apply, the delta must be empty.
  const after = await buildPlan();
  const remaining = after.changes;
  const idempotent = failed.length === 0 && remaining.length === 0;
  const exitCode = idempotent ? 0 : 2;

  const env = envelope({
    generatedBy: 'scripts/infra/apply.mjs',
    exitCode,
    summary: idempotent
      ? `infra apply: applied ${applied.length} change(s); re-plan converged (idempotent)`
      : `infra apply: applied ${applied.length}, ${failed.length} failed, ${remaining.length} still drifting`,
    data: {
      row: 'VM-IDEMPOTENCY',
      ready: true,
      idempotent,
      applied,
      failed,
      remaining,
    },
  });
  writeEvidence(OUT, env);
  console.log(env.summary);
  console.log(JSON.stringify(env));
  process.exit(exitCode);
}

main().catch((err) => {
  const env = envelope({
    generatedBy: 'scripts/infra/apply.mjs',
    exitCode: 1,
    summary: `infra apply crashed: ${err.message}`,
    data: { row: 'VM-IDEMPOTENCY', error: err.stack || String(err) },
  });
  try {
    writeEvidence(OUT, env);
  } catch {
    /* best effort */
  }
  process.stderr.write(`infra apply failed: ${err.message}\n`);
  console.log(JSON.stringify(env));
  process.exit(1);
});
