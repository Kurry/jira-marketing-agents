// generated_by: scripts/lib/apply-jira.mjs (T-R-INFRA-03)
// NIH-CLASSIFICATION (T-NIH-07): native-wrapper (should wrap ACLI, not SDK).
//   Creates issue-types/fields/filters directly via the jira.js SDK. ACLI
//   (`acli jira field create`, `acli jira filter create`, work-item commands)
//   and golden-template cloning are the native owners of these create paths
//   (matrix row "Project/work item operations"). Re-implementing create via the
//   SDK duplicates ACLI; field/filter creates are even left "(not yet wired)"
//   — exactly the work ACLI already does. Reduction: delegate creates to ACLI
//   commands or template clone; keep custom code only for the additive-only
//   safety gate. See specs/atlassian-native-tools.md finding #5.
// Apply a single ADDITIVE Jira change (create only) via the jira.js SDK.
// Called by scripts/infra/apply.mjs for each plan delta entry.
//
// Safety: only `create` actions are permitted. Any other action throws — apply
// never deletes or destructively mutates Jira config. assertStagingOnly() is
// enforced again here as defense in depth.

import { assertStagingOnly } from './staging.mjs';
import { createClient } from './jira.mjs';

/**
 * @param {{resource:string, action:string, name:string, detail?:string}} change
 * @returns {Promise<object>} provider response / created id
 */
export async function applyJiraChange(change) {
  if (change.action !== 'create') {
    throw new Error(
      `apply-jira: refusing non-create action "${change.action}" on ${change.resource}/${change.name}`
    );
  }
  assertStagingOnly();
  const client = createClient();

  switch (change.resource) {
    case 'issue-types':
      return client.issueTypes.createIssueType({ name: change.name, type: 'standard' });

    case 'filters':
      // A filter needs a JQL; the planner only emits create for declared filters,
      // so the declared jql must be threaded through change.detail by the planner
      // before this path is exercised. Until then, fail loudly rather than create
      // a malformed filter.
      throw new Error(
        `apply-jira: filter create for "${change.name}" needs declared jql (not yet wired)`
      );

    case 'fields':
      throw new Error(
        `apply-jira: custom field create for "${change.name}" needs type/searcher spec (not yet wired)`
      );

    default:
      throw new Error(`apply-jira: unknown resource "${change.resource}"`);
  }
}
