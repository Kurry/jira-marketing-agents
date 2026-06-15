# Declarative State (`infra/` tree)

All Jira / Forge / Rovo configuration that is not already in
`manifest.yml` lives under `infra/` as version-controlled YAML or JSON.
Scripts under `scripts/infra/` converge the live site to match. Nothing
in `infra/` is site-specific beyond variables resolved from an instance
config at apply time.

This document is the schema; the first remediation milestone is to make
the tree exist and the apply scripts converge it.

## Tree layout

```
infra/
  instances/
    staging.yaml                # site + project + actor + env bindings
  jira/
    issue-types.yaml            # canonical catalog (~14 types)
    fields.yaml                 # custom fields + schemas
    screens.yaml                # screen definitions, field ordering
    screen-schemes.yaml         # screen → issue type bindings
    workflows/
      aigo-default.yaml         # statuses, transitions, conditions,
                                #   validators, post-functions
    workflow-schemes.yaml       # workflow → project/issue-type map
    filters.yaml                # JQL filters + owner + permissions
    queues.yaml                 # queue specs referencing filters
    dashboards.yaml             # dashboards + gadgets + layout
    automation/
      intake-triage.yaml
      creative-claims.yaml
      experiment-spec.yaml
      employer-launch.yaml
      weekly-readout.yaml
    seeds/
      matrix.yaml               # 1+ seed per canonical issue type
  rovo/
    agents.yaml                 # derived view of manifest.yml + prompts
  policies/
    # symlink or include of ../policies/*.md for IaC provenance
```

All YAML files declare a `schemaVersion` field; scripts reject unknown
versions and tell the operator which script to run to upgrade.

## Instance file (`infra/instances/staging.yaml`)

```yaml
schemaVersion: 1
name: staging
site: myhealthcaresite.atlassian.net
forgeEnv: development
project:
  key: AIGO
  name: AI Growth Ops
  style: team-managed         # or company-managed, as discovered
  lead: <accountId placeholder resolved at apply time>
seedLabel: aigo-seed
automationActorAccountId: "${AIGO_AUTOMATION_ACTOR_ID}"
destructiveOpsAllowed: false
```

Secrets/ids are resolved from environment variables at apply time. The
file itself contains only placeholders and the staging site name.

## Issue types (`infra/jira/issue-types.yaml`)

```yaml
schemaVersion: 1
types:
  - key: growth-request
    name: AI Growth Request
    description: Generic intake for AI Growth Ops work.
    hierarchyLevel: 0
  - key: creative-request
    name: Creative Request
    ...
  - ...
aliases:
  - from: Insight / Research Brief
    to: Research Brief
```

`scripts/infra/jira-issue-types-apply.mjs` ensures every `types[*]`
exists in the project and aliases either rename or compat-map.

## Fields (`infra/jira/fields.yaml`)

```yaml
schemaVersion: 1
fields:
  - key: targetPopulation
    name: Target Population
    type: string
    searcher: textsearcher
    appliesTo: [growth-request, segmentation-request, ...]
  - key: claimsRisk
    name: Claims Risk
    type: option
    options: [Low, Medium, High, Prohibited]
    appliesTo: [creative-request, claims-review]
  - ...
```

## Screens / screen schemes

```yaml
# screens.yaml
schemaVersion: 1
screens:
  - key: growth-request-create
    name: Growth Request — Create
    fields: [summary, description, priority, targetPopulation, ...]
```

```yaml
# screen-schemes.yaml
schemaVersion: 1
schemes:
  - issueType: growth-request
    create: growth-request-create
    edit:   growth-request-edit
    view:   growth-request-view
```

## Workflow (`infra/jira/workflows/aigo-default.yaml`)

```yaml
schemaVersion: 1
name: AIGO Default Workflow
statuses:
  - key: to-do
    category: to-do
  - key: ai-triage
    category: in-progress
  - ... 12 total
transitions:
  - name: "To AI Triage"
    from: [to-do]
    to: ai-triage
    validators: []
    conditions: []
    postFunctions: []
  - name: "Needs Human Review"
    from: [ai-triage, ready, claims-review]
    to: needs-human-review
  - ...
```

Transition matrix is the source of truth for what the workflow
validator (optional Forge module) will enforce.

## Automation rules (`infra/jira/automation/*.yaml`)

Each rule is the YAML source; `scripts/infra/automation-render.mjs`
compiles it to the JSON shape Jira Automation Import expects, resolving
`${projectKey}`, `${projectId}`, `${actorAccountId}`, `${agentKey:<key>}`
from the instance + manifest. Rendered JSON lives under
`automation/rules/<rule>.generated.json` (gitignored) and is produced on
every apply.

A rule file:

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
    in: [growth-request, creative-request, ...]
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

`scripts/infra/automation-apply.mjs` is idempotent: compare rule
content hash with the live rule; import or update only on delta; keep
`enabled=false` until `scripts/verify/automation-audit.mjs` has a green
audit-log capture, then flip enablement via a second apply pass.

## Seeds (`infra/jira/seeds/matrix.yaml`)

```yaml
schemaVersion: 1
seeds:
  - issueType: growth-request
    summary: Mobile Safari signup issue
    label: aigo-seed
    fields: { targetPopulation: ..., ... }
  - issueType: creative-request
    summary: Risky headline variant
    label: aigo-seed
    ...
```

`scripts/infra/seeds-apply.mjs` upserts seeds by `(issueType, summary,
label)` key. Re-runs mutate nothing if everything exists.

## Rovo agents derived view (`infra/rovo/agents.yaml`)

Derived from `manifest.yml` + `prompts/*.md` by
`scripts/infra/rovo-derive.mjs`. Committed so diffs are reviewable.
Never hand-edited.

```yaml
schemaVersion: 1
agents:
  - key: growth-triage-agent
    name: AI Growth Triage Agent
    prompt: prompts/growth-triage-agent.md
    promptHash: sha256:...
    actions: [getIssueContext, classifyGrowthIssue, ...]
```

Verifier asserts this file is up to date (regenerating it produces zero
diff).

## Policies

`policies/*.md` are the human-readable safety contract. The verifier
hashes each file and asserts:

- Every prompt that claims to follow a policy references the same hash
  in a comment block (`<!-- policyHash: sha256:... -->`).
- No prompt references a policy that doesn't exist.

## Non-goals of `infra/`

- It does not try to be Terraform. It is declarative YAML + TS/Node
  convergence scripts, tailored to the small surface area of this repo.
- It does not attempt to describe every Jira feature — only what this
  project uses.
- It does not duplicate `manifest.yml`; the Rovo view is a derivation.
