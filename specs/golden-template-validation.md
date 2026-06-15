# Golden Template Validation

Status: T-NIH-04 live validation pending.

The scalable Jira configuration path is a company-managed golden template
project plus per-instance config. This repo already supports the clone path via
`templateProjectKey` in `instances/*.json` and `scripts/provision-instance.cjs`,
but no template project key is configured in the repo yet.

## Required Evidence

Record these values before marking T-NIH-04 complete:

| Evidence | Required value |
| --- | --- |
| Template project key | Company-managed Jira project used as the source template. |
| Disposable clone key | Temporary target project key. |
| Clone command | `AIGO_INSTANCE_CONFIG=instances/<clone>.json npm run provision:instance -- --project` with `templateProjectKey` set. |
| Readiness command | `AIGO_INSTANCE_CONFIG=instances/<clone>.json node scripts/aigo-project-readiness.cjs`. |
| Readiness result | Passing result for issue types, statuses, screens/fields, board columns, queues, filters, dashboards, seeds, and Automation placeholders. |
| Mutation comparison | Count of custom REST/ACLI mutations required after clone versus fresh provisioning. |
| Cleanup command | Project archive/delete path for the disposable clone. |

## Clone Config Shape

```json
{
  "site": "tenant.atlassian.net",
  "forgeEnvironment": "development",
  "projectKey": "AIGOTEST",
  "projectName": "AI Growth Ops Disposable Template Test",
  "projectDescription": "Disposable validation clone for T-NIH-04.",
  "templateProjectKey": "AIGOTPL",
  "cloudId": "<tenant-cloud-id>",
  "projectId": "<filled-after-clone>",
  "actorAccountId": "<automation-actor-account-id>"
}
```

## Validation Steps

1. Create or identify the company-managed golden template project.
2. Copy `instances/aigo.example.json` to `instances/<disposable>.json` and set
   `templateProjectKey` to the template key.
3. Run `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run provision:instance -- --project --dry-run`.
4. Run the same command without `--dry-run` only against the disposable target.
5. Backfill the cloned `projectId` into the instance config.
6. Run readiness and verification:
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json node scripts/aigo-project-readiness.cjs`
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run provision:automation -- --dry-run`
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run test:smoke:jira`
7. Record missing resources as follow-up tasks instead of hiding them in custom
   mutation scripts.

## Current Result

Not complete. `acli jira project create --help` confirms `--from-project`
cloning only supports company-managed source projects. `acli jira project view
--key AIGO --json` reports the current AIGO project as `simplified: true` and
`style: next-gen`, so it cannot serve as the golden clone source. Evidence is
recorded in `evidence/nih/golden-template-validation.json`.
