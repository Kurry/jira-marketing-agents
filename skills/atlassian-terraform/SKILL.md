---
name: atlassian-terraform
description: Manage Atlassian Operations (JSM Operations / former Opsgenie) as code with the official atlassian/atlassian-operations Terraform provider. Use when declaring teams, schedules/rotations, escalations, routing rules, notification rules/policies, alert policies, integrations (email/API), or custom roles in Terraform, configuring provider auth, or deciding what the official provider covers vs community providers for core Jira/Confluence admin.
---

# Atlassian via Terraform

IaC-first management of Atlassian **Operations** resources. The **official** provider is `atlassian/atlassian-operations` — a functional replacement for the transitioned Opsgenie provider, targeting Jira Service Management Operations (and Compass-adjacent ops).

## What the OFFICIAL provider covers

Repo: https://github.com/atlassian/terraform-provider-atlassian-operations
Registry: `atlassian/atlassian-operations`

**Resources** (verify exact names against the registry version you pin):
- `atlassian-operations_team`
- `atlassian-operations_schedule` and `atlassian-operations_schedule_rotation`
- `atlassian-operations_escalation`
- `atlassian-operations_routing_rule`
- `atlassian-operations_notification_rule`
- `atlassian-operations_alert_policy`
- `atlassian-operations_notification_policy`
- `atlassian-operations_email_integration` and `atlassian-operations_api_integration` (API-based integration)
- `atlassian-operations_custom_role`
- `atlassian-operations_user_contact`
- `atlassian-operations_service`

**Data sources:** `user`, `team`, `schedule` (rotation excluded).

Notes:
- `team` supports `delete_default_resources` to drop the auto-created default escalation/schedule.
- `alert_policy` and `notification_policy` accept an optional `order` to control execution order.
- Provider is still under active development — pin a version and check the CHANGELOG before upgrading.

## What it does NOT cover

- Core Jira/Confluence admin (projects, issue types, workflows, screens, fields, spaces, permissions) is **not** in the official Operations provider.
- For those, **community** providers exist (e.g. `community-terraform-providers/jira`, others). They are third-party, unofficial, and vary in coverage/maintenance — flag this clearly and don't present them as Atlassian-supported.

## Provider config & auth

```hcl
terraform {
  required_providers {
    atlassian-operations = {
      source  = "atlassian/atlassian-operations"
      version = "~> 1.1"   # pin; check registry for current
    }
  }
}

provider "atlassian-operations" {
  cloud_id      = var.cloud_id        # Atlassian site cloudId
  domain_name   = var.domain_name     # e.g. your-site.atlassian.net
  email_address = var.email_address   # Atlassian account email
  token         = var.api_token       # Atlassian API token (secret)
}
```
- Auth uses an **Atlassian API token** + account email (set via env vars / TF vars, never hardcoded). Confirm the exact provider argument names against the registry docs for your pinned version.

## Common workflows

1. **New on-call team:** declare `team` → `schedule` + `schedule_rotation` → `escalation` → `routing_rule` wiring alerts to the team.
2. **Alert routing:** `api_integration`/`email_integration` to ingest alerts, `routing_rule` to direct them, `alert_policy` to mutate/suppress, ordered via `order`.
3. **Migrate off Opsgenie provider:** map old Opsgenie resources to the operations equivalents; import existing resources with `terraform import` before first apply to avoid recreate.
4. **Review before apply:** `terraform plan` and inspect the diff; treat any `destroy`/`replace` as high-risk.

## Gotchas / current changes

- Provider maturity: under development — behavior and resource set can change between minor versions; always pin.
- Importing existing ops config is essential or `apply` may try to recreate teams/schedules.
- `delete_default_resources` and policy `order` are easy to get wrong and cause noisy diffs.
- Don't conflate this with provisioning Jira itself — different (community) tooling, different support story.

## Safety

Read/plan by default. **`terraform apply` and `terraform destroy` are mutating/destructive and require explicit human approval**, especially anything that replaces teams, schedules, routing rules, or escalations (can break live paging). Never commit API tokens; use a secrets backend.

## References

- Official provider repo: https://github.com/atlassian/terraform-provider-atlassian-operations
- Registry docs: https://registry.terraform.io/providers/atlassian/atlassian-operations/latest/docs
- CHANGELOG: https://github.com/atlassian/terraform-provider-atlassian-operations/blob/main/CHANGELOG.md
- Schedule resource: https://registry.terraform.io/providers/atlassian/atlassian-operations/latest/docs/resources/schedule
- Team resource: https://registry.terraform.io/providers/atlassian/atlassian-operations/latest/docs/resources/team
