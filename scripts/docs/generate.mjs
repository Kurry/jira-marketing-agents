#!/usr/bin/env node
// generated_by: scripts/docs/generate.mjs (T-R-DOC-01)
// Regenerate state-derived regions of docs/ from infra/ YAML.
//
// Each target doc carries a "<!-- generated_by: scripts/docs/generate.mjs -->"
// header and one or more regions delimited by:
//   <!-- BEGIN generated:<key> -->
//   ...generated markdown...
//   <!-- END generated:<key> -->
// Only the content between those markers is rewritten; authored prose outside
// the markers is preserved. This keeps docs IaC-faithful for live IDs/counts
// while retaining hand-written narrative.
//
// Usage:
//   node scripts/docs/generate.mjs            # rewrite docs in place
//   node scripts/docs/generate.mjs --check    # CI: exit 3 if docs diverge from infra/
//   node scripts/docs/generate.mjs --dry-run  # print what would change, write nothing
//   node scripts/docs/generate.mjs --help

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { envelope, writeEvidence } from '../lib/evidence.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const GENERATED_BY = 'scripts/docs/generate.mjs';
const HEADER = `<!-- generated_by: ${GENERATED_BY} -->`;

function p(...parts) {
  return resolve(REPO_ROOT, ...parts);
}

function readYaml(relPath) {
  const abs = p(relPath);
  if (!existsSync(abs)) {
    throw new Error(`missing infra file: ${relPath}`);
  }
  return parse(readFileSync(abs, 'utf8'));
}

function loadInfra() {
  const instance = readYaml('infra/instances/staging.yaml').instance;
  const issueTypes = readYaml('infra/jira/issue-types.yaml').issueTypes ?? [];
  const customFields = readYaml('infra/jira/fields.yaml').customFields ?? [];
  const filters = readYaml('infra/jira/filters.yaml').filters ?? [];
  const workflow = readYaml('infra/jira/workflows/aigo-default.yaml').workflow ?? {};
  const dashboards = readYaml('infra/jira/dashboards.yaml').dashboards ?? [];
  const seeds = readYaml('infra/jira/seeds/matrix.yaml').seeds ?? [];

  const automationFiles = [
    'intake-triage',
    'creative-claims',
    'experiment-spec',
    'employer-launch',
    'weekly-readout',
  ];
  const automation = automationFiles
    .map((f) => `infra/jira/automation/${f}.yaml`)
    .filter((rel) => existsSync(p(rel)))
    .map((rel) => readYaml(rel).rule)
    .filter(Boolean);

  return { instance, issueTypes, customFields, filters, workflow, dashboards, seeds, automation };
}

// Canonical (proposed) counts from specs/v2/*. These do NOT match live infra/
// (the v2 model is a not-yet-accepted re-homing proposal); we surface the
// delta so docs never silently restate a stale number. Live infra/ wins.
function canonicalCounts() {
  const re = (text, rx) => {
    const m = text.match(rx);
    return m ? Number(m[1]) : null;
  };
  const it = readFileSync(p('specs/v2/issue-types.md'), 'utf8');
  const cf = readFileSync(p('specs/v2/custom-fields.md'), 'utf8');
  const wf = readFileSync(p('specs/v2/workflows.md'), 'utf8');
  return {
    issueTypes: re(it, /\*\*Canonical:\s*(\d+)\s*issue types/i),
    fieldEntities: re(cf, /\*\*Canonical:\s*(\d+)\s*field entities/i),
    statuses: re(wf, /\*\*Canonical:\s*(\d+)\s*statuses/i),
  };
}

/** Single source for every entity count, derived from live infra/ YAML. */
function counts(infra) {
  return {
    managedIssueTypes: infra.issueTypes.filter((t) => t.managed).length,
    totalIssueTypes: infra.issueTypes.length,
    customFields: infra.customFields.length,
    filters: infra.filters.length,
    workflowStatuses: (infra.workflow.statuses ?? []).length,
    dashboards: infra.dashboards.length,
    seeds: infra.seeds.length,
    automation: infra.automation.length,
  };
}

// --- region helpers -------------------------------------------------------

function regionRe(key) {
  return new RegExp(
    `(<!-- BEGIN generated:${key} -->\\n)([\\s\\S]*?)(<!-- END generated:${key} -->)`,
  );
}

/** Replace the body of a sentinel region; throws if the markers are absent. */
function fillRegion(text, key, body) {
  const re = regionRe(key);
  if (!re.test(text)) {
    throw new Error(`doc is missing region markers for "${key}"`);
  }
  return text.replace(re, `$1${body}\n$3`);
}

