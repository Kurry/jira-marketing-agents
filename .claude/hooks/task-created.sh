#!/usr/bin/env bash
# Validates tasks on creation per QUALITY_GATES.md.
# Args passed by Claude Code: $1 = task subject/title
set -euo pipefail

TITLE="${1:-}"

# Reject tasks with manual-UI language in the title
if echo "$TITLE" | grep -Eiq 'paste|screenshot|navigate to|click|ui check|open jira|ask the (user|operator|human)'; then
  echo "REJECT: task title contains banned manual-UI language." >&2
  echo "IaC only — write a script instead of asking a human to click." >&2
  exit 2
fi

# Reject scope-widening tasks without a plan-approval reference
if echo "$TITLE" | grep -Eiq 'add.*scope|broaden.*permission'; then
  echo "REJECT: scope changes require architect+safety plan approval." >&2
  echo "Open a plan-approval task instead and link it." >&2
  exit 2
fi

# Reject tasks targeting production
if echo "$TITLE" | grep -Eiq '\bprod(uction)?\b' | grep -Eiqv 'staging|development|dev'; then
  echo "REJECT: task targets production. Staging only." >&2
  exit 2
fi

exit 0
