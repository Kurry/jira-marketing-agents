#!/usr/bin/env node
// generated_by: scripts/infra/cleanup-v1-evidence.mjs (T-D-01)
// NIH-CLASSIFICATION (T-NIH-07): Twin-specific logic (repo evidence hygiene).
//   Operates only on this repo's own evidence/ artefacts (delete superseded v1
//   files, preserve live-state snapshots). No Atlassian product capability is
//   re-implemented — this is repo bookkeeping for the evidence harness, which is
//   legitimately custom. Not NIH. Native owner: n/a (repo-local).
// Deletes superseded manual v1 evidence artefacts (no generated_by header),
// preserving live-state data snapshots that have no regeneration script yet.
// The preserve/delete decision is encoded here, not performed by hand.
// Reads evidence/audit/v1.json; writes evidence/infra/cleanup.json. Idempotent.

import { existsSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const V1 = join(REPO, 'evidence', 'audit', 'v1.json');
const OUT = join(REPO, 'evidence', 'infra', 'cleanup.json');

if (wantsHelp()) {
  console.log(
    'cleanup-v1-evidence: delete superseded manual v1 artefacts; preserve live-state data snapshots'
  );
  process.exit(0);
}

// Preserve rule: live Jira/Forge state snapshots that the declarative infra
// tree is built from and that have no regeneration script yet. These are kept
// and flagged for a regeneration script rather than deleted. Matched by exact
// repo-relative path.
const PRESERVE = new Set([
  'evidence/jira-config/custom-fields.json',
  'evidence/jira-config/issue-types.json',
  'evidence/jira-config/statuses.json',
  'evidence/jira-config/provision-output.json',
  'evidence/jira-config/seeds-output.json',
  'evidence/jira-config/forge-vars.sh',
]);

// Each preserved file is paired with the script that should regenerate it once
// it exists (Phase 5 verify scripts read live Jira and re-emit these).
const REGEN_PLAN = {
  'evidence/jira-config/custom-fields.json':
    'scripts/verify/fields.mjs (T-R-P5) re-emits live field config',
  'evidence/jira-config/issue-types.json':
    'scripts/verify/issue-types.mjs (T-R-P5) re-emits live issue types',
  'evidence/jira-config/statuses.json':
    'scripts/verify/workflow.mjs (T-R-P5) re-emits live statuses/workflow',
  'evidence/jira-config/provision-output.json':
    'superseded by scripts/infra/apply.mjs (T-R-INFRA-03) JSON report',
  'evidence/jira-config/seeds-output.json':
    'scripts/verify/seeds.mjs (T-R-P5) re-emits seed coverage',
  'evidence/jira-config/forge-vars.sh':
    'scripts/infra/render-all.mjs (T-R-INFRA-01/05) renders forge env vars from infra/',
};

const v1 = JSON.parse(readFileSync(V1, 'utf8'));
const manual = v1.data.manual_artefacts;

const deleted = [];
const preserved = [];
const missing = [];

for (const rel of manual) {
  const abs = join(REPO, rel);
  if (PRESERVE.has(rel)) {
    preserved.push({ path: rel, regenerated_by: REGEN_PLAN[rel] });
    continue;
  }
  if (!existsSync(abs)) {
    missing.push(rel); // already gone — idempotent re-run
    continue;
  }
  rmSync(abs);
  deleted.push(rel);
}

deleted.sort();
preserved.sort((a, b) => a.path.localeCompare(b.path));
missing.sort();

const data = {
  deleted,
  preserved_for_regeneration: preserved,
  already_absent: missing,
  counts: {
    manual_total: manual.length,
    deleted: deleted.length,
    preserved: preserved.length,
    already_absent: missing.length,
  },
};

const summary =
  `deleted ${deleted.length} superseded artefacts, ` +
  `preserved ${preserved.length} live-state snapshots for regeneration` +
  (missing.length ? `, ${missing.length} already absent` : '');

writeEvidence(OUT, envelope({
  generatedBy: 'scripts/infra/cleanup-v1-evidence.mjs',
  exitCode: 0,
  summary,
  data,
}));

console.log(summary);
console.log(`wrote evidence/infra/cleanup.json`);
