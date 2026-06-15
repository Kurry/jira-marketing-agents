#!/usr/bin/env node
// generated_by: scripts/infra/render-all.mjs (T-B-02 stub)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (unimplemented stub).
//   Intended to render declared infra/ YAML into concrete payloads. As a stub it
//   adds no NIH yet; if implemented it must render INTO native primitives (ACLI
//   commands / Forge env vars / golden-template inputs) rather than become
//   another bespoke product-model emitter. Native owner: ACLI + Forge CLI
//   (matrix rows "Project/work item operations", "Agent runtime").
import { wantsHelp } from '../lib/staging.mjs';

if (wantsHelp()) {
  console.log('infra render-all: render declared infra/ YAML into concrete payloads (seeds, rules, filters)');
  process.exit(0);
}

console.log('infra render-all: not yet implemented');
process.exit(0);
