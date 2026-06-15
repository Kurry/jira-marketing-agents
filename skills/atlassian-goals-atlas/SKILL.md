---
name: atlassian-goals-atlas
description: >
  Understand and query Atlassian Goals & projects (formerly Atlas / Townsquare, now part of
  Atlassian Home and surfaced in Rovo). Use when working with goals, projects, weekly updates
  (on-track / at-risk / off-track), focus areas, tags, followers, sub-goals, their link to Jira,
  or when asked how to read goal/project status programmatically (Teamwork Graph / Rovo).
---

# atlassian-goals-atlas

Atlassian Goals & projects — the lightweight strategy/status layer once called **Atlas**
(codename Townsquare), now folded into **Atlassian Home** and exposed to **Rovo**. It tracks
*why* work happens (goals) and *how* it's going (project/goal updates), across Jira, Confluence,
and other apps.

## Core concepts

- **Goal** — a measurable objective (an OKR-style outcome). Has owner, target/due date, status, a `key`, description, tags, followers, and can nest **sub-goals** (parent/child).
- **Project** — a body of work with an owner and target date that contributes toward one or more goals; links to Jira epics/issues.
- **Update** — a short, periodic (typically weekly/monthly) post on a project or goal. The author sets a **status** and summarizes progress, risks, and blockers in a few bullets. Updates form a timeline.
  - Project update statuses: **On track**, **At risk**, **Off track** (plus Paused, Done, Cancelled).
  - Goal status: **On track / At risk / Off track**, plus **Pending, Paused, Completed, Cancelled**.
- **Focus area** — a higher-level grouping (Focus product) used to organize goals/projects into themes/initiatives, with their own status updates.
- **Tags** — hashtag-style labels on goals/projects; followable, used to slice and group work.
- **Following / watchers** — users subscribe to a goal/project/tag to get its updates; `watcherCount` reflects followers.

## Relationship to Jira & other apps

- Jira **epics/issues link to projects**, and projects roll up to goals — so a Jira initiative can show its strategic "why" and a goal can show contributing work and aggregate health.
- Goals/projects/updates are shared platform objects surfaced in **Atlassian Home**, Jira sidebars, Confluence, and **Rovo** search/chat. Cross-app discovery is the intended access path, not a bespoke REST surface.

## Programmatic access — be honest about the surface

There is **no broadly available, supported public REST API** dedicated to Atlas/Goals CRUD. Treat
goals/projects/updates as read-mostly objects reached through platform surfaces:

- **Teamwork Graph API (Forge, EAP only):** a GraphQL/Cypher graph exposing goal/project objects. Requires Early Access Program enrollment and org-wide scopes (`read:graph:jira` / `read:graph:confluence`); **test orgs only** unless an approved path to production. Relevant object types: `AtlassianGoal`, `AtlassianGoalUpdate`, `AtlassianProject`, `AtlassianProjectUpdate`, `FocusFocusArea`, `FocusFocusAreaStatusUpdate`, `AtlassianHomeTag`, `AtlassianHomeComment`, `AtlassianTeam`, `AtlassianUser`.
  - `AtlassianGoal` fields include: `id` (ARI), `key`, `name`, `description`, `owner` (User), `startedAt`, `dueDateStartedAt`, `dueDateEndedAt`, `archived`, `watching`, `watcherCount`, `createdAt`, `updatedAt`, `url`.
  - `AtlassianGoal` relationships: *has Atlassian goal update*, *has Atlassian home tag*, *has child Atlassian goal* (sub-goals). Status itself lives on the **update** object, not the goal object.
- **Rovo:** can answer questions over goals/projects in chat/search, but Rovo does **not** expose a public REST API to retrieve its AI results programmatically.
- **MCP / agent tooling (e.g. the bundled `twg` CLI):** the practical way to query goals/projects/focus areas in this repo — see the `twg` skill family. Prefer typed `twg goals` / `twg projects` commands.

Do **not** invent `/rest/api/goals` style endpoints — none are publicly documented. If a task needs goal/project data, route it through `twg`, the Teamwork Graph (if EAP), or Rovo, and state any coverage gap rather than fabricating a call.

## Common workflows

1. **Read a goal's health:** fetch the goal object for metadata, then its latest **update** for status (On/At-risk/Off track) — status is on the update, not the goal.
2. **Roll up an initiative:** start from a focus area or tag → contributing goals → contributing projects → bucket by update status.
3. **Trace work to strategy:** from a Jira epic, follow the linked project, then the project's parent goal(s).
4. **Audit stale status:** find goals/projects whose latest update is older than the cadence (e.g. >7–14 days) and flag for an owner nudge.

Safety: this skill defaults to read/summarize/recommend. Writing a status update, changing a goal/project status or owner, archiving, or any bulk change requires explicit human approval.

## References

- What is a goal: https://support.atlassian.com/platform-experiences/docs/what-is-a-goal/
- Goal status (OKRs): https://support.atlassian.com/platform-experiences/docs/use-goal-status-to-track-objectives-and-key-results/
- Writing effective updates: https://support.atlassian.com/platform-experiences/docs/write-effective-updates-to-projects-goals-and-topics/
- Track goals & projects across apps: https://support.atlassian.com/platform-experiences/docs/track-goals-and-projects-across-atlassian-products/
- Modeling large programs with goals & projects: https://support.atlassian.com/platform-experiences/docs/modeling-large-programs-of-work-with-goals-and-projects/
- Teamwork Graph AtlassianGoal (EAP): https://developer.atlassian.com/platform/teamwork-graph/api-reference/object-types/AtlassianGoal/
- Teamwork Graph API overview (EAP): https://developer.atlassian.com/platform/teamwork-graph/api-reference/overview/
