# Declarative State — Read-Only Audit Representation

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment to the Atlassian-native /
NIH-reduction direction; not authoritative until the architect + safety reviewer
accept it.
Supersedes: `specs/agent-team/DECLARATIVE_STATE.md`

## What `infra/` is — and is not

`infra/` is a **read-only audit representation** of Jira / Forge / Rovo
configuration that is owned elsewhere. It is **not a control plane**. Nothing
under `infra/` mutates a live site. Per `atlassian-native-tools.md` finding #4
and theme #3 of [`nih-review-2026-06-15.md`](../../nih-review-2026-06-15.md), the
prior "Terraform-equivalent reconciler" framing is dropped: there is no
per-resource converge engine. Mutations are performed by native tooling — ACLI,
a golden company-managed template-project clone, Jira Automation
import/export, and Forge — and `infra/` merely **records and diffs** what those
tools produced.

The decision rule (`_CONVENTIONS.md` §1): use the Atlassian-native owner for
each concern; `infra/` exists only because the repo needs a versioned,
machine-readable snapshot to diff against in CI. That is evidence generation —
an allowed reason to keep custom code — not a parallel product model.

| Concern | Native owner (mutates) | `infra/` role (audit only) |
| --- | --- | --- |
| Issue types, fields, filters, dashboards, work items | ACLI `jira *` + documented Jira REST GETs | Snapshot + diff of native output |
| Screens, screen schemes, workflows, workflow schemes | Golden company-managed template-project clone (see [design](../design.md), [`golden-template-validation.md`](../golden-template-validation.md)) | Asserted shape after clone; never field-by-field rebuild |
| Automation rules | Native Jira Automation import/export or documented public API | Rendered JSON template (disabled) + audit-log capture |
| Rovo agents | Forge `manifest.yml` (already IaC) | Derived view only; never a second catalog |
| Policies / prompts | Repo files versioned with code | Hash provenance |

The canonical catalogs of issue types, custom fields, and workflows — names,
counts, and the native owner of each entity — are defined ONLY in
[`issue-types.md`](../issue-types.md), [`custom-fields.md`](../custom-fields.md),
and [`workflows.md`](../workflows.md). This document references those catalogs
and never restates their counts.

## Tree layout

`infra/` files are version-controlled YAML/JSON snapshots produced from native
output. No file is site-specific beyond variables resolved from an instance
config at read time.

```
infra/
  instances/
    staging.yaml                # site + project + actor + env bindings (placeholders)
  jira/
    issue-types.yaml            # snapshot of the canonical catalog (issue-types.md)
    fields.yaml                 # snapshot of custom fields + schemas (custom-fields.md)
    screens.yaml                # observed screen definitions, field ordering
    screen-schemes.yaml         # observed screen -> issue type bindings
    workflows/
      aigo-default.yaml         # observed statuses, transitions (workflows.md)
    workflow-schemes.yaml       # observed workflow -> project/issue-type map
    filters.yaml                # observed JQL filters + owner + sharing
    queues.yaml                 # observed queue specs referencing filters
    dashboards.yaml             # observed dashboards + gadgets + layout
    automation/
      *.yaml                    # rule SOURCE templates (rendered to disabled JSON)
    seeds/
      matrix.yaml               # 1+ seed per canonical issue type
  rovo/
    agents.yaml                 # derived view of manifest.yml + prompts
  policies/
    # include of ../policies/*.md for IaC provenance
```

Every YAML file declares a `schemaVersion`; readers reject unknown versions and
name the script that upgrades them.

## Instance file (`infra/instances/staging.yaml`)

```yaml
schemaVersion: 1
name: staging
site: myhealthcaresite.atlassian.net
forgeEnv: development
project:
  key: AIGO
  name: AI Growth Ops
  style: team-managed         # observed; golden-template work (T-NIH-04) targets company-managed
  lead: <accountId placeholder resolved at read time>
seedLabel: aigo-seed
automationActorAccountId: "${AIGO_AUTOMATION_ACTOR_ID}"
destructiveOpsAllowed: false
```

