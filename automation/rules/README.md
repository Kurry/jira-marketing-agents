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

The **supported, portable path is the native Jira Automation importer** (and,
for the Rovo step, the Studio "Use Rovo agent" action). These files are rendered
for that native import; no private/internal Atlassian endpoint is part of the
supported path.

1. In Jira: **Project settings → Automation → ⋯ (top right) → Import rules**.
2. Upload `aigo-automation-ruleset.json` (all rules) or an individual file.
3. After import, open each rule and **resolve the placeholders** (see below),
   then **enable** it. Rules import in a disabled state by design.

> **Experimental, non-default scripts.** `scripts/provision-automation.cjs` and
> `scripts/fix-automation-triggers.cjs` can attempt an API import / trigger fix,
> but the API import endpoints and the trigger-fix endpoint hit Atlassian's
> private `gateway/api/automation/internal-api/...` surface. They are gated
> behind `AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1`, are **not** the supported
> portability path, and exist only as a documented-API-gap workaround (see
> `specs/atlassian-native-tools.md`, T-NIH-02). Use the native UI import above
> unless you have explicitly opted into the experimental path.

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
"Use Rovo agent" step is read-style and the primary mutation is **adding a
comment** with the agent's response (`{{agentResponse}}`). The Creative Claims
rule may also route risky work to **Claims Review**. No rule approves claims,
launches campaigns, changes audiences/suppression, or modifies production
systems; approval remains a human step.

## Rovo agent action type

The native owner of this step is the Studio **"Use Rovo agent"** automation
action; `{{agentResponse}}` is its native smart value. In these templates that
action is represented with component type `jira.rovo.agent.action` and a
`value.agentKey` / `value.prompt`. The component shape is a convenience for the
native importer, not a custom action runtime — Jira Automation/Studio executes
it. If your site exposes a different internal type for this action, import the
rule and re-select the agent in the builder (the native, supported step);
everything else (trigger, condition, comment action) imports unchanged.