// Inline count tokens: `<!--count:key-->N<!--/count-->`. The number between the
// markers is rewritten from live infra/; the markers survive so prose like
// "the 8 custom fields" stays a single authored sentence with one live number.
function fillInlineCounts(text, infra) {
  const c = counts(infra);
  return text.replace(
    /(<!--count:(\w+)-->)[^<]*(<!--\/count-->)/g,
    (whole, open, key, close) => {
      if (!(key in c)) {
        throw new Error(`unknown inline count key "${key}"`);
      }
      return `${open}${c[key]}${close}`;
    },
  );
}

function ensureHeader(text) {
  if (text.startsWith(HEADER)) return text;
  // Drop a stale header line if present, then prepend.
  const stripped = text.replace(/^<!-- generated_by:.*-->\n/, '');
  return `${HEADER}\n${stripped}`;
}

// --- region renderers -----------------------------------------------------

function renderIssueTypes(infra) {
  const managed = infra.issueTypes.filter((t) => t.managed);
  const ids = managed.map((t) => Number(t.id)).filter((n) => Number.isFinite(n));
  const range = ids.length ? `${Math.min(...ids)}–${Math.max(...ids)}` : 'n/a';
  const rows = managed
    .map((t) => `| ${t.name} | ${t.id} |`)
    .join('\n');
  return [
    `${managed.length} managed AIGO issue types (IDs ${range}):`,
    '',
    '| Issue type | ID |',
    '| --- | --- |',
    rows,
  ].join('\n');
}

function renderFields(infra) {
  const rows = infra.customFields
    .map((f) => `| ${f.name} | ${f.id} | ${f.type} |`)
    .join('\n');
  return [
    `${infra.customFields.length} custom fields:`,
    '',
    '| Field | ID | Type |',
    '| --- | --- | --- |',
    rows,
  ].join('\n');
}

function renderFilters(infra) {
  const oneLine = (jql) => (jql == null ? '_(not captured)_' : `\`${String(jql).replace(/\s+/g, ' ').trim()}\``);
  const rows = infra.filters
    .map((f) => `| ${f.name} | ${f.id} | ${oneLine(f.jql)} |`)
    .join('\n');
  return [
    `${infra.filters.length} saved JQL filters:`,
    '',
    '| Filter | ID | JQL |',
    '| --- | --- | --- |',
    rows,
  ].join('\n');
}

function renderWorkflow(infra) {
  const statuses = infra.workflow.statuses ?? [];
  const hasIds = statuses.some((s) => s.id != null);
  const rows = statuses
    .map((s) =>
      hasIds ? `| ${s.name} | ${s.id ?? '—'} | ${s.category} |` : `| ${s.name} | ${s.category} |`,
    )
    .join('\n');
  const head = hasIds ? '| Status | ID | Category |\n| --- | --- | --- |' : '| Status | Category |\n| --- | --- |';
  return [
    `Workflow "${infra.workflow.name}" — ${statuses.length} statuses:`,
    '',
    head,
    rows,
  ].join('\n');
}

function renderAutomation(infra) {
  if (!infra.automation.length) return 'No automation rules declared.';
  const rows = infra.automation
    .map((r) => `| ${r.name} | ${r.enabled ? 'enabled' : 'disabled'} |`)
    .join('\n');
  return [
    `${infra.automation.length} automation rules (imported disabled by policy):`,
    '',
    '| Rule | State |',
    '| --- | --- |',
    rows,
  ].join('\n');
}

function renderStagingState(infra) {
  const managed = infra.issueTypes.filter((t) => t.managed).length;
  const seedCount = infra.seeds.length;
  return [
    `Verified staging state for \`${infra.instance.site}\` (project ` +
      `\`${infra.instance.projectKey}\`, id ${infra.instance.projectId}, ` +
      `cloud ${infra.instance.cloudId}):`,
    '',
    '| Resource | Count | Reconcile command |',
    '| --- | --- | --- |',
    `| Managed issue types | ${managed} | \`npm run infra:apply\` |`,
    `| Custom fields | ${infra.customFields.length} | \`npm run infra:apply\` |`,
    `| JQL saved filters | ${infra.filters.length} | \`npm run infra:apply\` |`,
    `| Workflow statuses | ${(infra.workflow.statuses ?? []).length} | \`npm run infra:apply\` |`,
    `| Dashboards | ${infra.dashboards.length} | \`npm run infra:apply\` |`,
    `| Seed issues | ${seedCount} | \`npm run infra:apply\` |`,
    `| Automation rules | ${infra.automation.length} | \`npm run infra:apply\` |`,
  ].join('\n');
}