Secrets/ids resolve from environment variables (documented `ATLASSIAN_TOKEN`
auth — never reverse-engineered ACLI keychain blobs, per theme #1). The file
itself contains only placeholders and the staging site name.

## Jira config snapshots (issue-types / fields / screens / workflows / filters / dashboards)

Each of these files is a **snapshot of native output**, produced by an audit
script that reads ACLI list commands or documented Jira REST GETs and serializes
the result. The shape mirrors the canonical catalogs in
[`issue-types.md`](../issue-types.md), [`custom-fields.md`](../custom-fields.md),
and [`workflows.md`](../workflows.md); this file does not duplicate their
contents or counts.

Screens, screen schemes, and workflow schemes are the Jira objects least served
by public REST/ACLI. Their native owner is a **golden company-managed
template-project clone** (T-NIH-04). The corresponding `infra/*.yaml` is the
observed shape *after* a clone, used to assert "clone produced the expected
shape" — never a converge script that recreates screens field by field.

## Automation rules (`infra/jira/automation/*.yaml`)

The supported import/apply path is **native Jira Automation import/export or a
documented public API** — never `gateway/api/automation/internal-api/...`,
`rest/cb-automation`, or any other private/internal surface (theme #1, T-NIH-02).
If no public import API exists, that is recorded as a platform blocker in
`evidence/blockers/`, not hidden behind an internal fallback.

Each rule file is the YAML source; an audit script renders it to the JSON shape
Jira Automation Import expects, resolving `${projectKey}`, `${projectId}`,
`${actorAccountId}`, `${agentKey:<key>}` from the instance + manifest. Rendered
JSON lives under `automation/rules/<rule>.generated.json` (gitignored). The
`use-rovo-agent` action below is the **native** "Use Rovo agent" automation
action.

```yaml
schemaVersion: 1
key: intake-triage
name: AIGO Intake Triage
enabledByDefault: false
trigger:
  type: issue-created
  projectKey: ${projectKey}
conditions:
  - field: issueType
    in: [growth-request, creative-request, ...]   # see issue-types.md
actions:
  - type: use-rovo-agent
    agentKey: ${agentKey:growth-triage-agent}
    outputVariable: agentResponse
  - type: add-comment
    bodyTemplate: |
      **AI Analysis (auto-generated)**
      {{agentResponse}}
safety:
  mustNotApproveClaims: true
  mustNotSendCampaign: true
```

Rules are imported **disabled** and stay `enabled=false` until a native Jira
Automation **audit-log** capture proves a green run (safety contract,
`_CONVENTIONS.md` §5). Enablement is a separate, human-gated step. Webtrigger
reachability is **not** accepted as proof that an Automation rule ran — that
evidence lives in a separate row (see
[SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md), theme #4).

## Seeds (`infra/jira/seeds/matrix.yaml`)

One or more seed issues per canonical issue type (`issue-types.md`), upserted by
`(issueType, summary, label)` key via ACLI. Re-reads mutate nothing.

## Rovo agents derived view (`infra/rovo/agents.yaml`)

Derived from `manifest.yml` + `prompts/*.md` by an audit script. Committed so
diffs are reviewable; never hand-edited. `manifest.yml` is the single source of
truth for the agent catalog — this file is a derivation, never a second catalog.
The verifier asserts regenerating it produces zero diff.

```yaml
schemaVersion: 1
agents:
  - key: growth-triage-agent
    name: AI Growth Triage Agent
    prompt: prompts/growth-triage-agent.md
    promptHash: sha256:...
    actions: [getIssueContext, classifyGrowthIssue, ...]
```

There is no public Rovo agent **listing** API, so this derived view proves
declaration and install state only — it is a **manifest/install check**, not a
guarantee of Jira UI visibility (theme #4, T-NIH-01).

## Policies

`policies/*.md` are the human-readable safety contract. The verifier hashes each
file and asserts every prompt claiming to follow a policy carries the matching
`<!-- policyHash: sha256:... -->`, and that no prompt references a missing
policy.

## Non-goals of `infra/`

- It is not Terraform and not a converge engine. It performs no mutations.
- It does not describe every Jira feature — only what this project uses.
- It does not duplicate `manifest.yml`; the Rovo view is a derivation.
- It does not stand up a parallel "configured Jira project" product; the golden
  template + ACLI + native Automation own configuration (themes #2, #3).
