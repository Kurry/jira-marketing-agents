# Quality Gates (v2 hooks)

These hooks enforce IaC discipline at the tool level. Install them under
`.claude/hooks/` and `chmod +x`. They block mis-shaped task transitions
with `exit 2` and send feedback to the teammate.

Reference: Claude Code hooks —
https://docs.claude.com/en/hooks (TeammateIdle, TaskCreated,
TaskCompleted).

## Settings snippet (merge into `~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "TaskCompleted": ".claude/hooks/task-completed.sh",
    "TaskCreated":   ".claude/hooks/task-created.sh",
    "TeammateIdle":  ".claude/hooks/teammate-idle.sh"
  }
}
```

## `.claude/hooks/task-completed.sh` — reject non-scriptable evidence

```bash
#!/usr/bin/env bash
# Block completion unless the task has scripted evidence.
#   $1 task-id, $2 task-title, $3 owner, $4 team-dir
set -euo pipefail
task_id="${1:?task id}"
title="${2:-}"
owner="${3:-unknown}"

# Continuous tasks never "complete".
case "$task_id" in
  T-CX-*) echo "REJECT: continuous task cannot be completed." >&2; exit 2 ;;
esac

# 1. There must be at least one evidence file referencing the task id.
matches=$(grep -rl --include='*.md' --include='*.json' --include='*.log' \
            "$task_id" evidence 2>/dev/null || true)
if [[ -z "$matches" ]]; then
  echo "REJECT: no evidence file references task id $task_id." >&2
  echo "Write a script; the script writes the evidence. See SCRIPTS_CONTRACT.md." >&2
  exit 2
fi

# 2. Every referenced evidence file must be script-generated.
while IFS= read -r file; do
  if [[ "$file" == *.json ]]; then
    if ! jq -e '.generated_by' "$file" >/dev/null 2>&1; then
      echo "REJECT: $file is JSON but missing top-level .generated_by." >&2
      exit 2
    fi
  elif [[ "$file" == *.md ]]; then
    if ! head -5 "$file" | grep -q 'generated_by:'; then
      echo "REJECT: $file is Markdown but missing 'generated_by:' header." >&2
      exit 2
    fi
  fi
done <<< "$matches"

# 3. Screenshots / image artefacts banned.
if find evidence -type f \( -iname '*.png' -o -iname '*.jpg' -o \
   -iname '*.jpeg' -o -iname '*.gif' \) 2>/dev/null | grep -q .; then
  echo "REJECT: image evidence is banned under evidence/." >&2
  exit 2
fi

# 4. Safety escalations: if title hints at enabling automation or
#    broadening scopes, require explicit safety-tester sign-off in JSON.
if echo "$title" | grep -Eiq 'enable.*rule|broaden.*scope|approve.*claim|launch'; then
  if ! jq -es '.[] | select(.safety_tester=="approved")' \
        evidence/**/*.json >/dev/null 2>&1; then
    echo "REJECT: safety-tester approval not captured for $task_id." >&2
    exit 2
  fi
fi
exit 0
```

## `.claude/hooks/task-created.sh` — reject non-IaC task shapes

```bash
#!/usr/bin/env bash
#   $1 title, $2 owner, $3 deps, $4 acceptance
set -euo pipefail
title="${1:-}"

# Ban manual-UI language.
banned='(paste|screenshot|navigate|click|ui check|open.*jira|ask the (user|operator|human))'
if echo "$title" | grep -Eiq "$banned"; then
  echo "REJECT: task title implies manual UI work. Rewrite as a script." >&2
  echo "See IAC_PRINCIPLES.md 'Banned patterns'." >&2
  exit 2
fi

# Ban scope-broadening tasks without explicit approval context.
if echo "$title" | grep -Eiq 'add.*scope|broaden.*permission'; then
  echo "REJECT: scope change requires a separate plan-approval task." >&2
  exit 2
fi

# Ban tasks targeting non-staging.
if echo "$title" | grep -Eiq 'production|prod|staging.*-> *prod|promote'; then
  echo "REJECT: production is out of scope for this mission." >&2
  exit 2
fi
exit 0
```

## `.claude/hooks/teammate-idle.sh` — nobody idles

```bash
#!/usr/bin/env bash
#   $1 teammate-name
set -euo pipefail
name="${1:?}"

# Continuous roles always have standing work.
case "$name" in
  lead|docs-scribe|safety-tester)
    echo "WAKE: $name has a continuous task (see TASK_BOARD.md T-CX-*)." >&2
    exit 2 ;;
esac

# If the shared board has any unblocked task, push the teammate to claim.
if [[ -f specs/agent-team/TASK_BOARD.md ]]; then
  if grep -E '^- \*\*T-' specs/agent-team/TASK_BOARD.md >/dev/null 2>&1; then
    echo "WAKE: claim the next unblocked task from TASK_BOARD.md or run infra:plan to surface drift." >&2
    exit 2
  fi
fi

# Fallback: re-run verify to surface drift.
echo "WAKE: run 'npm run infra:verify' and open a task on any red row." >&2
exit 2
```

## Lead approval rubric (restated)

The lead rejects a plan when any of these hold; otherwise approves:

- Acceptance includes human action, screenshots, or a navigation path.
- Evidence path is not produced by a script in the repo.
- Script violates `SCRIPTS_CONTRACT.md` (prompts, reads stdin, no
  exit-code contract, no JSON report).
- Touches non-staging / production.
- Broadens Forge scopes.
- Enables an Automation rule before VM-AUTOMATION-AUDIT is green.
- Lowers test coverage, disables safety tests, or skips CI.
- Destructive without `AIGO_DESTRUCTIVE=1` + `AIGO_CONFIRM`.

## CI parity with hooks

`.github/workflows/ci.yml` should re-run the same reject logic as the
hooks do locally (reject images under `evidence/`, require
`generated_by:` header on all evidence files). This keeps the team from
sneaking manual artefacts in via CI.
