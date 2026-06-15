#!/usr/bin/env node
// generated_by: scripts/verify/jira-fields.mjs (T-R-P5)
// Row VM-JIRA-FIELDS. Diffs infra/jira/fields.yaml against live custom fields.
// Declared fields are matched by name (the customfield_ id is instance-specific
// and assigned by Jira, so name is the stable key). Green when every declared
// field exists live.
//
// T-NIH-07 classification: native-wrapper. Native owner (matrix rows
// "Project/work item operations" / "Jira admin configuration"): documented Jira
// Cloud REST v3 GET /rest/api/3/field (via the jira.js issueFields.getFields
// SDK call) — equivalently `acli jira field list`. This script does not
// re-implement field discovery; it diffs the documented native listing against
// infra/jira/fields.yaml. The diff/declaration logic is the Twin-specific IaC
// layer the matrix says should stay custom.

import { createClient } from '../lib/jira.mjs';
import { loadInfraYaml, diffSets, finish, guard } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const GENERATED_BY = 'scripts/verify/jira-fields.mjs';
const ROW = 'VM-JIRA-FIELDS';
const EVIDENCE = 'evidence/verify/jira-fields.json';

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: diff infra/jira/fields.yaml vs live custom fields (by name). ` +
    `exit 0 green / 2 red / 3 no-auth`);
  process.exit(0);
}

guard(GENERATED_BY, ROW, async () => {
  const infra = loadInfraYaml('infra/jira/fields.yaml');
  if (!infra.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: infra.error, data: { error: infra.error }, evidencePath: EVIDENCE });
    return;
  }
  const declaredNames = (infra.data.customFields || []).map((f) => f.name);

  const client = createClient();
  const allFields = await client.issueFields.getFields();
  const liveCustomNames = allFields
    .filter((f) => f.custom || (typeof f.id === 'string' && f.id.startsWith('customfield_')))
    .map((f) => f.name);

  const { missing } = diffSets(declaredNames, liveCustomNames);
  const status = missing.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${declaredNames.length} declared, ${liveCustomNames.length} live custom; ` +
    `${missing.length} missing`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: { declared: declaredNames, live_custom: liveCustomNames, missing },
    evidencePath: EVIDENCE });
});
