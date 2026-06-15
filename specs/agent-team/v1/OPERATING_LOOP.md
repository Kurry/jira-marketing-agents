# Operating Loop

The team runs the following loop forever until a stop condition in
`MISSION.md` is met. Each pass is a "tick". Ticks are not timed; they are
defined by the **state of the shared task list**.

```
┌─────────────────────────────────────────────────────────────────┐
│  TICK                                                           │
│                                                                  │
│  1. PLAN     → lead re-reads TASK_BOARD.md + STATUS.md + the    │
│                shared task list; creates/unblocks/reassigns.     │
│                                                                  │
│  2. BUILD    → owners claim unblocked tasks; produce diffs,     │
│                Jira changes, docs, evidence.                    │
│                                                                  │
│  3. VERIFY   → qa-verifier runs the commands from               │
│                VERIFICATION_MATRIX.md; appends results to       │
│                evidence/. Tasks are *not* complete until        │
│                evidence exists.                                  │
│                                                                  │
│  4. REVIEW   → safety-reviewer + architect cross-read each      │
│                completed task; raise objections as child tasks. │
│                                                                  │
│  5. LEARN    → lead updates STATUS.md; decides whether to       │
│                spawn specialist agents, rebalance, or escalate. │
│                                                                  │
│  6. LOOP     → back to PLAN. No idle stop. The lead never       │
│                declares "done" until DONE.md exists with green  │
│                final verification.                              │
└─────────────────────────────────────────────────────────────────┘
```

## Tick invariants

The lead **must** enforce these before starting the next tick. If any fails,
the next tick is entirely a remediation tick.

1. The working tree is either clean or has a single in-flight teammate's
   edits that were announced in the mailbox.
2. No commit on `HEAD~..HEAD` lacks a linked task id.
3. `STATUS.md` is updated or the lead posts a mailbox note explaining why
   (e.g. "all teammates busy; next update after verify").
4. No teammate has been idle without work (see TeammateIdle hook in
   `QUALITY_GATES.md`).
5. Every task that moved to `completed` this tick has an `evidence/` entry.
6. `evidence/safety-refusals.md` is empty, or a new entry was reviewed by
   `safety-reviewer`.

## Milestone sequencing (dependency gates)

The task board in `TASK_BOARD.md` partitions work into eight milestones.
The team may work on later milestones in parallel when the specific
dependencies below are satisfied; otherwise the lead must keep later work
blocked.

```
M0 Repo Baseline & CI
  └─► M1 Forge Deploy & Rovo Visibility (staging)
        └─► M2 AIGO Project Configuration (issue types, workflows, screens)
              └─► M3 Jira Automation Import & Validation
              └─► M4 Primary Agent Manual Validation (6 agents)
                    └─► M5 Outcome Workflows 1–10 (parallel tracks)
                          └─► M6 Dashboards, Queues, Filters
                                └─► M7 Docs, Runbooks, Release Checklist
                                      └─► M8 Final Verification & Handoff
```

Parallelization rules:

- `M4` and `M3` may run in parallel once `M2` unblocks them.
- Within `M5`, the 10 outcome tracks may run in parallel, one owner per
  track when possible (distribute across `forge-engineer`, `jira-admin`,
  `automation-eng`).
- `docs-writer` runs continuously from `M0`; they do not wait for the final
  milestone.
- `safety-reviewer` is always active; they hook into every PR-equivalent
  commit.

## Escalation protocol

When a teammate hits an ambiguous or destructive decision:

1. Write the question to the lead's mailbox with `#decision-needed` and a
   proposed default.
2. The lead consults `MISSION.md` safety contract + the task acceptance
   criteria + the roadmap. If the default is safe, the lead approves and
   logs under `evidence/decisions/`.
3. If unclear, the lead pings the human operator in the main chat and
   **does not wait** — the lead parks that specific task (status =
   `blocked-human`) and keeps other work moving.
4. The team continues even when a subset of tasks is parked. The lead only
   halts the loop when no unblocked tasks remain *and* at least one
   `blocked-human` exists. See Stop conditions in `MISSION.md`.

## Anti-stall rules

These are the behaviours the team most commonly drifts into; the lead must
counter each with the stated action.

- **Lead does work instead of delegating.** If the lead finds itself
  editing `src/` or calling Jira directly for anything other than CI/CD
  orchestration or evidence capture, it must stop and reassign. The only
  files the lead owns directly are `STATUS.md` and `evidence/index.md`.
- **Teammate runs long without check-ins.** A task larger than ~90 minutes
  of wall-clock activity must be subdivided by the owner + `architect`.
- **Teammate marks done without evidence.** The `TaskCompleted` hook
  rejects the transition (exit code 2) unless
  `evidence/<task-id>/` contains at least one file.
- **False green.** If `qa-verifier` sees tests passing but no behavioural
  evidence (e.g. unit test passes but no Jira smoke), they open a child
  task `"Add behavioural coverage for <X>"` and block the parent.
- **Same file, two teammates.** See `TEAM_CHARTER.md` parallel-work rules.

## How tasks are created

The lead seeds the shared task list from `TASK_BOARD.md` at startup. After
that, tasks may also be created by:

- `architect` when a design gap is discovered.
- `qa-verifier` when a verification fails (child task on the parent).
- `safety-reviewer` when a safety concern is raised.
- Any teammate via mailbox request to the lead; the lead decides whether
  to accept.

Every task must have: a short title, owner tag, dependency list,
acceptance evidence path, and a link back to `VERIFICATION_MATRIX.md` row
when applicable.
