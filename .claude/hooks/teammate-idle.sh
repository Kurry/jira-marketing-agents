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
