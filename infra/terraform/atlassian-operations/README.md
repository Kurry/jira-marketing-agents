# Atlassian Operations — Terraform (Ops scope only)

Infrastructure-as-code for **Atlassian / JSM Operations** resources using the
**official** provider [`atlassian/atlassian-operations`](https://github.com/atlassian/terraform-provider-atlassian-operations)
(the supported successor to the transitioned Opsgenie provider).

## Scope boundary — read first

This module manages **Operations** resources only: on-call teams, schedules &
rotations, escalations, and alert integrations.

It does **not** manage the Jira control plane — issue types, workflows, screens,
fields, dashboards, filters, or Automation rules. Per
[`specs/atlassian-native-tools.md`](../../../specs/atlassian-native-tools.md),
those stay on **Forge + ACLI + golden company-managed template projects + Jira
REST**. The official provider does not cover them, and the NIH plan's `T-NIH-06`
keeps third-party Jira providers out of the critical path until a disposable-site
spike is accepted. This module is the matrix-sanctioned "Terraform" row:
*official Operations provider only*.

## What's here

| File | Purpose |
| --- | --- |
| `versions.tf` | Terraform + provider version pin (`~> 1.1`; latest verified v1.1.9). |
| `providers.tf` | Provider auth (admin email + API token; `product_type`). |
| `variables.tf` | All inputs (auth, team, schedule). |
| `team.tf` | On-call team + member lookup via the `user` data source. |
| `schedule.tf` | Schedule + weekly rotation. |
| `escalation.tf` | Two-step escalation (schedule → team admins). |
| `integrations.tf` | API integration (disabled by default). |
| `outputs.tf` | Resource IDs + sensitive integration key. |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` (gitignored) and fill in. |

## Auth

Uses an Atlassian **admin** account email + **API token**. Never hardcode the
token. Preferred:

```bash
export TF_VAR_api_token="<atlassian-api-token>"
cp terraform.tfvars.example terraform.tfvars   # fill in non-secret values
```

`cloud_id`, `organization_id`, and member emails come from
admin.atlassian.com. For Compass ops set `product_type = "compass"` and supply
`org_admin_token`.

## Workflow (staging-first, apply gated)

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out tfplan      # review every create/replace/destroy
# terraform apply tfplan        # HUMAN-APPROVAL GATED — see below
```

1. Run against a **disposable/staging** Atlassian site first.
2. **`terraform apply` and `terraform destroy` are mutating/destructive and
   require explicit human approval** (CLAUDE.md plan-approval + destructive-CLI
   gates). Replacing a team, schedule, escalation, or routing rule can break
   live paging.
3. Importing pre-existing Operations resources (`terraform import`) before the
   first apply avoids accidental re-creation.
4. State can contain the integration `api_key` — keep it out of git (see
   `.gitignore`) and use a remote backend with locking for shared use.

## Notes / gotchas

- Provider is under active development — pin the version and read the
  [CHANGELOG](https://github.com/atlassian/terraform-provider-atlassian-operations/blob/main/CHANGELOG.md)
  before bumping.
- `delete_default_resources = true` on a team also nulls its routing rule and
  forces you to define one explicitly; left `false` here.
- `api_key` is only returned on create; capture the output immediately.

## References

- Provider repo: https://github.com/atlassian/terraform-provider-atlassian-operations
- Registry docs: https://registry.terraform.io/providers/atlassian/atlassian-operations/latest/docs
- Skill: [`skills/atlassian-terraform/`](../../../skills/atlassian-terraform/)
