# Atlassian Product Adoption Spike

Status: T-NIH-05 decision memo.

The MVP remains Jira + Forge/Rovo. Additional Atlassian products can reduce
custom issue types, fields, dashboards, or scripts, but none should become a
critical-path dependency until the tenant has licensing, admin ownership, and a
rollback path.

| Product | Recommendation | Growth Ops surface | Sample mapping | Prerequisites | Custom code reduced | Migration cost | Blockers | Rollback/manual fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jira Product Discovery | Defer | Ideas, insights, prioritization, delivery links | `AI Growth Request`, `Research Brief`, and `Decision Memo` can become JPD ideas/insights once discovery intake volume is high. | JPD licensed, product/discovery workspace approved, field mapping for impact/effort/confidence. | Could reduce custom discovery issue types and prioritization fields. | Medium: migrate current intake/readout tickets and retrain agents to link JPD ideas. | JPD is not required for campaign execution; unclear tenant availability. | Keep Jira issue types and labels for discovery work. |
| JSM Assets | Defer | Employers, partners, segments, services, reusable launch objects | Employers, member cohorts, suppression lists, channels, and partner services become object schemas linked from launch/campaign issues. | JSM Assets licensed, object schema owner, import/update model, access controls for sensitive objects. | Could reduce repeated employer/segment custom fields and fragile free-text values. | Medium/high: object schema design, imports, permissions, and agent lookup actions. | Assets licensing and schema governance are not yet proven. | Keep Jira custom fields, issue links, and instance config values. |
| Confluence | Adopt as non-critical knowledge owner when available | Claims rules, SOPs, approved messaging, research synthesis, prompt source references | Claims governance, safe mutation policy, approved positioning, and SOPs can live in Confluence pages linked from Jira tickets and agent prompts. | Confluence space, page ownership, review workflow, link hygiene, optional Rovo knowledge access. | Reduces duplicated policy text in prompts and docs; improves human review traceability. | Low/medium: publish pages and update prompts to cite page links. | Must avoid stale claims rules and ensure clinical/compliance review ownership. | Keep versioned repo policy files and Jira comments as the source until Confluence pages are approved. |
| Atlassian Analytics/Data Lake | Defer | Weekly readouts, dashboard metrics, trend evidence, decision support | Weekly Growth Readout pulls Jira activity, automation audit results, and campaign/experiment metrics into a dashboard-backed decision memo. | Analytics/Data Lake availability, data access, semantic model, metric definitions, dashboard owner. | Could reduce custom dashboard scripts and ad hoc readout comments. | Medium/high: data modeling, governance, and dashboard buildout. | Tenant entitlement and source data availability are not proven. | Keep Jira filters, Jira dashboards, and agent-generated Decision Memo issues. |
| Atlassian Goals/Projects | Defer | Outcome rollups and cross-work alignment | Acquisition outcomes, employer launch goals, conversion improvements, and experiment programs roll up from Jira work to Goals. | Goals enabled, leadership taxonomy, owner model, Jira linkage conventions. | Could reduce custom rollup dashboards and status summary scripts. | Medium: define outcome hierarchy and update weekly readout links. | Outcome taxonomy is still forming; not needed for MVP workflow proof. | Keep Jira labels, issue links, dashboards, and Decision Memo summaries. |

## Decisions

- JPD: defer until discovery volume and licensing justify moving intake ideas out
  of Jira issue types.
- Assets: defer until employer/segment objects have a stable schema and owner.
- Confluence: adopt opportunistically as the reviewed knowledge source, but do
  not make it a blocking dependency for Forge/Rovo MVP installation.
- Analytics/Data Lake: defer until tenant entitlement and metric model are
  proven.
- Goals/Projects: defer until leadership outcome hierarchy is explicit.

## Follow-Up Criteria

Adopt a product only when all of these are true:

1. Tenant licensing and admin path are confirmed.
2. A sample object/page/dashboard/goal exists and is linked from a Jira issue.
3. The migration removes a specific custom issue type, field, dashboard, or
   script rather than adding another system of record.
4. Agents have a read-only lookup path and cannot mutate sensitive product
   state without human approval.
5. Rollback returns the workflow to Jira issue/field/dashboard surfaces without
   data loss.

