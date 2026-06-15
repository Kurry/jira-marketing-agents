#!/usr/bin/env node
// generated_by: scripts/audit/run-all.mjs (T-B-02 stub)
//
// T-NIH-07 classification: Twin-specific logic (IaC audit harness, STUB —
// "not yet implemented"). Will orchestrate the repo's own audit snapshots; no
// Atlassian capability is re-implemented.
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('audit run-all: runs every scripts/audit/*-snapshot.mjs then summarize.mjs');
  process.exit(0);
}

console.log('audit run-all: not yet implemented');
process.exit(0);
