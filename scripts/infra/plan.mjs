#!/usr/bin/env node
// generated_by: scripts/infra/plan.mjs (T-B-02 stub)
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('infra plan: diff declared infra/ against the live staging instance (read-only)');
  process.exit(0);
}

console.log('infra plan: not yet implemented');
process.exit(0);
