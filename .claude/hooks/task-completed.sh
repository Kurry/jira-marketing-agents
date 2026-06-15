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
