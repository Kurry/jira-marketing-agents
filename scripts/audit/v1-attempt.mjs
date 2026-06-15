#!/usr/bin/env node
// generated_by: scripts/audit/v1-attempt.mjs (T-A-04)
// Audits the v1 (pre-IaC) attempt: classifies every evidence/ file as
// script-produced vs manual-artefact (by presence of a "generated_by:" header),
// and every scripts/ file as iac-compliant vs legacy. Read-only; no mutation.
//
// T-NIH-07 classification: Twin-specific logic (IaC audit harness). Classifies
// the repo's own files against the evidence contract — no Atlassian capability
// is re-implemented.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const EVIDENCE_DIR = join(REPO, 'evidence');
const SCRIPTS_DIR = join(REPO, 'scripts');
const OUT = join(REPO, 'evidence', 'audit', 'v1.json');

if (wantsHelp()) {
  console.log(
    'v1-attempt: classify evidence/ files (script-produced vs manual) and scripts/ files (iac vs legacy)'
  );
  process.exit(0);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function firstLines(path, n = 3) {
  const raw = readFileSync(path, 'utf8');
  return raw.split('\n', n).join('\n');
}

function hasGeneratedByHeader(path) {
  // A script-produced file declares its producer near the top: either as a
  // comment header ("// generated_by:" / "# generated_by:") or, for JSON,
  // a top-level "generated_by" key (the standard evidence envelope).
  try {
    const head = firstLines(path, 5);
    return /(^|\n)\s*(\/\/|#)?\s*"?generated_by"?\s*[:=]/.test(head);
  } catch {
    return false;
  }
}

// ---- Classify evidence/ files ---------------------------------------------
const manual_artefacts = [];
const script_produced = [];

for (const file of walk(EVIDENCE_DIR)) {
  const rel = relative(REPO, file);
  // Skip the audit output tree itself — it is produced by this audit pass.
  if (rel.startsWith('evidence/audit/')) continue;
  if (hasGeneratedByHeader(file)) script_produced.push(rel);
  else manual_artefacts.push(rel);
}

// ---- Classify scripts/ files ----------------------------------------------
// IaC-compliant scripts emit the standard evidence envelope (import or use of
// lib/evidence.mjs, or a "generated_by:" header). Legacy scripts are the
// ad-hoc provisioning helpers (provision-*.cjs) and any other .cjs/.sh that
// predate the envelope contract.
const legacy_scripts = [];
const iac_scripts = [];

for (const file of walk(SCRIPTS_DIR)) {
  const rel = relative(REPO, file);
  const base = rel.split('/').pop();
  let body = '';
  try {
    body = readFileSync(file, 'utf8');
  } catch {
    body = '';
  }
  const usesEnvelope =
    /lib\/evidence\.mjs/.test(body) ||
    /\benvelope\s*\(/.test(body) ||
    /writeEvidence\s*\(/.test(body);
  const hasHeader = /(^|\n)\s*(\/\/|#)\s*generated_by:/.test(body.slice(0, 400));

  const isLegacyByName = /^provision-/.test(base) || base.endsWith('.sh');

  if ((usesEnvelope || hasHeader) && !isLegacyByName) {
    iac_scripts.push(rel);
  } else {
    legacy_scripts.push(rel);
  }
}

manual_artefacts.sort();
script_produced.sort();
legacy_scripts.sort();
iac_scripts.sort();

const data = { manual_artefacts, script_produced, legacy_scripts, iac_scripts };

const summary =
  `evidence: ${script_produced.length} script-produced, ` +
  `${manual_artefacts.length} manual; ` +
  `scripts: ${iac_scripts.length} iac, ${legacy_scripts.length} legacy`;

const out = envelope({
  generatedBy: 'scripts/audit/v1-attempt.mjs',
  exitCode: 0,
  summary,
  data,
});

writeEvidence(OUT, out);
console.log(summary);
console.log(`wrote ${relative(REPO, OUT)}`);
