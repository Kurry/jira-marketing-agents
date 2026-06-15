#!/usr/bin/env node
// generated_by: scripts/verify/jira-seeds.mjs (T-R-P5)
// Row VM-JIRA-SEEDS. Asserts every issue type declared in
// infra/jira/seeds/matrix.yaml has at least one live seed issue carrying the
// seed label (default aigo-seed). Green when every declared seed issue type is
// represented by a labelled live issue.

import { createClient } from '../lib/jira.mjs';
import { loadInfraYaml, finish, guard } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const GENERATED_BY = 'scripts/verify/jira-seeds.mjs';
const ROW = 'VM-JIRA-SEEDS';
const EVIDENCE = 'evidence/verify/jira-seeds.json';
const PROJECT_KEY = 'AIGO';

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: assert one labelled seed issue exists per issue type in ` +
    `infra/jira/seeds/matrix.yaml. exit 0 green / 2 red / 3 no-auth`);
  process.exit(0);
}

guard(GENERATED_BY, ROW, async () => {
  const infra = loadInfraYaml('infra/jira/seeds/matrix.yaml');
  if (!infra.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: infra.error, data: { error: infra.error }, evidencePath: EVIDENCE });
    return;
  }
  const seeds = infra.data.seeds || [];
  const label = infra.data.seedLabel || 'aigo-seed';
  const declaredTypes = [...new Set(seeds.map((s) => s.issueType))];

  const client = createClient();
  const jql = `project = ${PROJECT_KEY} AND labels = "${label}"`;
  // GET and POST /search return 410 on this Cloud instance.
  // Use POST /rest/api/3/search/jql (enhanced search POST) instead.
  const res = await client.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
    jql,
    maxResults: 200,
    fields: ['issuetype', 'labels'],
  });
  const liveIssues = res.issues || [];
  const liveTypeNames = new Set(liveIssues.map((i) => i.fields?.issuetype?.name));

  // Declared seeds reference issue type by key; map key→name via the matrix
  // when present, else assume the key already is the live name.
  const keyToName = new Map(seeds.map((s) => [s.issueType, s.issueTypeName || s.issueType]));
  const missing = declaredTypes.filter((k) => !liveTypeNames.has(keyToName.get(k)));

  const status = liveIssues.length > 0 && missing.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${liveIssues.length} live "${label}" issues across ${liveTypeNames.size} types; ` +
    `${declaredTypes.length} declared seed types, ${missing.length} unrepresented`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: {
      seed_label: label,
      live_issue_count: liveIssues.length,
      live_types: [...liveTypeNames],
      declared_types: declaredTypes,
      missing_types: missing,
    },
    evidencePath: EVIDENCE });
});
