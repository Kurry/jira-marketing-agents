#!/usr/bin/env node
// generated_by: scripts/verify/jira-issue-types.mjs (T-R-P5)
// Row VM-JIRA-ISSUE-TYPES. Diffs infra/jira/issue-types.yaml against the
// issue types live in the AIGO project. Green only when every declared type
// exists live (extras live are reported but not fatal — Jira ships defaults).
//
// T-NIH-07 classification: native-wrapper. Native owner (matrix row
// "Jira admin configuration"): documented Jira Cloud REST v3
// GET /rest/api/3/project/{key}?expand=issueTypes (via jira.js
// projects.getProject). The native call returns the live issue-type set; this
// script only diffs it against infra/jira/issue-types.yaml.

import { createClient } from '../lib/jira.mjs';
import { loadInfraYaml, diffSets, finish, guard, EXIT } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const GENERATED_BY = 'scripts/verify/jira-issue-types.mjs';
const ROW = 'VM-JIRA-ISSUE-TYPES';
const EVIDENCE = 'evidence/verify/jira-issue-types.json';
const PROJECT_KEY = 'AIGO';

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: diff infra/jira/issue-types.yaml vs live AIGO issue types. ` +
    `exit 0 green / 2 red / 3 no-auth / 5 unsupported`);
  process.exit(0);
}

guard(GENERATED_BY, ROW, async () => {
  const infra = loadInfraYaml('infra/jira/issue-types.yaml');
  if (!infra.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: infra.error, data: { error: infra.error }, evidencePath: EVIDENCE });
    return;
  }
  const declaredNames = (infra.data.issueTypes || []).map((t) => t.name);

  const client = createClient();
  const liveTypes = await client.projects.getProject({
    projectIdOrKey: PROJECT_KEY,
    expand: 'issueTypes',
  }).then((p) => (p.issueTypes || []).map((it) => it.name));

  const { missing, extra } = diffSets(declaredNames, liveTypes);
  const status = missing.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${declaredNames.length} declared, ${liveTypes.length} live; ` +
    `${missing.length} missing, ${extra.length} extra(live-only)`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: { declared: declaredNames, live: liveTypes, missing, extra },
    evidencePath: EVIDENCE });
});
