#!/usr/bin/env node
// generated_by: scripts/infra/render-all.mjs (T-B-02 stub)
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('infra render-all: render declared infra/ YAML into concrete payloads (seeds, rules, filters)');
  process.exit(0);
}

console.log('infra render-all: not yet implemented');
process.exit(0);
