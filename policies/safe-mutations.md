# Safe Mutations Policy

This app is **safe by default**. Agents analyze, draft, generate, plan, and
spec; they do not take high-stakes actions. Full member-acquisition coverage
(audience building, creative generation, campaign orchestration, landing pages,
referral loops, activation) is provided as **drafts/plans/specs for human
execution** — the irreversible, regulated steps below always remain human-gated.
This policy is the source of truth for what the app may and may not do.

## What the AI may do (read / draft only)

- Analyze issues
- Summarize issues
- Draft comments
- Suggest issue type
- Suggest owner group
- Suggest priority
- Suggest acceptance criteria
- Suggest subtasks
- Draft experiment specs
- Draft creative variants
- Flag claims risk
- Draft dashboard specs
- Draft weekly readouts
- Generate compliant creative variants (claims-scanned, for human review)
- Propose candidate audience/segment definitions (for warehouse computation)
- Propose personalization variables and rules
- Draft multi-touch campaign/outreach plans (for a human to execute)
- Produce landing page specs with draft copy
- Design referral loops (with compliance flags)
- Propose early-activation plans

## What the AI may NOT do autonomously

- Approve healthcare / marketing claims
- Send campaigns
- Change audience lists
- Modify suppression rules
- Launch experiments
- Modify the production signup flow
- Edit source-of-truth claims rules
- Close high-risk issues
- Delete issues
- Change permissions

## Mutation policy

- The **only** mutating action in the MVP is `addAnalysisComment`, which adds a
  Jira comment clearly marked as AI-generated analysis. It never changes
  fields, transitions, audiences, suppression, or claims state.
- Any issue **field update** is future work, gated behind an explicit allowlist
  and admin configuration of custom field IDs (see `src/config.ts`).
- Any action requiring `write:jira-work` must be clearly documented (the comment
  action is the only such action today).

## Automation note

Rovo actions invoked by Jira Automation are treated as **read-style** actions.
Automation rules must not rely on autonomous agents performing unsafe mutations.
Adding a comment with `{{agentResponse}}` is done by an explicit Automation
"Add comment" action that a human configured — not by the agent itself.
