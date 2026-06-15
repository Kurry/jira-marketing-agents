# Agent-Team Specs for Jira AI Growth Ops (AIGO)

This directory converts the original MVP + outcome-roadmap specs from
`specs/{requirements,design,tasks,outcome-roadmap}.md` into a **long-horizon,
self-coordinating task plan** that a Claude Code Agent Team can execute
continuously until the system is fully functional against the staging Jira
site.

Read in this order:

1. `MISSION.md` — single-page statement of the goal, scope, safety contract,
   and the definition of "done".
2. `TEAM_CHARTER.md` — team composition, roles, ownership boundaries, display
   mode, models, and how teammates communicate.
3. `OPERATING_LOOP.md` — the forever-loop the team runs (plan → build →
   verify → review → learn → re-plan) and the global stop conditions.
4. `TASK_BOARD.md` — the shared task list, with dependencies, acceptance
   evidence, and `[owner]` tags. This is the source of truth the lead uses to
   seed the shared task list.
5. `VERIFICATION_MATRIX.md` — the exact commands, artefacts, and Jira/Rovo
   checks that a task must emit to be marked complete.
6. `QUALITY_GATES.md` — optional hooks/gate definitions (TaskCompleted,
   TeammateIdle, TaskCreated) that keep the loop honest.
7. `RUNBOOK.md` — the operator-facing runbook for starting, steering, and
   cleaning up the team.
8. `LAUNCH_PROMPT.md` — the exact paste-in prompt to start the team.

These files are designed so the lead and every teammate can open them,
understand the whole system, and continue the work without further context
from the human operator.
