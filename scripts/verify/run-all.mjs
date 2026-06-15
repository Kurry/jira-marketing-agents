#!/usr/bin/env node
// generated_by: scripts/verify/run-all.mjs (T-B-02 stub)
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('verify run-all: run every scripts/verify/*.mjs check against staging and aggregate results');
  process.exit(0);
}

console.log('verify run-all: not yet implemented');
process.exit(0);
