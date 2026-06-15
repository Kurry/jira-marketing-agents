# Operating Loop (v2)

The team runs this loop forever until a stop condition in
`REVIEW_MISSION.md` is met. Each pass is a "tick" and is defined by the
state of the shared task list + the `evidence/` tree.

```
┌────────────────────────────────────────────────────────────────┐
│  TICK                                                          │
│                                                                 │
│  1. AUDIT   → lead re-runs `npm run audit` (or specific audit  │
│               scripts) to refresh the delta picture.           │
│                                                                 │
│  2. PLAN    → lead walks the fresh audit + TASK_BOARD.md and   │
│               updates the shared task list (unblocks, assigns, │
│               splits, closes).                                 │
│                                                                 │
│  3. BUILD   → owners claim unblocked tasks and produce         │
│               scripts, declarations, tests, and docs. No       │
│               hand-written evidence.                           │
│                                                                 │
│  4. APPLY   → the owning teammate runs the relevant            │
│               `scripts/infra/*-apply.mjs`. Idempotency tested  │
│               immediately by re-running and asserting no delta.│
│                                                                 │
│  5. VERIFY  → `npm run infra:verify` or a focused subset       │
│               produces JSON; the owning teammate reads it.     │
│                                                                 │
│  6. REVIEW  → safety-tester + iac-architect cross-check the    │
│               diff. File findings as new tasks.                │
│                                                                 │
│  7. LEARN   → lead updates STATUS.md. Decides whether to spawn │
│               a specialist or rebalance.                       │
│                                                                 │
│  8. LOOP    → next tick.                                       │
└────────────────────────────────────────────────────────────────┘
```

## Tick invariants

Before starting the next tick the lead confirms:

1. No uncommitted changes the in-flight teammate did not announce.
2. Every task marked `completed` this tick has a file under
   `evidence/` produced by a script and referenced by task id.
3. No teammate is idle. If the board is empty, the lead re-runs
   `npm run infra:plan` and `npm run infra:verify` to surface drift;
   any red row becomes a new task.
4. `STATUS.md` is updated or explicitly deferred in the mailbox.
5. `evidence/safety-refusals.json` is either absent or has been read
   by `safety-tester` this tick.

## Convergence rules

- **Declaration-first.** Apply scripts read from `infra/`. Anything not
  declared is not applied. To add a Jira resource, edit the YAML first,
  open the apply task second.
- **Plan before apply.** Every significant apply (new workflow, new
  rule, destructive action) runs `*-plan.mjs` first; the output is
  attached to the task as evidence of intent.
- **Idempotency is a release-blocker.** If `*-apply.mjs` mutates on the
  second consecutive run without a declaration change, the task is
  reopened until fixed.
- **Red VM row blocks dependent tasks.** The lead does not close a
  milestone while any VM row for that milestone is red or unmeasured.

## Anti-stall rules (what went wrong in v1)

- **No manual fallbacks.** If a teammate proposes
  "ask the operator to …" as an acceptance bullet, the lead rejects
  the plan and asks them to replace it with a script + exit code.
- **No speculative evidence.** Teammates do not write
  `evidence/*.md` by hand. They write a script; the script writes the
  file. `TaskCompleted` hook enforces this.
- **No paste-capture evidence.** Screenshots, pasted navigation paths,
  and UI descriptions are rejected.
- **No "verify by reading."** A verifier script must diff and assert,
  not describe.
- **No stuck teammate.** If a teammate is blocked on an unknown Jira
  REST endpoint for > 15 active minutes, the lead spawns a
  `jira-rest-spike` teammate whose task is only to prove the endpoint
  (commit a `scripts/lib/jira.mjs` method) and then shut down.

## Escalation (when to ping the human)

Escalate in-chat (but keep working on other tasks) when:

- A Jira capability is provably missing from REST (exit code 5 from a
  verifier) and blocks a VM row. Attach the script output. Continue
  with other tasks.
- A safety-contract conflict appears in the operator's request. Refuse
  in-chat, log, continue.
- A destructive apply is required to converge. Post the plan; wait for
  `AIGO_HUMAN_APPROVED=<task-id>` instead of silent consent.

Never halt the whole team on one escalation. Park the specific task,
keep moving on everything else.

## Definition of milestone complete

A milestone is complete when:

- All its tasks are `completed` with scripted evidence.
- Every VM row touching that milestone is green or
  `unsupported-by-platform` with a blocker file.
- `iac-architect` posts a one-paragraph milestone summary to the lead;
  lead updates `STATUS.md`.