function renderCounts(infra) {
  const c = counts(infra);
  return [
    '| Resource | Live count | Source |',
    '| --- | --- | --- |',
    `| Managed AIGO issue types | ${c.managedIssueTypes} | \`infra/jira/issue-types.yaml\` |`,
    `| Custom fields | ${c.customFields} | \`infra/jira/fields.yaml\` |`,
    `| Workflow statuses | ${c.workflowStatuses} | \`infra/jira/workflows/aigo-default.yaml\` |`,
    `| JQL saved filters | ${c.filters} | \`infra/jira/filters.yaml\` |`,
    `| Dashboards | ${c.dashboards} | \`infra/jira/dashboards.yaml\` |`,
    `| Seed issues | ${c.seeds} | \`infra/jira/seeds/matrix.yaml\` |`,
    `| Automation rules | ${c.automation} | \`infra/jira/automation/*.yaml\` |`,
  ].join('\n');
}

// Map each target doc to the regions it owns.
const DOC_REGIONS = {
  'docs/PORTABILITY.md': {
    'staging-state': renderStagingState,
    'issue-types': renderIssueTypes,
    'fields': renderFields,
    'filters': renderFilters,
  },
  'docs/MVP_RUNBOOK.md': {
    'counts': renderCounts,
    'issue-types': renderIssueTypes,
    'workflow': renderWorkflow,
    'automation': renderAutomation,
  },
  'docs/INTEGRATION.md': {
    'issue-types': renderIssueTypes,
    'fields': renderFields,
    'filters': renderFilters,
    'workflow': renderWorkflow,
    'automation': renderAutomation,
  },
};

function regenerateDoc(relPath, regions, infra) {
  const abs = p(relPath);
  const before = readFileSync(abs, 'utf8');
  let after = ensureHeader(before);
  for (const [key, render] of Object.entries(regions)) {
    after = fillRegion(after, key, render(infra));
  }
  after = fillInlineCounts(after, infra);
  return { relPath, before, after, changed: before !== after };
}

// Docs that carry only inline count tokens (no full sentinel regions and no
// generated_by header — they are authored prose with a few live numbers).
const INLINE_ONLY_DOCS = ['docs/OPERATOR_PROMPTS.md', 'README.md', 'STATUS.md', 'docs/MVP_READINESS.md'];

function regenerateInline(relPath, infra) {
  const abs = p(relPath);
  const before = readFileSync(abs, 'utf8');
  const after = fillInlineCounts(before, infra);
  return { relPath, before, after, changed: before !== after };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      [
        'scripts/docs/generate.mjs — regenerate state-derived doc regions from infra/',
        '',
        '  (no args)   rewrite docs in place',
        '  --check     exit 3 if any doc diverges from infra/ (CI gate)',
        '  --dry-run   report changes, write nothing',
        '  --help      this message',
      ].join('\n'),
    );
    return 0;
  }
  const check = args.includes('--check');
  const dryRun = args.includes('--dry-run');

  const infra = loadInfra();
  const results = [];
  const errors = [];

  for (const [relPath, regions] of Object.entries(DOC_REGIONS)) {
    try {
      const r = regenerateDoc(relPath, regions, infra);
      results.push(r);
    } catch (e) {
      errors.push({ relPath, error: e.message });
    }
  }

  for (const relPath of INLINE_ONLY_DOCS) {
    try {
      results.push(regenerateInline(relPath, infra));
    } catch (e) {
      errors.push({ relPath, error: e.message });
    }
  }

  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e.relPath}: ${e.error}`);
    writeEvidenceFile(results, errors, 2);
    return 2;
  }

  const changed = results.filter((r) => r.changed);

  if (check) {
    if (changed.length) {
      for (const r of changed) {
        console.error(`DRIFT ${r.relPath}: docs diverge from infra/ — run \`node ${GENERATED_BY}\``);
      }
      writeEvidenceFile(results, errors, 3);
      return 3;
    }
    console.log('docs in sync with infra/ state');
    writeEvidenceFile(results, errors, 0);
    return 0;
  }

  if (!dryRun) {
    for (const r of changed) writeFileSync(p(r.relPath), r.after);
  }
  for (const r of results) {
    console.log(`${r.changed ? (dryRun ? 'WOULD WRITE' : 'WROTE') : 'unchanged'} ${r.relPath}`);
  }
  writeEvidenceFile(results, errors, 0);
  return 0;
}

function writeEvidenceFile(results, errors, exitCode) {
  const env = envelope({
    generatedBy: GENERATED_BY,
    exitCode,
    summary: `regenerated ${results.length} docs from infra/ (${errors.length} errors)`,
    data: {
      files: results.map((r) => ({ path: r.relPath, changed: r.changed })),
      errors,
    },
  });
  writeEvidence(p('evidence/docs/generate.json'), env);
}

process.exit(main());
