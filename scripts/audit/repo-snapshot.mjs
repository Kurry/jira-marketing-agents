#!/usr/bin/env node
// generated_by: scripts/audit/repo-snapshot.mjs (T-A-01)
// Snapshot of the IaC-relevant repo surface: files under scripts/, evidence/,
// tests/, infra/; npm scripts present in package.json; verify scripts present.
// Read-only. Writes evidence/audit/repo.json with the standard envelope.
//
// T-NIH-07 classification: Twin-specific logic (IaC audit harness). Inspects the
// repo's own filesystem/package.json — no Atlassian capability is involved or
// re-implemented. Sanctioned by the matrix ("Instance config and evidence
// generation").

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCAN_DIRS = ['scripts', 'evidence', 'tests', 'infra'];
const OUT = join(REPO_ROOT, 'evidence', 'audit', 'repo.json');

if (wantsHelp()) {
  console.log(
    'audit repo-snapshot: list files under scripts/ evidence/ tests/ infra/, ' +
      'record npm scripts and verify scripts. Writes evidence/audit/repo.json. Read-only.'
  );
  process.exit(0);
}

function listFiles(absDir) {
  const out = [];
  if (!existsSync(absDir)) return out;
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(abs));
    } else if (entry.isFile()) {
      out.push(relative(REPO_ROOT, abs));
    }
  }
  return out.sort();
}

function main() {
  const filesByDir = {};
  let totalFiles = 0;
  for (const dir of SCAN_DIRS) {
    const files = listFiles(join(REPO_ROOT, dir));
    filesByDir[dir] = files;
    totalFiles += files.length;
  }

  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const npmScripts = Object.keys(pkg.scripts || {}).sort();

  const verifyDir = join(REPO_ROOT, 'scripts', 'verify');
  const verifyScripts = existsSync(verifyDir)
    ? readdirSync(verifyDir)
        .filter((f) => f.endsWith('.mjs'))
        .sort()
    : [];

  const data = {
    scan_dirs: SCAN_DIRS,
    files_by_dir: filesByDir,
    total_files: totalFiles,
    npm_scripts: npmScripts,
    verify_scripts: verifyScripts,
  };

  const summary =
    `${totalFiles} files across ${SCAN_DIRS.length} dirs; ` +
    `${npmScripts.length} npm scripts; ${verifyScripts.length} verify scripts`;

  const env = envelope({
    generatedBy: 'scripts/audit/repo-snapshot.mjs',
    exitCode: 0,
    summary,
    data,
  });
  writeEvidence(OUT, env);
  console.log(`audit repo-snapshot: wrote ${relative(REPO_ROOT, OUT)} — ${summary}`);
  process.exit(0);
}

try {
  main();
} catch (err) {
  process.stderr.write(`audit repo-snapshot failed: ${err.message}\n`);
  process.exit(1);
}
