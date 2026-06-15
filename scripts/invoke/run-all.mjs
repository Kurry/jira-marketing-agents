#!/usr/bin/env node
// generated_by: scripts/invoke/run-all.mjs (T-B-02 stub)
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('rovo invoke-all: invoke every Rovo agent against staging and capture transcripts as evidence');
  process.exit(0);
}

console.log('rovo invoke-all: not yet implemented');
process.exit(0);
