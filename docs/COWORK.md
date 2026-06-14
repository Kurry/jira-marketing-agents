# Claude Cowork Integration (MCP)

This repo supports **two** integration routes that share the same growth-ops
logic in `src/`:

1. **Atlassian Forge + Rovo** — agents run inside Jira. See
   [`INTEGRATION.md`](INTEGRATION.md).
2. **Claude Cowork (MCP)** — this guide. The capabilities are exposed as an
   **MCP server** that Cowork connects to as a custom connector. Cowork can read
   Jira through its **own native Jira connector** (passing issue text to our
   tools) and/or let our server fetch Jira directly via REST.

Both routes call the **same pure functions**, so triage, claims, experiment,
launch, funnel, and readout behavior is identical to the Forge path and to the
unit tests.

---

## What Cowork gets

A stdio MCP server (`mcp/server.ts`) exposing **23 tools** — the same surface as
the Forge actions plus backlog prioritization:

```
get_issue_context            classify_growth_issue       propose_requirements_gaps
propose_acceptance_criteria  break_down_epic             assess_sprint_risk
generate_qa_test_cases       propose_experiment_spec     review_creative_claims_risk
create_employer_launch_plan  create_dashboard_spec       analyze_funnel_friction
generate_creative_variants   build_audience_segment      propose_personalization
build_campaign_plan          create_landing_page_spec    design_referral_loop
propose_activation_plan      prioritize_backlog          find_similar_issues*
generate_weekly_readout*     add_analysis_comment*†
```

`*` require Jira to be configured (search/write). `†` `add_analysis_comment` is
the only mutating tool and is additionally gated by `AIGO_ALLOW_WRITES=true`.

Each tool maps to a `src/` module — see [`../skills/README.md`](../skills/README.md)
and [`tools.ts`](../mcp/tools.ts).

---

## Two operating modes

The analysis tools accept **either** an `issueKey` **or** issue fields:

- **Connector mode (no creds in our server):** Cowork pulls the issue via its
  native Jira connector and passes `summary` / `description` / `comments` /
  `labels` to the tool. Our server runs the analysis on that text. No Jira
  credentials are stored in this server.
- **Direct-fetch mode:** set `JIRA_BASE_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN`
  and pass just an `issueKey`; the server fetches the issue itself. Required for
  `find_similar_issues` and `generate_weekly_readout` (which run JQL searches)
  and for `add_analysis_comment`.

You can use both: pass an `issueKey` and the server fetches, while any fields you
also pass override the fetched values.

---

## Setup

### 1. Prerequisites

- Node.js ≥ 20 and this repo cloned locally (Cowork runs the server on your
  machine).
- `npm install` (installs `@modelcontextprotocol/sdk` and `tsx`).
- (Optional, for direct-fetch/write) an Atlassian API token from
  <https://id.atlassian.com/manage-profile/security/api-tokens>.

### 2. Verify the server runs

```bash
npm run build:mcp     # typecheck the MCP server (tsc, bundler resolution)
npm run mcp           # start the server (stdio); prints a readiness line to stderr
```

You should see: `aigo-growth-ops MCP server ready — 23 tools, Jira … mode.`

### 3. Add the connector to Cowork

In Cowork: **Settings → Connectors → Add custom MCP server** (or edit your MCP
config). Use [`../mcp/cowork.connector.example.json`](../mcp/cowork.connector.example.json)
as a template:

```json
{
  "mcpServers": {
    "aigo-growth-ops": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/jira-marketing-agents/mcp/server.ts"],
      "env": {
        "JIRA_BASE_URL": "https://your-site.atlassian.net",
        "JIRA_EMAIL": "you@example.com",
        "JIRA_API_TOKEN": "<atlassian-api-token>",
        "AIGO_PROJECT_KEY": "AIGO",
        "AIGO_ALLOW_WRITES": "false"
      }
    }
  }
}
```

Leave the `JIRA_*` vars out to run in **connector mode** (Cowork supplies issue
text via its own Jira connector). Keep `AIGO_ALLOW_WRITES=false` unless you want
the server itself to post comments.

### 4. Use it in Cowork

Ask Cowork things like:

- "Use the **aigo-growth-ops** tools to triage AIGO-123." → `classify_growth_issue`
- "Review this email copy for claims risk: …" → `review_creative_claims_risk`
- "Draft an experiment spec for AIGO-200." → `propose_experiment_spec`
- "Plan the Acme employer launch in AIGO-310." → `create_employer_launch_plan`
- "Generate this week's growth readout." → `generate_weekly_readout` (needs creds)

Cowork combines these tool outputs with its native Jira/Slack/Drive connectors —
e.g. triage an issue, draft the comment, and (with your confirmation) post it.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `JIRA_BASE_URL` | for fetch/search/write | `https://your-site.atlassian.net` |
| `JIRA_EMAIL` | for fetch/search/write | Atlassian account email |
| `JIRA_API_TOKEN` | for fetch/search/write | Atlassian API token |
| `AIGO_PROJECT_KEY` | optional | Default project key (default `AIGO`) |
| `AIGO_ALLOW_WRITES` | optional | `true` to permit `add_analysis_comment` |

---

## Safety model (same as Forge)

The Cowork path enforces the same boundary as the Forge app
([`../policies/safe-mutations.md`](../policies/safe-mutations.md)):

- Tools **analyze, draft, plan, and spec** — they do not send campaigns, mutate
  audiences/suppression, launch experiments, change production signup, or
  approve health claims.
- `add_analysis_comment` is the **only** write, double-gated: Jira must be
  configured **and** `AIGO_ALLOW_WRITES=true`. Even then, prefer letting Cowork
  show you the draft and post it under your confirmation.
- Cowork itself keeps "consequential decisions with the user," which aligns with
  this design — the human pulls the trigger.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Connector won't start | Run `npm run mcp` manually; ensure the absolute path in `args` is correct and `npm install` has run |
| Tools appear but `find_similar_issues`/`generate_weekly_readout` error | Set the `JIRA_*` env vars (these need REST search) |
| `add_analysis_comment` refuses | Set `AIGO_ALLOW_WRITES=true` and configure `JIRA_*` |
| `Jira API failed: 401/403` | Check the API token/email; the token must belong to a user with project access |
| Analysis seems generic | Pass richer `summary`/`description` (or an `issueKey` so the server fetches full context) |

---

## Reference

| Need | File |
| --- | --- |
| MCP server entrypoint | [`../mcp/server.ts`](../mcp/server.ts) |
| Tool registry → `src/` mapping | [`../mcp/tools.ts`](../mcp/tools.ts) |
| REST Jira client | [`../mcp/jiraClient.ts`](../mcp/jiraClient.ts) |
| Connector config example | [`../mcp/cowork.connector.example.json`](../mcp/cowork.connector.example.json) |
| Forge/Rovo route | [`INTEGRATION.md`](INTEGRATION.md) |
| Capability catalog | [`../skills/README.md`](../skills/README.md) |
