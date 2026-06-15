---
name: forge-workflow-modules
description: Forge Jira workflow extensions — jira:workflowValidator, jira:workflowCondition, and jira:workflowPostFunction modules, their Jira-expression vs lambda-function forms, Custom UI create/edit/view config, the workflowRules.onConfigure bridge, and how they attach to company- and team-managed workflow transitions. Use when adding a Forge validator/condition/post function to a Jira workflow, configuring transition rules, or wiring workflow rule config pages.
---

# Forge Workflow Modules (Preview)

Forge can extend Jira workflow **transitions** with three module types. All three are **Preview** features (stable, but shorter deprecation windows). They attach to transitions via advanced workflow configuration; by default they apply to **company-managed** projects unless `projectTypes` opts into team-managed.

| Module | Runs | Purpose |
|---|---|---|
| `jira:workflowValidator` | before transition completes | Block the transition if input is invalid; show an error |
| `jira:workflowCondition` | before transition is offered | Hide/disallow the transition unless a condition holds |
| `jira:workflowPostFunction` | after transition completes | Side effects: update fields, add comments, call APIs |

Two implementation styles for validators/conditions: a **Jira expression** (evaluated in-product, no function) or a **lambda function** (your Forge function). Post functions are function/endpoint only.

## Validator — Jira expression

```yaml
modules:
  jira:workflowValidator:
    - key: assigned-validator
      name: Work item is assigned
      description: Allows the transition only when the work item has an assignee.
      expression: issue.assignee != null
      errorMessage: "Assign the task to someone, then try again."
      projectTypes: ['company-managed', 'team-managed']
```

Context vars in expressions: `user`, `issue` (includes transition-screen changes), `originalIssue` (pre-change), `project`, `transition`, `workflow`, `config` (from the config page). If the expression returns a string it becomes the error message. A failed expression emits an `avi:jira:failed:expression` event (subscribe via a trigger; needs `manage:jira-configuration`).

## Validator — lambda function

```yaml
modules:
  jira:workflowValidator:
    - key: pro-only-validator
      name: Project is PRO
      description: Allow the transition only for PRO project items.
      function: validate
  function:
    - key: validate
      handler: status.validate
```

```js
export const validate = (args) => {
  // args = { issue:{key}, configuration, transition:{from,to,modifiedFields} }
  return { result: args.issue.key.startsWith('PRO'), errorMessage: 'Only PRO project can use this flow' };
};
```

`modifiedFields` (the changed transition-screen values) is only attached if the app has `read:jira-work`. User fields return only `accountId`.

## Post function

```yaml
modules:
  jira:workflowPostFunction:
    - key: my-postfunction
      name: Post-transition update
      description: Runs after the transition completes.
      function: postfunction
      projectTypes: ['company-managed', 'team-managed']
  function:
    - key: my-postfunction
      handler: index.postfunction
permissions:
  scopes:
    - manage:jira-configuration
    - read:jira-work
```

```js
import api, { route } from '@forge/api';
export const postfunction = async (event) => {
  // event = run-post-function payload: issue, optional comment, changelog, configuration
  if (event.comment) {
    const r = await api.asApp().requestJira(
      route`/rest/api/latest/issue/${event.issue.id}/comment/${event.comment.id}`);
    // ... use the comment ...
  }
};
```

Post functions fetch extra data via the Product Fetch API. Execution order of multiple post functions on one transition is **not guaranteed**. Request a retry by returning an `InvocationError` from `@forge/events` (retries work like product-event retries).

## Custom UI config (create / edit / view)

Validators, conditions, and post functions can carry a configurable form. Declare `create`, `edit`, `view` Custom UI resources (UI Kit is **not** supported for this config). Persist config with the Jira bridge:

```js
import { workflowRules } from '@forge/jira-bridge';
await workflowRules.onConfigure(async () => JSON.stringify({ key: 'value' }));
```

```js
import { view } from '@forge/bridge';
const ctx = await view.getContext();
const config = ctx.extension.validatorConfig;     // validators
// ctx.extension.postFunctionConfig for post functions
const isNewEditor = ctx.extension.isNewEditor || false;
```

- Saved config appears to expression validators as the `config` context var (or `configuration` for lambdas). A returned `expression` key dynamically overrides the manifest expression.
- New workflow editor: detect via `extension.isNewEditor`; config capped at 32 KB (post-function config 100 KB in old editor). `transitionContext` describes from/to statuses.
- `configurationDescription: { expression }` renders a dynamic one-line summary in the editor.

## Common workflows

1. Pick the module: validator (block + message), condition (hide transition), or post function (side effect).
2. Choose expression (simple, no code) or lambda (logic, external calls).
3. Declare it; set `projectTypes` if team-managed should see it.
4. Add scopes (`manage:jira-configuration`, plus `read:jira-work` for `modifiedFields`/post-function data).
5. Optional: add `create`/`edit`/`view` resources and wire `workflowRules.onConfigure`.
6. `forge deploy` -> `forge install`, then attach the rule to a transition in the workflow editor and test the transition.

## Gotchas

- Preview status — verify the module still exists/behaves before production use.
- Without `read:jira-work`, lambda validators get no `modifiedFields`.
- Restricted-visibility comments may not be fetchable in post functions (known issue FRGE-709).
- UI Kit is unsupported for rule config — use Custom UI.

## Safety

Post functions and configured side effects mutate Jira data; validators/conditions gate user actions. Default to least-privilege scopes, prefer expression validators for read-only checks, and treat new write scopes or production rule rollouts as changes requiring explicit human approval and admin re-consent.

## References

- Workflow validator: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-validator/
- Workflow condition: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-condition/
- Workflow post function: https://developer.atlassian.com/platform/forge/manifest-reference/modules/jira-workflow-post-function/
- Jira modules index: https://developer.atlassian.com/platform/forge/manifest-reference/modules/index-jira/
- Jira expressions: https://developer.atlassian.com/cloud/jira/platform/jira-expressions/
