#!/usr/bin/env node
// generated_by: scripts/infra/render-infra-tree.mjs (T-R-INFRA-01)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (snapshot serializer).
//   Serializes live Jira audit data into the bespoke infra/ YAML product model.
//   The serialization itself is a thin export, but it materializes a parallel
//   model of issue-types/fields/filters/workflow/dashboards that ACLI export +
//   golden-template cloning already capture natively. NOTE: the cloudId here is
//   hard-coded (line ~56) — it should come from infra/instances/staging.yaml,
//   not be duplicated in code. Native owner: ACLI list/export + documented Jira
//   REST getters (matrix "Jira admin configuration"). Keep custom only as an
//   audit-snapshot harness, not the authoritative architecture (see finding #4,
//   "IaC hard reset" reduction).
// Renders the declarative infra/ tree (schemaVersion: 1). issue-types, fields,
// and filters are populated from evidence/audit/jira.json; the workflow is
// populated from evidence/jira-config/statuses.json. Remaining files are
// schemaVersion:1 stubs to be filled in by T-R-INFRA-05 / later tasks.
// Idempotent: re-running reproduces identical YAML. Writes evidence/infra/tree.json.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { envelope, writeEvidence } from '../lib/evidence.mjs';
import { wantsHelp, STAGING_SITE, FORGE_ENV } from '../lib/staging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const INFRA = join(REPO, 'infra');
const JIRA = join(REPO, 'evidence', 'audit', 'jira.json');
const STATUSES = join(REPO, 'evidence', 'jira-config', 'statuses.json');
const OUT = join(REPO, 'evidence', 'infra', 'tree.json');

if (wantsHelp()) {
  console.log('render-infra-tree: build declarative infra/ YAML tree from live audit data');
  process.exit(0);
}

const jira = JSON.parse(readFileSync(JIRA, 'utf8')).data;
const statuses = existsSync(STATUSES) ? JSON.parse(readFileSync(STATUSES, 'utf8')) : [];

const SV = 'schemaVersion: 1\n';
const note = (lines) => lines.map((l) => `# ${l}`).join('\n') + '\n';

// Stable doc helper: schemaVersion header + provenance comment + YAML body.
function doc(provenance, body) {
  return SV + note(provenance) + YAML.stringify(body);
}

// ---- Built-in issue types we do not manage declaratively -------------------
// Next-gen project defaults that ship with every project; the AIGO-specific
// request types are the ones the control plane owns.
const BUILTIN = new Set(['Workstream', 'Task', 'Sub-task', 'Epic', 'Bug', 'Story']);

const files = {};

// infra/instances/staging.yaml
files['infra/instances/staging.yaml'] = doc(
  ['Target instance binding. Scripts refuse to run unless these match.'],
  {
    instance: {
      site: STAGING_SITE,
      forgeEnv: FORGE_ENV,
      projectKey: jira.project?.key ?? 'AIGO',
      projectId: jira.project?.id ?? null,
      projectName: jira.project?.name ?? null,
      cloudId: '76683cc1-6501-400f-8b59-01eaad4418d2',
    },
  }
);

// infra/jira/issue-types.yaml  (populated from jira.json)
files['infra/jira/issue-types.yaml'] = doc(
  [
    'generated_by: scripts/audit/jira-snapshot.mjs (live), rendered by render-infra-tree.mjs',
    `source: ${jira.issue_types_source}`,
    'managed: AIGO request types. builtin: next-gen defaults (declared, not created).',
  ],
  {
    issueTypes: (jira.issue_types ?? []).map((t) => ({
      name: t.name,
      id: t.id,
      subtask: !!t.subtask,
      hierarchyLevel: t.hierarchyLevel,
      managed: !BUILTIN.has(t.name),
    })),
  }
);

// infra/jira/fields.yaml  (populated from jira.json custom_fields)
files['infra/jira/fields.yaml'] = doc(
  ['Custom fields observed live. rendered by render-infra-tree.mjs from jira.json.'],
  {
    customFields: (jira.custom_fields ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      custom: f.custom,
    })),
  }
);

// infra/jira/filters.yaml  (populated from jira.json filters)
files['infra/jira/filters.yaml'] = doc(
  [
    'Saved filters observed live. jql is null where the snapshot lacked read scope;',
    'T-R-INFRA-05 backfills jql from a scoped fetch.',
  ],
  {
    filters: (jira.filters ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      jql: f.jql ?? null,
      owner: f.owner ?? null,
    })),
  }
);

// infra/jira/workflows/aigo-default.yaml  (populated from statuses.json)
files['infra/jira/workflows/aigo-default.yaml'] = doc(
  ['Default workflow statuses observed live, from evidence/jira-config/statuses.json.'],
  {
    workflow: {
      name: 'AIGO Default',
      statuses: statuses.map((s) => ({
        name: s.name,
        id: s.id,
        category: s.category,
      })),
      transitions: [], // T-R-INFRA-05: backfill from live workflow scheme
    },
  }
);

// ---- schemaVersion:1 stubs (to be populated by later tasks) ----------------
files['infra/jira/screens.yaml'] = doc(
  ['STUB. Populate from live screen scheme in T-R-INFRA-05.'],
  { screens: [] }
);

files['infra/jira/dashboards.yaml'] = doc(
  ['STUB. Populate from Jira dashboards REST in T-R-INFRA-05 / verify/dashboards.mjs.'],
  { dashboards: [] }
);

files['infra/jira/seeds/matrix.yaml'] = doc(
  ['STUB. Seed-issue coverage matrix (issue type -> required seed count).'],
  { seeds: [] }
);

for (const rule of [
  'intake-triage',
  'creative-claims',
  'experiment-spec',
  'employer-launch',
  'weekly-readout',
]) {
  files[`infra/jira/automation/${rule}.yaml`] = doc(
    [
      `STUB automation rule: ${rule}.`,
      'Rules are declared disabled; enabled only after a captured audit-log run.',
    ],
    { rule: { name: rule, enabled: false, trigger: null, conditions: [], actions: [] } }
  );
}

files['infra/rovo/agents.yaml'] = doc(
  ['STUB. Mirror of manifest.yml rovo:agent entries; reconciled by verify/rovo-agents.mjs.'],
  { agents: [] }
);

// ---- write tree ------------------------------------------------------------
const written = [];
for (const [rel, content] of Object.entries(files)) {
  const abs = join(REPO, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  written.push(rel);
}
written.sort();

const populated = written.filter((f) =>
  ['issue-types.yaml', 'fields.yaml', 'filters.yaml', 'aigo-default.yaml', 'staging.yaml'].some(
    (n) => f.endsWith(n)
  )
);
const stubs = written.filter((f) => !populated.includes(f));

const summary =
  `rendered ${written.length} infra files: ${populated.length} populated from live data, ` +
  `${stubs.length} schemaVersion:1 stubs`;

writeEvidence(
  OUT,
  envelope({
    generatedBy: 'scripts/infra/render-infra-tree.mjs',
    exitCode: 0,
    summary,
    data: {
      files: written,
      populated,
      stubs,
      counts: {
        total: written.length,
        issue_types: (jira.issue_types ?? []).length,
        custom_fields: (jira.custom_fields ?? []).length,
        filters: (jira.filters ?? []).length,
        statuses: statuses.length,
      },
    },
  })
);

console.log(summary);
console.log('wrote evidence/infra/tree.json');
