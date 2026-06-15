# Operating Loop

Date: 2026-06-15
Status: Proposal — v2 re-alignment to the Atlassian-native / NIH-reduction direction.
Supersedes: `specs/agent-team/OPERATING_LOOP.md`

The loop, its tick invariants, the declaration-first discipline, the anti-stall rules, and the
escalation model from v1 all stay. The re-alignment: the **AUDIT** step reads native command
output (ACLI `--json`, Forge CLI, Jira REST, native Automation export), and **APPLY** routes
through native owners (ACLI, golden-template clone, Forge) — the `infra/` scripts run
**read-only** plan/verify against that output. See
[`_CONVENTIONS.md`](../_CONVENTIONS.md) §1–§3 and [`TEAM_CHARTER.md`](TEAM_CHARTER.md).

```
┌─────────────────────────────────────────────────────────────────┐
│  TICK                                                             │
│                                                                   │
│  1. AUDIT   → lead re-runs `npm run audit` (ACLI/Forge/REST/      │
│               native-Automation snapshots) to refresh the delta.  │
│                                                                   │
│  2. PLAN    → lead walks the fresh audit + TASK_BOARD.md and      │
│               updates the shared task list (unblocks, assigns,    │
│               splits, closes). Names the native owner per task.   │
│                                                                   │
│  3. TOOL-UP → before touching ANY Atlassian surface, the owner    │
│               loads the matching skill under `skills/` and        │
│               verifies the API/CLI/GraphQL/manifest specifics      │
│               against current docs via Context7 (ctx7). Never      │
│               code Atlassian details from memory. The skill +      │
│               ctx7 topic named on the task (per _CONVENTIONS §7)   │
│               are loaded before the first line is written.         │
│                                                                   │
│  4. BUILD   → owners claim unblocked tasks and produce native     │
│               wrappers, golden-template definitions, audit/verify │
│               scripts, tests, and docs. No hand-written evidence. │
│                                                                   │
│  5. APPLY   → mutations route through the native owner: ACLI      │
│               (`jira project/workitem/field/filter/dashboard`),   │
│               golden-template clone, Forge deploy/install, or     │
│               native Jira Automation import. Idempotency tested   │
│               immediately by re-running and asserting no delta.   │
│                                                                   │
│  6. VERIFY  → `npm run infra:verify` (read-only audit harness)    │
│               diffs native output against declared/golden state   │
│               and produces JSON; the owning teammate reads it.    │
│                                                                   │
│  7. REVIEW  → safety-tester + native-architect cross-check the    │
│               diff. File findings as new tasks.                   │
│                                                                   │
│  8. LEARN   → lead updates STATUS.md. Decides whether to spawn    │
│               a specialist (acli-spike / jira-rest-spike) or      │
│               rebalance.                                          │
│                                                                   │
│  9. LOOP    → next tick.                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Tick invariants

Before starting the next tick the lead confirms:

1. No uncommitted changes the in-flight teammate did not announce.
2. Every task marked `completed` this tick has a file under `evidence/` produced by a script
   (preferably parsing native `--json` output) and referenced by task id.
3. No teammate is idle. If the board is empty, the lead re-runs `npm run infra:plan` and
   `npm run infra:verify` (read-only audit) to surface drift; any red row becomes a new task.
4. `STATUS.md` is updated or explicitly deferred in the mailbox.
5. `evidence/safety-refusals.json` is either absent or has been read by `safety-tester` this
   tick.

## Convergence rules

- **Skill + ctx7 before code.** No owner writes an Atlassian REST path, CLI flag, GraphQL query,
  or manifest key from memory. The TOOL-UP step is mandatory and load-bearing: load the matching
  skill under `skills/` and confirm the specifics against current docs via Context7 (`ctx7`)
  before BUILD. The surface→skill→ctx7 mapping is the canonical table in
  [`_CONVENTIONS.md`](../_CONVENTIONS.md) §7; the per-task skill + ctx7 topic is named on the task
  (TASK_BOARD / `nih-roadmap.md`). A task that touches an Atlassian surface with no skill + ctx7
  provenance recorded is rejected by the `TaskCompleted` gate G-SKILL-CTX7
  ([`QUALITY_GATES.md`](QUALITY_GATES.md)).
- **Native owner first.** For every Jira concern, the apply step uses the native owner from the
  Native Tool Fit Matrix (ACLI command, golden-template clone, Forge, native Automation
  import). Custom code is added only for a documented gap (`_CONVENTIONS.md` §1). "We already
  built it" is not a reason.
- **Declaration-first.** The golden template and the `infra/` declaration are the source of
  truth. Anything not declared is not applied. To add a Jira resource, edit the golden-template
  definition / declaration first, open the apply task second.
- **Plan before apply.** Every significant apply (new workflow, new rule, destructive action)
  runs the read-only `plan` first; the output is attached to the task as evidence of intent.
- **`infra/` stays read-only.** `infra:plan`/`infra:verify` audit and diff; they do not mutate.
  Promoting any audit script to a mutating converge engine is plan-approval-gated
  ([`TEAM_CHARTER.md`](TEAM_CHARTER.md)) and blocked until T-NIH-03 (ACLI inventory) and
  T-NIH-04 (golden-template validation) complete.
- **Idempotency is a release-blocker.** If an apply path (ACLI wrapper, clone, Forge) mutates
  on the second consecutive run without a declaration change, the task is reopened until fixed.
- **No private endpoints on the apply path.** Native Automation import goes through the UI
  export/import or a documented public API. The internal automation API is never used to
  converge a supported resource (NIH theme 1).
- **Red VM row blocks dependent tasks.** The lead does not close a milestone while any VM row
  for that milestone is red or unmeasured.

## Anti-stall rules (what went wrong in v1)

- **No manual fallbacks.** If a teammate proposes "ask the operator to …" as an acceptance
  bullet, the lead rejects the plan and asks for a script + exit code (or a native CLI command).
- **No speculative evidence.** Teammates do not write `evidence/*.md` by hand. They write a
  script; the script writes the file. `TaskCompleted` hook enforces this.
- **No paste-capture evidence.** Screenshots, pasted navigation paths, and UI descriptions are
  rejected.
- **No "verify by reading."** A verifier script must diff and assert, not describe.
- **No re-implementing native capability.** If a teammate is about to hand-build a parser/diff/
  prioritizer/ADF builder that ACLI `--json`, Forge CLI `--json`, JQL, JPD, or
  `@atlaskit/adf-utils` already owns, the lead reroutes to the native surface (NIH themes 2 & 5).
  Behavior-changing swaps are plan-approval-gated.
- **No stuck teammate.** If a teammate is blocked on an unknown ACLI command surface for > 15
  active minutes, the lead spawns an `acli-spike`; on an unknown Jira REST endpoint, a
  `jira-rest-spike` — each proves the surface, records it (inventory or `scripts/lib/jira.mjs`
  method), then shuts down.

## Escalation (when to ping the human)

Escalate in-chat (but keep working on other tasks) when:

- A Jira capability is provably missing from both ACLI and documented REST (exit code 5 from a
  verifier) and blocks a VM row. Attach the script output, mark the row
  `unsupported-by-platform` with a blocker file, continue with other tasks. The documented
  fallback is REST or a golden-template clone — never an internal API.
- A safety-contract conflict appears in the operator's request. Refuse in-chat, log to
  `evidence/safety-refusals.json`, continue.
- A destructive apply, an internal-endpoint usage, or a behavior-changing NIH refactor is
  required to converge. Post the plan; wait for `AIGO_HUMAN_APPROVED=<task-id>` instead of
  silent consent.

Never halt the whole team on one escalation. Park the specific task, keep moving on everything
else.

## Definition of milestone complete

A milestone is complete when:

- All its tasks are `completed` with scripted evidence sourced from native output.
- Every VM row touching that milestone is green or `unsupported-by-platform` with a blocker
  file.
- `native-architect` posts a one-paragraph milestone summary to the lead; lead updates
  `STATUS.md`.
