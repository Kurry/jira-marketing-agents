// generated_by: scripts/lib/plan-jira.mjs (T-R-INFRA-02)
// NIH-CLASSIFICATION (T-NIH-07): documented-API-gap (partial NIH).
//   Builds a parallel product model of Jira (issue-types/fields/filters) and
//   diffs declared YAML against live REST getters. This name-based set-diff is
//   a hand-rolled reconciler; ACLI `jira field|filter` and golden-template
//   cloning already own create/list of these resources. The read-only diff is
//   the only legitimate gap (no native "plan" command), but the resource model
//   should stay a thin wrapper over native primitives — not grow into a Jira
//   admin replacement. Native owner: ACLI + documented Jira REST getters
//   (matrix rows "Project/work item operations", "Jira admin configuration").
// Jira-domain planner: compare declared infra/jira/*.yaml against live Jira and
// emit a flat change list. Pure read-only — uses Version3Client getters only.
//
// IaC model is CONVERGENT / ADDITIVE, never destructive:
//   declared-and-managed but not live  -> create
//   declared-and-managed and live      -> noop (future: update on attr drift)
//   live but not declared              -> IGNORED (we never propose delete)
//
// Why no deletes: the safety contract forbids destroying Jira config, and live
// Jira is full of built-in/system resources (Summary, Status, Epic, ...) that
// are intentionally undeclared. Deleting "extra" resources would be both unsafe
// and wrong. Resources declared with `managed: false` are baseline/built-in and
// are never created or mutated by apply.
//
// Resources covered (others added as their infra files/declares appear):
//   issue-types  infra/jira/issue-types.yaml  { issueTypes: [{ name, managed }] }
//   fields       infra/jira/fields.yaml       { customFields: [{ id, name }] }
//   filters      infra/jira/filters.yaml      { filters: [{ name, jql }] }

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadInfraYaml } from './verify.mjs';
import { createClient } from './jira.mjs';

/**
 * @param {{repoRoot:string, infraDir:string}} o
 * @returns {Promise<{changes:Array, by_resource:object}>}
 */
export async function planJira({ infraDir }) {
  const jiraDir = join(infraDir, 'jira');
  const changes = [];
  const byResource = {};

  const declaredFiles = ['issue-types', 'fields', 'filters'].filter((r) =>
    existsSync(join(jiraDir, `${r}.yaml`))
  );
  if (declaredFiles.length === 0) {
    return { changes, by_resource: byResource };
  }

  const client = createClient();

  await planResource({
    resource: 'issue-types',
    relPath: 'infra/jira/issue-types.yaml',
    declaredKeys: (data) =>
      (data.issueTypes ?? []).filter((t) => t.managed === true).map((t) => t.name),
    fetchLive: async () => (await client.issueTypes.getIssueAllTypes()).map((t) => t.name),
    changes,
    byResource,
  });

  await planResource({
    resource: 'fields',
    relPath: 'infra/jira/fields.yaml',
    // custom fields are matched by stable id (names are not unique)
    declaredKeys: (data) =>
      (data.customFields ?? []).filter((f) => f.managed !== false).map((f) => f.id),
    fetchLive: async () => (await client.issueFields.getFields()).map((f) => f.id),
    changes,
    byResource,
  });

  await planResource({
    resource: 'filters',
    relPath: 'infra/jira/filters.yaml',
    declaredKeys: (data) =>
      (data.filters ?? []).filter((f) => f.managed !== false).map((f) => f.name),
    fetchLive: async () => {
      const res = await client.filters.getFiltersPaginated({ maxResults: 100 });
      return (res.values ?? []).map((f) => f.name);
    },
    changes,
    byResource,
  });

  return { changes, by_resource: byResource };
}

async function planResource({ resource, relPath, declaredKeys, fetchLive, changes, byResource }) {
  const loaded = loadInfraYaml(relPath);
  if (!loaded.ok) {
    byResource[resource] = { declared: 0, live: null, changes: [], note: loaded.error };
    return;
  }

  const declared = declaredKeys(loaded.data);
  const live = await fetchLive();
  const liveSet = new Set(live);

  // Additive only: create declared-managed resources that don't exist live.
  const local = declared
    .filter((key) => !liveSet.has(key))
    .map((key) => ({ resource, action: 'create', name: key, detail: '' }));

  byResource[resource] = {
    declared: declared.length,
    live: live.length,
    changes: local,
  };
  changes.push(...local);
}
