#!/usr/bin/env node
// generated_by: scripts/audit/run-all.mjs (T-B-02 stub)
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('audit run-all: runs every scripts/audit/*-snapshot.mjs then summarize.mjs');
  process.exit(0);
}

console.log('audit run-all: not yet implemented');
process.exit(0);
