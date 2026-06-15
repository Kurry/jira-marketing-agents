#!/usr/bin/env node
// generated_by: scripts/verify/jira-workflow.mjs (T-R-P5)
// Row VM-JIRA-WORKFLOW. Diffs the statuses declared in
// infra/jira/workflows/aigo-default.yaml against the statuses actually
// reachable in the AIGO project. Team-managed projects don't expose a named
// workflow scheme via REST, so we verify the status set via
// /project/{key}/statuses (statuses grouped per issue type) and union them.

import { createClient } from '../lib/jira.mjs';
import { loadInfraYaml, diffSets, finish, guard } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';

const GENERATED_BY = 'scripts/verify/jira-workflow.mjs';
const ROW = 'VM-JIRA-WORKFLOW';
const EVIDENCE = 'evidence/verify/jira-workflow.json';
const PROJECT_KEY = 'AIGO';

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: diff workflow statuses in infra/jira/workflows/aigo-default.yaml ` +
    `vs live AIGO project statuses. exit 0 green / 2 red / 3 no-auth`);
  process.exit(0);
}

guard(GENERATED_BY, ROW, async () => {
  const infra = loadInfraYaml('infra/jira/workflows/aigo-default.yaml');
  if (!infra.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: infra.error, data: { error: infra.error }, evidencePath: EVIDENCE });
    return;
  }
  // Declared status names live under `workflow.statuses` in the rendered tree.
  const declaredStatuses = infra.data.workflow?.statuses || infra.data.statuses || [];
  const declaredNames = declaredStatuses.map(
    (s) => s.name || String(s.key || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  const client = createClient();
  // getAllStatuses returns statuses grouped per issue type; union the names.
  const perType = await client.projects.getAllStatuses({ projectIdOrKey: PROJECT_KEY });
  const liveNames = [
    ...new Set(perType.flatMap((g) => (g.statuses || []).map((s) => s.name))),
  ];

  const { missing, extra } = diffSets(declaredNames, liveNames);
  const status = missing.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${declaredNames.length} declared statuses, ${liveNames.length} live; ` +
    `${missing.length} missing, ${extra.length} extra(live-only)`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: { declared: declaredNames, live: liveNames, missing, extra },
    evidencePath: EVIDENCE });
});
