#!/usr/bin/env node
// generated_by: scripts/verify/jira-filters.mjs (T-R-P5)
// Row VM-JIRA-FILTERS. Diffs infra/jira/filters.yaml against live saved
// filters scoped to AIGO. Matches by filter name; when a declared filter
// carries a `jql`, the live JQL must match too (normalized whitespace).

import { createClient } from '../lib/jira.mjs';
import { loadInfraYaml, diffSets, finish, guard } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const GENERATED_BY = 'scripts/verify/jira-filters.mjs';
const ROW = 'VM-JIRA-FILTERS';
const EVIDENCE = 'evidence/verify/jira-filters.json';
const PROJECT_KEY = 'AIGO';

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: diff infra/jira/filters.yaml vs live AIGO filters (name + jql). ` +
    `exit 0 green / 2 red / 3 no-auth`);
  process.exit(0);
}

guard(GENERATED_BY, ROW, async () => {
  const infra = loadInfraYaml('infra/jira/filters.yaml');
  if (!infra.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: infra.error, data: { error: infra.error }, evidencePath: EVIDENCE });
    return;
  }
  const declared = infra.data.filters || [];
  const declaredNames = declared.map((f) => f.name);

  const client = createClient();
  const search = await client.filters.getFiltersPaginated({
    projectId: undefined,
    expand: 'jql',
    maxResults: 100,
  });
  // getFiltersPaginated has no projectKeys param in v3; filter client-side to AIGO.
  const liveAll = search.values || [];
  const liveByName = new Map();
  for (const f of liveAll) liveByName.set(f.name, f.jql);
  const liveNames = [...liveByName.keys()].filter((n) => n.startsWith('AIGO'));

  const { missing, extra } = diffSets(declaredNames, liveNames);

  // JQL mismatches among filters that exist in both.
  const jqlMismatches = [];
  for (const f of declared) {
    if (!f.jql) continue;
    if (!liveByName.has(f.name)) continue;
    if (norm(liveByName.get(f.name)) !== norm(f.jql)) {
      jqlMismatches.push({ name: f.name, declared: norm(f.jql), live: norm(liveByName.get(f.name)) });
    }
  }

  const status = missing.length === 0 && jqlMismatches.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${declaredNames.length} declared, ${liveNames.length} live AIGO filters; ` +
    `${missing.length} missing, ${jqlMismatches.length} jql-mismatch`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: { declared: declaredNames, live: liveNames, missing, extra, jql_mismatches: jqlMismatches },
    evidencePath: EVIDENCE });
});
