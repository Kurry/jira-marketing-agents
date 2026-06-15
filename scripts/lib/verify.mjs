// generated_by: scripts/lib/verify.mjs (T-R-P5)
// Shared helpers for scripts/verify/*.mjs: load infra YAML, diff helpers,
// and a standard finish() that prints the envelope run-all.mjs expects.
//
// Status convention (envelope.data.status):
//   green       — declared state matches live  → exit 0
//   red         — drift detected               → exit 2
//   unsupported — platform can't be checked     → exit 5 (needs data.blocker)
// Auth missing (createClient) exits 3 via scripts/lib/jira.mjs.

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { envelope, writeEvidence } from './evidence.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..');

export const EXIT = { GREEN: 0, RED: 2, MISSING_AUTH: 3, UNSUPPORTED: 5 };

/** Absolute path under the repo root. */
export function repoPath(...parts) {
  return join(REPO_ROOT, ...parts);
}

/**
 * Load and parse an infra YAML file. Returns { ok, data, error }.
 * A missing file is a red condition for a verify script (nothing declared).
 */
export function loadInfraYaml(relPath, expectedSchemaVersion = 1) {
  const abs = repoPath(relPath);
  if (!existsSync(abs)) {
    return { ok: false, error: `infra file missing: ${relPath}`, data: null };
  }
  let data;
  try {
    data = parseYaml(readFileSync(abs, 'utf8'));
  } catch (err) {
    return { ok: false, error: `cannot parse ${relPath}: ${err.message}`, data: null };
  }
  if (data?.schemaVersion !== expectedSchemaVersion) {
    return {
      ok: false,
      error: `${relPath}: schemaVersion ${data?.schemaVersion} != ${expectedSchemaVersion}`,
      data,
    };
  }
  return { ok: true, data, error: null };
}

/** Set difference helpers for declared-vs-live drift. */
export function diffSets(declared, live) {
  const d = new Set(declared);
  const l = new Set(live);
  return {
    missing: [...d].filter((x) => !l.has(x)), // declared but not live
    extra: [...l].filter((x) => !d.has(x)), // live but not declared
  };
}

/**
 * Build the envelope, write evidence, print the single-line JSON the
 * run-all aggregator parses, and exit with the matching code.
 *
 * @param {object} o
 * @param {string} o.generatedBy
 * @param {string} o.row            VM row name (e.g. "VM-JIRA-FILTERS")
 * @param {'green'|'red'|'unsupported'} o.status
 * @param {string} o.summary
 * @param {object} o.data           extra detail merged into envelope.data
 * @param {string} [o.blocker]      repo-relative blocker path (unsupported only)
 * @param {string} o.evidencePath   repo-relative output path
 */
export function finish({ generatedBy, row, status, summary, data = {}, blocker, evidencePath }) {
  const exitCode =
    status === 'green' ? EXIT.GREEN : status === 'unsupported' ? EXIT.UNSUPPORTED : EXIT.RED;
  const env = envelope({
    generatedBy,
    exitCode,
    summary,
    data: { row, status, ...(blocker ? { blocker } : {}), ...data },
  });
  if (evidencePath) writeEvidence(repoPath(evidencePath), env);
  process.stderr.write(summary + '\n');
  // Single-line JSON on the last stdout line — required by lib/runner.mjs.
  process.stdout.write(JSON.stringify(env) + '\n');
  process.exit(exitCode);
}

/** Wrap a verify main() so uncaught errors become a red row, not a crash. */
export function guard(generatedBy, row, fn) {
  return Promise.resolve()
    .then(fn)
    .catch((err) => {
      finish({
        generatedBy,
        row,
        status: 'red',
        summary: `${row} crashed: ${err.message}`,
        data: { error: err.stack || String(err) },
      });
    });
}
