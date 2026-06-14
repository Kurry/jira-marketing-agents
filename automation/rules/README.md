# Jira Automation as Code

Importable Jira Cloud Automation rule definitions for the AI Growth Ops (AIGO)
project. These encode the five rules described in
[`../jira-automation-rules.md`](../jira-automation-rules.md) so they can be
version-controlled and imported instead of clicked together by hand.

## Files

| File | Rule | Trigger |
| --- | --- | --- |
| `intake-triage.json` | Intake Triage | Issue created |
| `creative-claims.json` | Creative Claims | Transition to Ready |
| `experiment-spec.json` | Experiment Spec | Created / AI Triage |
| `employer-launch.json` | Employer Launch | Issue created |
| `weekly-readout.json` | Weekly Readout | Scheduled (Mon 8 AM) |
| `aigo-automation-ruleset.json` | All five, bundled | — |

## How to import

1. In Jira: **Project settings → Automation → ⋯ (top right) → Import rules**.
2. Upload `aigo-automation-ruleset.json` (all rules) or an individual file.
3. After import, open each rule and **resolve the placeholders** (see below),
   then **enable** it. Rules import in a disabled state by design.

> Schema note: Jira Automation's import format evolves and is not a stable
> public contract. These files follow the documented component model
> (`trigger` / `CONDITION` / `ACTION` components with `type` + `value`). If your
> site rejects a field, import the rule, then adjust it in the UI — the
> structure here maps 1:1 to the builder.

## Placeholders to replace

Replace these tokens with values from your instance before enabling:

| Placeholder | Meaning | Where to find it |
| --- | --- | --- |
| `__PROJECT_KEY__` | Project key (default `AIGO`) | Project settings |
| `__PROJECT_ID__` | Numeric project id | Project details / REST API |
| `__ACTOR_ACCOUNT_ID__` | Account the rule runs as | Profile → Account ID |
| `__TRIAGE_AGENT_KEY__` etc. | Rovo agent key | `manifest.yml` (`rovo:agent` keys) |

## Safety

Per [`../../policies/safe-mutations.md`](../../policies/safe-mutations.md), the
**only** mutation these rules perform is **adding a comment** with the agent's
response (`{{agentResponse}}`). The "Use Rovo agent" step is read-style. No rule
approves claims, launches campaigns, changes audiences/suppression, or modifies
production systems. The Creative Claims rule may *suggest* a transition to Claims
Review, but approval remains a human step.

## Rovo agent action type

The "Use Rovo agent" action is represented with component type
`jira.rovo.agent.action` and a `value.agentKey` / `value.prompt`. If your site
exposes a different internal type for this action, import the rule and re-select
the agent in the builder; everything else (trigger, condition, comment action)
imports unchanged.
