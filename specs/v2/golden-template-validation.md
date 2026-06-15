# Golden Template Validation (v2)

Date: 2026-06-15
Status: Proposal. T-NIH-04 bounded spike, re-aligned to the native-first
direction. Live validation pending (blocked — see Current result). Does not
supersede current specs until accepted by architect + safety reviewer.
Supersedes: `specs/golden-template-validation.md`

This is the **bounded spike that validates the scalable Jira-config path**:
clone a company-managed *golden template* project into a disposable target and
prove the clone reaches readiness with **fewer custom REST/ACLI mutations** than
a fresh provisioning run. It is the precondition for declaring the template the
source of truth ([nih-roadmap.md](nih-roadmap.md) **T-NIH-09**) and depends on the
ACLI inventory (**T-NIH-03**, done in `docs/PORTABILITY.md`). It closes
**T-NIH-04**.

Native owner: golden company-managed template project + ACLI
`jira project/workitem/field/filter/dashboard` + documented Jira REST for gaps
(Jira admin configuration + Project/work item operations matrix rows). The
canonical entities the clone must carry are defined in
[issue-types.md](issue-types.md), [custom-fields.md](custom-fields.md), and
[workflows.md](workflows.md) — referenced here, never restated.

## Why this comes before any converge engine

Per [_CONVENTIONS.md](_CONVENTIONS.md) §3 (NIH theme #2/#3) and
[nih-roadmap.md](nih-roadmap.md), **no per-resource converge engine is built
before T-NIH-03 and T-NIH-04 both complete.** This spike is the gate: until a
clone-diff is proven against a disposable target, the hand-built provisioning
scripts cannot be demoted to clone-diff fallbacks (T-NIH-09) and `infra/` stays a
read-only audit harness (T-NIH-10). This is a re-alignment of *who owns config*,
not a new product.

## Required evidence

Record these values in `evidence/nih/golden-template-validation.json` before
marking T-NIH-04 complete:

| Evidence | Required value |
| --- | --- |
| Template project key | Company-managed Jira project used as the source template. |
| Disposable clone key | Temporary target project key. |
| Clone command | `AIGO_INSTANCE_CONFIG=instances/<clone>.json npm run provision:instance -- --project` with `templateProjectKey` set. |
| Readiness command | `AIGO_INSTANCE_CONFIG=instances/<clone>.json node scripts/aigo-project-readiness.cjs`. |
| Readiness result | Pass for the canonical issue types, statuses, screens/fields, board columns, queues, filters, dashboards, seed coverage, and Automation placeholders (per [issue-types.md](issue-types.md) / [custom-fields.md](custom-fields.md) / [workflows.md](workflows.md)). |
| Source attribution | For each resource: came from the template clone, ACLI, Jira REST, UI/manual setup, or a script. |
| Mutation comparison | Count of custom REST/ACLI mutations after clone **vs** fresh provisioning (clone must be lower). |
| Cleanup command | Project archive/delete path for the disposable clone (destructive — operator-approved). |

## Clone config shape

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

## Validation steps

1. Create or identify the **company-managed** golden template project (must be
   company-managed, not team-managed/next-gen — see Current result).
2. Copy `instances/aigo.example.json` to `instances/<disposable>.json` and set
   `templateProjectKey` to the template key.
3. Dry run: `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run provision:instance -- --project --dry-run`.
4. Real clone (disposable target only): the same command without `--dry-run`.
5. Backfill the cloned `projectId` into the instance config.
6. Run readiness + verification:
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json node scripts/aigo-project-readiness.cjs`
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run provision:automation -- --dry-run`
   - `AIGO_INSTANCE_CONFIG=instances/<disposable>.json npm run test:smoke:jira`
7. Record every missing/uncovered resource as a **follow-up task**, not a hidden
   custom-mutation script (this is how NIH theme #2 is held in check).
8. Run the cleanup command to archive/delete the disposable clone (**destructive
   — requires explicit human operator approval**).

## Auth and endpoint constraints (ties to T-NIH-08)

The clone/readiness/verification commands must authenticate with the documented
`ATLASSIAN_TOKEN` env path and must **not** depend on
`gateway/api/automation/internal-api`, `rest/cb-automation`, or the
reverse-engineered ACLI macOS-keychain credential blob. The endpoint/auth purge
(**T-NIH-08**) precedes or runs in-flight with this work; T-NIH-09 (template as
source) must not re-introduce any internal path.

## Current result

**Not complete — blocked.** `acli jira project create --help` confirms
`--from-project` cloning supports **company-managed source projects only**.
`acli jira project view --key AIGO --json` reports the live AIGO project as
`simplified: true` / `style: next-gen`, so AIGO **cannot** be the golden clone
source. The blocker is recorded in
`evidence/nih/golden-template-validation.json`.

**Unblock path:** stand up a company-managed golden template project (Wave 1 in
[nih-roadmap.md](nih-roadmap.md)) carrying the canonical issue types, statuses,
screens/fields, board, queues, filters, dashboards, seed coverage, and Automation
placeholders, then run the steps above against a disposable clone. Only after a
passing clone-diff does T-NIH-09 proceed.

## Notes / merges / drops

- No content dropped from `specs/golden-template-validation.md`: the evidence
  table, clone config, validation steps, and current-result blocker are all
  preserved.
- Added: the "why before any converge engine" gate, source-attribution row in the
  evidence table, the destructive-cleanup operator-approval label, the T-NIH-08
  auth/endpoint constraint, and the explicit unblock path feeding
  [nih-roadmap.md](nih-roadmap.md) Waves 1–2.
