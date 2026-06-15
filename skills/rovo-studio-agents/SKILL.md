---
name: rovo-studio-agents
description: Rovo no-code/low-code admin reference — Rovo Studio agents, Rovo Search, Rovo Chat, knowledge sources, and using Rovo agents inside Jira/Confluence Automation (the Use Rovo agent action and agent triggers). Use when configuring Rovo without writing a Forge app, creating/editing agents in Studio, wiring an agent into an automation rule with {{agentResponse}}, setting agent knowledge sources, or asking how the no-code path differs from forge-rovo-agents.
---

# Rovo Studio Agents (No-/Low-Code)

The admin-facing complement to the developer skill `forge-rovo-agents`. Rovo Studio lets admins and builders create AI agents, search, and automations through the UI — no Forge app required. Find **Studio** in the Atlassian app switcher (top-left of any Atlassian app). Requires Rovo enabled and an org admin to activate Atlassian Intelligence.

## Building blocks

- **Rovo Search** — unified search across Atlassian + connected external apps; surfaces definitions, people, and knowledge cards (a single connected view of related info across sources).
- **Rovo Chat** — conversational assistant; can use skills/tools and invoke agents. Access via the Chat button or `/ai` in the Jira/Confluence editor.
- **Agents** — AI teammates with custom instructions, tone, knowledge sources, subagents, and tools. Created in Studio; can run interactively or autonomously via automation.
- **Studio** also hosts Automation, Assets (JSM), and Company Hubs.

## Create an agent (Studio)

1. App switcher -> **Studio** -> **Agents** -> create/edit.
2. Write **instructions** (role, jobs, output format), add **conversation starters**.
3. Add **knowledge sources** — Confluence spaces, Jira projects, Google Drive folders, etc. Scoping relevant knowledge makes responses more accurate.
4. Add **subagents** and **tools/skills** for specific capabilities.
5. Set **permissions/governance**, then share. Optionally **verify** the agent for the org.

Code-defined agents (Forge `rovo:agent`) and Studio agents coexist; use Forge when you need custom actions/functions, Studio for configuration-only agents.

## Agents in Automation (autonomous)

Agents only act autonomously through an automation rule. Two paths:

### A. Add a trigger to the agent
As the agent's **manager/editor**: Studio -> Agents -> open agent -> **Triggers** -> **Add automation trigger** -> pick app + space -> finish the flow in Jira/JSM/Confluence Automation -> save & enable.

### B. Add the agent to an automation flow
As a space/app **admin**: Studio -> **Automation** -> pick app/space -> **Create flow** (from scratch) -> add a trigger -> **THEN: Add an action** -> **Use Rovo agent**:
1. Connect Rovo to automation (a connection lets the agent act on your behalf).
2. Select an agent (required) and write a prompt (required).
3. Add a second action and pass the agent output via the `{{agentResponse}}` smart value (e.g. Add comment, Send Slack message).

### Use Rovo action (no agent)
Add the **Use Rovo** action to generate AI text (summaries, translations) inline without a dedicated agent. It uses smart values to produce a fresh response each run; `agentResponse` smart values format the output for different uses.

### Example flows
- WHEN page published, IF title contains "DACI", THEN Use Rovo agent (Decision director) "review and recommend", THEN Add comment `{{agentResponse}}`.
- WHEN work item created without parent, THEN Use Rovo agent (Work item organizer) "find a relevant parent", THEN Add comment `{{agentResponse}}`.
- WHEN scheduled every 2 days 8am, THEN Use Rovo agent (Theme analyzer) "summarize recent items", THEN Send Slack `{{agentResponse}}`.

## Studio vs Forge agents

| | Studio (this skill) | Forge `rovo:agent` (forge-rovo-agents) |
|---|---|---|
| Built by | admins/builders in UI | developers in manifest.yml |
| Custom actions | tools/skills/MCP, no code | Forge `action` + function/endpoint |
| Knowledge | configured sources | app's installed workspace data |
| Automation | Use Rovo agent action / triggers | same automation surface; non-GET actions skipped autonomously |

## Gotchas

- Without an automation rule + admin setup, agents cannot run autonomously.
- Adding agents to a flow needs a Rovo automation **connection** so the agent can act on your behalf.
- Some Studio tools (Assets, Company Hubs) require JSM/Confluence Premium or Enterprise.
- This repo's automation-rule editing runbooks live in `jira-automation-rovo-setup` and `jira-automation-browser-edit` — cross-reference rather than duplicate.

## Safety

Autonomous agents can post comments, send messages, and modify work via automation. Keep prompts scoped, restrict knowledge sources to what's needed, and treat enabling an automation rule that lets an agent write or message as a change requiring explicit human approval. For regulated/healthcare content, route agent output through review and never let an agent approve claims or send externally without sign-off.

## References

- Rovo support home: https://support.atlassian.com/rovo/
- Studio: https://support.atlassian.com/rovo/docs/studio/
- Create and edit agents: https://support.atlassian.com/rovo/docs/create-and-edit-agents/
- Knowledge sources for subagents: https://support.atlassian.com/rovo/docs/knowledge-sources-for-agents/
- Automating Rovo agents: https://support.atlassian.com/rovo/docs/agents-in-automations/
- Use Rovo in an automation rule (Studio): https://support.atlassian.com/studio/docs/use-rovo-in-an-automation-rule/
- Automation smart values (Rovo agents): https://support.atlassian.com/cloud-automation/docs/automation-smart-values-rovo-agents/
