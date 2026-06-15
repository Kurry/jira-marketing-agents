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
  echo "REJECT: scope changes require architect+safety plan approval." >&2
  echo "Open a plan-approval task instead and link it." >&2
  exit 2
fi

exit 0
