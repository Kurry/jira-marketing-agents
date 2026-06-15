#!/usr/bin/env node
// generated_by: scripts/verify/run-all.mjs (T-R-INFRA-04)
// VM aggregator (row VM-DONE). Runs every scripts/verify/*.mjs (except this
// file), collects each JSON envelope, and writes evidence/verify/run-all.json
// with per-row status. Writes evidence/DONE.json only when every row is green
// or unsupported-with-blocker. Exits 2 if any row is red without a blocker.
//
// Row status convention (each verify script's envelope.data.status):
//   "green"       — check passed
//   "red"         — check failed (no blocker) → overall fail
//   "unsupported" — platform can't support it; requires a blocker file path
//                   in envelope.data.blocker, else treated as red.

import { existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { runScript } from '../lib/runner.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const OUT = join(REPO_ROOT, 'evidence', 'verify', 'run-all.json');
const DONE = join(REPO_ROOT, 'evidence', 'DONE.json');

if (wantsHelp()) {
  console.log(
    'verify run-all: run every scripts/verify/*.mjs, aggregate JSON envelopes, ' +
      'write evidence/verify/run-all.json (+ evidence/DONE.json when all green). ' +
      'Exit 2 if any row is red without a blocker.'
  );
  process.exit(0);
}

function discoverVerifyScripts() {
  return readdirSync(HERE)
    .filter((f) => f.endsWith('.mjs') && f !== 'run-all.mjs')
    .sort()
    .map((f) => join(HERE, f));
}

function classifyRow(scriptPath, result) {
  const data = result.envelope?.data ?? {};
  const row = data.row || basename(scriptPath, '.mjs');
  let status = data.status;

  // Infer status from exit code when the script didn't declare one.
  if (!status) {
    if (result.exitCode === 0) status = 'green';
    else if (result.exitCode === 5) status = 'unsupported';
    else status = 'red';
  }

  const blocker = data.blocker || null;
  // unsupported is only acceptable when accompanied by a real blocker file.
  const blockerOk = blocker && existsSync(join(REPO_ROOT, blocker));
  let effective = status;
  if (status === 'unsupported') effective = blockerOk ? 'unsupported' : 'red';

  return {
    row,
    script: basename(scriptPath),
    status: effective,
    declared_status: status,
    exit_code: result.exitCode,
    blocker,
    blocker_present: Boolean(blockerOk),
    summary: result.envelope?.summary || (result.stderr.trim().split('\n').pop() ?? ''),
    has_envelope: Boolean(result.envelope),
  };
}

function main() {
  const scripts = discoverVerifyScripts();
  const rows = scripts.map((s) => classifyRow(s, runScript(s)));

  const green = rows.filter((r) => r.status === 'green').length;
  const unsupported = rows.filter((r) => r.status === 'unsupported').length;
  const red = rows.filter((r) => r.status === 'red');

  // An empty verify set is not "done" — there is nothing proving convergence.
  const allGood = rows.length > 0 && red.length === 0;
  const exitCode = allGood ? 0 : 2;

  const summary =
    `${rows.length} verify rows: ${green} green, ${unsupported} unsupported(blocked), ` +
    `${red.length} red`;

  const env = envelope({
    generatedBy: 'scripts/verify/run-all.mjs',
    exitCode,
    summary,
    data: { row: 'VM-DONE', status: allGood ? 'green' : 'red', rows },
  });
  writeEvidence(OUT, env);

  if (allGood) {
    writeEvidence(
      DONE,
      envelope({
        generatedBy: 'scripts/verify/run-all.mjs',
        exitCode: 0,
        summary: `all ${rows.length} verify rows green or blocked — IaC converged`,
        data: { row: 'VM-DONE', status: 'green', row_count: rows.length },
      })
    );
    console.log(`verify run-all: ${summary} — wrote evidence/DONE.json`);
  } else {
    const names = red.map((r) => r.row).join(', ');
    console.log(`verify run-all: ${summary} — red rows: ${names}`);
  }
  console.log(JSON.stringify(env));
  process.exit(exitCode);
}

try {
  main();
} catch (err) {
  const env = envelope({
    generatedBy: 'scripts/verify/run-all.mjs',
    exitCode: 1,
    summary: `verify run-all crashed: ${err.message}`,
    data: { row: 'VM-DONE', status: 'red' },
  });
  try {
    writeEvidence(OUT, env);
  } catch {
    /* best effort */
  }
  process.stderr.write(`verify run-all failed: ${err.message}\n`);
  console.log(JSON.stringify(env));
  process.exit(1);
}
