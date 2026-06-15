// generated_by: scripts/lib/evidence.mjs (T-B-02)
// Standard evidence envelope + writer used by all IaC scripts.
//
// T-NIH-07 classification: Twin-specific logic (IaC evidence harness). Defines
// the repo's machine-readable evidence envelope/writer — sanctioned custom
// layer per the matrix; no Atlassian capability is re-implemented.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveSite } from './staging.mjs';

export function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Build the standard evidence envelope.
 * @param {object} o
 * @param {string} o.generatedBy  e.g. "scripts/audit/repo-snapshot.mjs"
 * @param {number} o.exitCode
 * @param {string} o.summary
 * @param {*} o.data
 */
export function envelope({ generatedBy, exitCode = 0, summary = '', data = {} }) {
  return {
    generated_by: generatedBy,
    generated_at: new Date().toISOString(),
    git_sha: gitSha(),
    instance: resolveSite(),
    exit_code: exitCode,
    summary,
    data,
  };
}

/** Write a JSON evidence file (creates parent dirs). */
export function writeEvidence(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
  return path;
}
