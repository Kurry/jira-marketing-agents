# Quality Gates (Claude Code hooks)

These hooks turn the invariants in `OPERATING_LOOP.md` into *enforced* rules.
The lead should install them under `.claude/hooks/` at startup. Each hook is
a small shell/node script; exiting `2` blocks the action and sends feedback.

> Reference: Claude Code hooks — TeammateIdle, TaskCreated, TaskCompleted
> (see https://docs.claude.com/en/hooks).

## `TaskCompleted` — require evidence before closing a task

Path: `.claude/hooks/task-completed.sh`

```bash
#!/usr/bin/env bash
# $1 = task-id, $2 = task-title, $3 = owner, $4 = team-dir
set -euo pipefail
task_id="${1:?task id}"
owner="${3:-unknown}"

evidence_dir="evidence"
# A task is complete only if at least one file exists under evidence/ that
# references its id, OR the task is one of the continuous tasks T-CX-*.
case "$task_id" in
  T-CX-*) exit 0 ;;
esac

if ! grep -r --include='*.md' --include='*.log' --include='*.json' \
      -l "$task_id" "$evidence_dir" >/dev/null 2>&1; then
  echo "REJECT: task $task_id has no evidence file referencing its id." >&2
  echo "Add a file under evidence/<milestone>/ that mentions $task_id." >&2
  exit 2
fi

# Safety guard: if the task title hints at Automation enablement, require
# safety-reviewer initials in the evidence.
if echo "$2" | grep -Eiq 'enable|activate|claims.*approv'; then
  if ! grep -l "safety-reviewer: approved" evidence/safety/*.md \
        >/dev/null 2>&1; then
    echo "REJECT: safety-reviewer approval not found for $task_id." >&2
    exit 2
  fi
fi
exit 0
```

## `TeammateIdle` — never let a teammate truly idle

Path: `.claude/hooks/teammate-idle.sh`

```bash
#!/usr/bin/env bash
# $1 = teammate-name
set -euo pipefail
name="${1:?}"

# Continuous roles never idle — re-wake them to their standing task.
case "$name" in
  docs-writer|safety-reviewer|qa-verifier|lead)
    echo "WAKE: $name has a continuous task (see TASK_BOARD.md T-CX-*)." >&2
    exit 2
    ;;
esac

# Anyone else: if the board has any unblocked task, push them to claim one.
if grep -E '^- \*\*T-' specs/agent-team/TASK_BOARD.md \
     | grep -Eqv 'deps:(T-[A-Z0-9-]+)'; then
  echo "WAKE: $name should claim the next unblocked task." >&2
  exit 2
fi
exit 0
```

## `TaskCreated` — keep task shape consistent

Path: `.claude/hooks/task-created.sh`

```bash
#!/usr/bin/env bash
# $1 = title, $2 = owner, $3 = deps, $4 = acceptance-path
set -euo pipefail

if [[ -z "${2:-}" ]]; then
  echo "REJECT: task missing owner. Use owner:<teammate-name>." >&2
  exit 2
fi

# Reject tasks that would widen Forge scopes without architect + safety
# approval referenced in the description.
if echo "$1" | grep -Eiq 'add.*scope|broaden.*permission'; then
  echo "REJECT: scope changes require architect+safety plan approval."   >&2
  echo "Open a plan-approval task instead and link it." >&2
  exit 2
fi

exit 0
```

## Settings snippet

Add to `~/.claude/settings.json` (or the project's `.claude/settings.json`):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "TaskCompleted": ".claude/hooks/task-completed.sh",
    "TeammateIdle": ".claude/hooks/teammate-idle.sh",
    "TaskCreated": ".claude/hooks/task-created.sh"
  }
}
```

## Plan-approval criteria (applied by the lead)

The lead should **reject** a teammate plan with feedback when any of these
hold; otherwise approve:

- Plan modifies `manifest.yml` scopes without safety-reviewer sign-off.
- Plan disables tests, lowers coverage, or skips CI.
- Plan edits a prompt's claims/safety language without a linked
  `policies/` reference.
- Plan calls a destructive CLI (`forge uninstall`, workflow scheme delete,
  issue type delete, rule delete, project delete) without a rollback step.
- Plan proposes to enable an Automation rule before VM-AUTOMATION-VALIDATE
  evidence exists.
- Plan edits production systems. Only `development`/staging is allowed.

## Heartbeat

Lead should schedule an internal "heartbeat" every ~10 minutes (via a tool
call that reads `STATUS.md`) to:

1. Pick up TeammateIdle signals that did not surface as feedback.
2. Update `STATUS.md`.
3. Check `evidence/blockers.md` for unresolved items.
