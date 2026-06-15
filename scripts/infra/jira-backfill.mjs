#!/usr/bin/env node
// generated_by: scripts/infra/jira-backfill.mjs (T-R-INFRA-05)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (read-only export).
//   Reads live Jira via documented REST getters (getFilter, getAllDashboards)
//   and rewrites the bespoke infra/ YAML model. Read-only GETs over documented
//   endpoints are fine, but the destination is the parallel product model; ACLI
//   `jira filter|dashboard` list/export covers the same data natively. NOTE:
//   PROJECT_KEY is hard-coded 'AIGO' (line ~33) and dashboard filtering is a
//   name-prefix 'AIGO' heuristic — both should come from the instance binding.
//   Native owner: ACLI export + documented Jira REST (matrix "Jira admin
//   configuration"). Keep custom only as a snapshot harness.
// Backfills CONTENT into the infra/jira YAML files that the render stub left
// empty/null, sourcing from live Jira + evidence/jira-config. Idempotent and
// re-runnable: it rewrites these three files from authoritative sources only.
//
//   infra/jira/filters.yaml      — null jql → live JQL (scoped getFilter)
//   infra/jira/seeds/matrix.yaml — seeds: [] → one entry per seeded issue type
//   infra/jira/dashboards.yaml   — dashboards: [] → live AIGO dashboards
//
// Read-only against Jira (GET only). Writes only under infra/.
// Exit: 0 ok / 3 no-auth (via createClient).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify as toYaml } from 'yaml';
import { createClient } from '../lib/jira.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const PROJECT_KEY = 'AIGO';

const p = (...x) => join(REPO_ROOT, ...x);

if (wantsHelp()) {
  console.log('jira-backfill: fill filters.yaml jql, seeds/matrix.yaml, dashboards.yaml ' +
    'from live Jira + evidence/jira-config. exit 0 ok / 3 no-auth');
  process.exit(0);
}

function header(lines) {
  return lines.map((l) => `# ${l}`).join('\n') + '\n';
}

async function backfillFilters(client) {
  const path = p('infra/jira/filters.yaml');
  const existing = readFileSync(path, 'utf8');
  // Preserve the declared filter list/order from the current YAML.
  const { parse } = await import('yaml');
  const doc = parse(existing);
  for (const f of doc.filters || []) {
    const live = await client.filters.getFilter({ id: String(f.id), expand: 'jql,owner' });
    f.jql = live.jql ?? null;
    f.owner = live.owner?.accountId ?? null;
  }
  const out =
    header([
      'generated_by: scripts/infra/jira-backfill.mjs (T-R-INFRA-05)',
      'Saved filters with live JQL backfilled via scoped getFilter.',
    ]) + toYaml({ schemaVersion: 1, filters: doc.filters });
  writeFileSync(path, out);
  return doc.filters.length;
}

function backfillSeeds() {
  const path = p('infra/jira/seeds/matrix.yaml');
  const seedsOut = JSON.parse(readFileSync(p('evidence/jira-config/seeds-output.json'), 'utf8'));
  const all = [...(seedsOut.created || []), ...(seedsOut.retyped || [])];
  const seeds = all.map((row) => {
    const s = row.seed || {};
    return {
      issueType: s.issueTypeName || row.newType,
      issueTypeName: s.issueTypeName || row.newType,
      summary: s.summary,
      label: (s.labels && s.labels[0]) || seedsOut.seedLabel || 'aigo-seed',
      key: row.key || null,
    };
  });
  const out =
    header([
      'generated_by: scripts/infra/jira-backfill.mjs (T-R-INFRA-05)',
      'Seed coverage matrix — one seed per canonical AIGO issue type.',
      'source: evidence/jira-config/seeds-output.json',
    ]) + toYaml({ schemaVersion: 1, seedLabel: seedsOut.seedLabel || 'aigo-seed', seeds });
  writeFileSync(path, out);
  return seeds.length;
}

async function backfillDashboards(client) {
  const path = p('infra/jira/dashboards.yaml');
  const res = await client.dashboards.getAllDashboards({ maxResults: 100 });
  const dashboards = (res.dashboards || [])
    .filter((d) => d.name.startsWith('AIGO'))
    .map((d) => ({ id: d.id, name: d.name }));
  const out =
    header([
      'generated_by: scripts/infra/jira-backfill.mjs (T-R-INFRA-05)',
      'AIGO dashboards observed live (id + name).',
    ]) + toYaml({ schemaVersion: 1, dashboards });
  writeFileSync(path, out);
  return dashboards.length;
}

async function main() {
  const client = createClient();
  const nFilters = await backfillFilters(client);
  const nSeeds = backfillSeeds();
  const nDash = await backfillDashboards(client);
  process.stderr.write(
    `jira-backfill: filters jql=${nFilters}, seeds=${nSeeds}, dashboards=${nDash}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`jira-backfill failed: ${err.stack || err}\n`);
  process.exit(1);
});
