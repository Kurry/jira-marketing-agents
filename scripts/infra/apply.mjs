#!/usr/bin/env node
// generated_by: scripts/infra/apply.mjs (T-B-02 stub)
import { wantsHelp, assertStagingOnly } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('infra apply: reconcile the staging instance to match declared infra/ (mutating, staging-only)');
  process.exit(0);
}

assertStagingOnly();
console.log('infra apply: not yet implemented');
process.exit(0);
