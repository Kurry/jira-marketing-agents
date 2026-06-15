---
name: forge-rovo-agents
description: Build Forge Rovo agents in code — the rovo:agent module, action modules and their function handlers, action input schema, actionVerb, scopes (read:chat:rovo), deploy/install, and testing in Rovo Chat. Use when declaring a rovo:agent in manifest.yml, writing or wiring Forge actions a Rovo agent invokes, authoring agent prompts/conversationStarters, exposing actions to customer-built agents, or debugging why a Rovo action is not called.
---

# Forge Rovo Agents

Code-defined Rovo agents are AI teammates declared in a Forge `manifest.yml`. An agent has a prompt and a set of `action` modules it can invoke; each action runs a Forge function (or Forge Remote endpoint). This is the developer reference; the no-code/admin path is in `rovo-studio-agents`, and this repo's specific agent fleet is operated via `forge-rovo-jira-ops`.

App-based agents only access data in the app's installed workspace. To reach data across multiple Atlassian apps, configure multi-app compatibility.

## rovo:agent module

```yaml
modules:
  rovo:agent:
    - key: risk-agent              # ^[a-zA-Z0-9_-]+$, unique
      name: "Risk Assistant"       # <= 30 chars
      description: Helps manage project risks
      icon: resource:icons;risk.svg            # optional
      prompt: resource:agent-prompts;risk.md   # string OR resource path (CLI >= 10.6.0)
      conversationStarters:
        - Fetch my active project risks
        - Create a new risk
      actions:
        - fetch-risks
        - create-risk
      followUpPrompt: Suggest related risks to review   # optional
resources:
  - key: agent-prompts
    path: prompts
```

Required: `key`, `name`, `prompt`. The `prompt` defines role, jobs, when to call actions, and output format — keep it structured (delimiters between jobs, explicit "use action X" steps).

## action module

An action is a named, described capability the agent's LLM decides to call. Implemented as a Forge `function` (or remote `endpoint`).

```yaml
modules:
  action:
    - key: fetch-risks
      name: Fetch risks
      function: getRisks
      actionVerb: GET            # GET | CREATE | UPDATE | DELETE | TRIGGER
      description: Retrieve the project's risks.   # LLM uses this to decide when to invoke
      inputs:
        priority:
          title: Priority
          type: string           # string | integer | number | boolean
          required: false
          description: Filter risks by priority level
  function:
    - key: getRisks
      handler: index.getRisks
```

- `actionVerb` is mandatory and signals intent. **Agents triggered by automation rules will NOT invoke `CREATE`, `UPDATE`, `DELETE`, or `TRIGGER` actions** — only `GET`. Plan mutating actions for interactive chat, not autonomous automation.
- `inputs` are extracted by the LLM from chat/context and may be hallucinated — never trust them for authorization.

## Function handler

```js
export async function getRisks(payload, context) {
  // payload = action inputs + a context object (cloudId, moduleKey, jira/confluence ids)
  // context = { accountId, ... } — read accountId from context, NOT payload, for auth
  const { priority } = payload;
  // ...fetch via @forge/api asApp()/asUser()...
  return { risks: [/* ... */] };   // any string or JSON; agent renders it in natural language
}
```

In a Jira issue/Confluence page context, `payload.context.jira` / `.confluence` carries deterministic ids (issueKey, projectKey, contentId, spaceKey). Action data is limited to ~5 MB; segment large datasets.

## Scopes

- The agent needs scopes for whatever its actions call (e.g. `read:jira-work`, `write:jira-work`).
- To let **customer-built agents** use your app's actions, add `read:chat:rovo`:

```yaml
permissions:
  scopes:
    - read:chat:rovo
```

Actions are only registered (and appear in the skill palette) if the app **also bundles a `rovo:agent`** — an app with actions but no agent exposes nothing.

## Common workflows

1. Scaffold: `forge create` (Rovo agent template) or add `rovo:agent` + `action` + `function` to an existing app.
2. Write the prompt (role, jobs, action-invocation rules, output format); declare conversation starters.
3. Implement each action's handler; map `function` keys; set the correct `actionVerb`.
4. Add scopes for the actions; add `read:chat:rovo` if exposing to customer agents.
5. `forge lint` -> `forge deploy` -> `forge install`.
6. Test in **Rovo Chat** (Chat button in Jira/Confluence top nav, or `/ai` in the editor). Trigger conversation starters; confirm the right action fires and inputs resolve.
7. Optionally invoke the agent from Jira/Confluence Automation (autonomous, async) — see `rovo-studio-agents` and the Rovo agent module's automation section.

## Gotchas

- Automation-triggered agents skip non-GET actions — a mutating agent appears to "do nothing" in a rule. Use interactive chat or a separate write path.
- `name` is hard-capped at 30 chars; deploy fails otherwise.
- Inputs can be wrong/hallucinated — validate and fall back to `context` for ids; never authorize on input values.
- Atlassian performs safety screening on agents and may block deploys; comply with the Acceptable Use Policy (AI section).
- Prompt-as-resource requires Forge CLI >= 10.6.0.

## Safety

Rovo actions can mutate Atlassian data. Default to least-privilege scopes; gate any write behind the smallest scope and the correct `actionVerb`. New write scopes, `read:chat:rovo`, or production deploys are major changes requiring admin re-consent and explicit human approval.

## References

- Rovo Agent module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/
- Action module: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-action/
- Rovo modules index: https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-index/
- Hello-world Rovo agent tutorial: https://developer.atlassian.com/platform/forge/build-a-hello-world-rovo-agent/
- Function arguments: https://developer.atlassian.com/platform/forge/function-reference/arguments/
