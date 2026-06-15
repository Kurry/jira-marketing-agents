# Quality Gates (v2 hooks)

Date: 2026-06-15
Status: Proposal — re-alignment of the TaskCompleted/TaskCreated gates to the native-first refactor.
Supersedes: `specs/agent-team/QUALITY_GATES.md` (v1 at `specs/agent-team/v1/QUALITY_GATES.md`).

These hooks enforce IaC discipline at the tool level. Install them under
`.claude/hooks/` and `chmod +x`. They block mis-shaped task transitions with
`exit 2` and send feedback to the teammate.

Reference: Claude Code hooks — https://docs.claude.com/en/hooks
(`TeammateIdle`, `TaskCreated`, `TaskCompleted`).

## What changed from v1

The v1 gates already rejected the core banned patterns (human-click steps,
screenshots-as-evidence, missing `generated_by`, scope-broadening). Those are
**preserved verbatim** — this is a re-alignment, not a relaxation. v2 adds
three gates that enforce the NIH resolutions from `specs/v2/_CONVENTIONS.md §3`
and `specs/nih-review-2026-06-15.md`:

- **G-NATIVE-OWNER** — a refactor task that touches a platform concern must name
  the Atlassian-native owner (TaskCreated).
- **G-NO-INTERNAL-API** — no supported path may depend on a private/internal
  Atlassian endpoint or reverse-engineered ACLI keychain auth (TaskCompleted +
  CI scan).
- **G-WEBTRIGGER-NEQ-NATIVE** — webtrigger reachability may not be presented as
  proof of native Jira Automation/Rovo invocation (TaskCompleted).
- **G-SCRIPT-LABEL** — a task that adds or edits a supported `scripts/*`
  entrypoint must give it exactly one T-NIH-07 label (native wrapper /
  documented API gap / Twin-specific logic) bound to a native owner or
  documented endpoint (TaskCompleted + CI scan).

The safety contract (`_CONVENTIONS.md §5`) is unchanged and never weakened.

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

## `.claude/hooks/task-completed.sh` — reject non-scriptable evidence + NIH violations

```bash
#!/usr/bin/env bash
# Block completion unless the task has scripted evidence and respects the
# native-first / no-internal-API / webtrigger!=native resolutions.
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

# 4. G-NO-INTERNAL-API: no supported-path evidence may depend on a private
#    Atlassian endpoint or reverse-engineered keychain auth. Hits are allowed
#    ONLY inside a file/object explicitly marked experimental (NIH theme 1).
internal_re='gateway/api/automation/internal-api|rest/cb-automation|keychain'
while IFS= read -r file; do
  if grep -Eiq "$internal_re" "$file"; then
    if ! grep -Eiq 'experimental|non-default|platform-blocker' "$file"; then
      echo "REJECT: $file references an internal/private Atlassian endpoint or" >&2
      echo "keychain auth on a supported path. Route through native Jira" >&2
      echo "Automation import/export + documented ATLASSIAN_TOKEN auth, or mark" >&2
      echo "it experimental with a platform-blocker note. See _CONVENTIONS.md S3." >&2
      exit 2
    fi
  fi
done <<< "$matches"

# 5. G-WEBTRIGGER-NEQ-NATIVE: a task that claims native Jira Automation/Rovo
#    invocation must cite native audit-log evidence, not webtrigger reachability.
if echo "$title" | grep -Eiq 'rovo|automation.*(invoke|wir|trigger|proof)'; then
  if grep -rilq 'webtrigger' $matches 2>/dev/null \
     && ! grep -rilq 'audit.?log\|automation.*audit' $matches 2>/dev/null; then
    echo "REJECT: $task_id presents webtrigger reachability as native" >&2
    echo "Automation/Rovo proof. Native proof = Jira Automation audit-log run." >&2
    echo "Track webtrigger-fallback and native audit-log evidence in separate" >&2
    echo "rows. Use 'manifest/install check', not 'guaranteed visible'." >&2
    exit 2
  fi
fi

# 6. G-SCRIPT-LABEL: if the task added/edited a supported scripts/* entrypoint,
#    every such script must carry exactly one T-NIH-07 label. The label set is
#    the three classes from atlassian-native-tools.md T-NIH-07.
label_re='nih-label:[[:space:]]*(native-wrapper|documented-api-gap|twin-specific)'
changed_scripts=$(git diff --name-only HEAD~1 2>/dev/null \
                    | grep -E '^scripts/.*\.(mjs|cjs|js|ts)$' || true)
while IFS= read -r s; do
  [[ -z "$s" ]] && continue
  case "$s" in scripts/lib/*|*.test.*) continue ;; esac
  if ! grep -Eiq "$label_re" "$s" 2>/dev/null; then
    echo "REJECT: $s has no T-NIH-07 label (native-wrapper / documented-api-gap" >&2
    echo "/ twin-specific). Label it and name the native owner or documented" >&2
    echo "endpoint it binds. See atlassian-native-tools.md T-NIH-07." >&2
    exit 2
  fi
  # A documented-api-gap script must NOT name a private endpoint as its binding.
  if grep -Eiq 'documented-api-gap' "$s" \
     && grep -Eiq "$internal_re" "$s" \
     && ! grep -Eiq 'experimental|non-default|platform-blocker' "$s"; then
    echo "REJECT: $s is labeled documented-api-gap but binds a private endpoint" >&2
    echo "on a supported path. Name the missing native/API capability instead." >&2
    exit 2
  fi
done <<< "$changed_scripts"

# 7. Safety escalations: if title hints at enabling automation or broadening
#    scopes, require explicit safety-tester sign-off in JSON.
if echo "$title" | grep -Eiq 'enable.*rule|broaden.*scope|approve.*claim|launch'; then
  if ! jq -es '.[] | select(.safety_tester=="approved")' \
        evidence/**/*.json >/dev/null 2>&1; then
    echo "REJECT: safety-tester approval not captured for $task_id." >&2
    exit 2
  fi
fi
exit 0
```

## `.claude/hooks/task-created.sh` — reject non-IaC task shapes + name the native owner

```bash
#!/usr/bin/env bash
#   $1 title, $2 owner, $3 deps, $4 acceptance
set -euo pipefail
title="${1:-}"
acceptance="${4:-}"

# Ban manual-UI language (human-click steps).
banned='(paste|screenshot|navigate|click|ui check|open.*jira|ask the (user|operator|human))'
if echo "$title" | grep -Eiq "$banned"; then
  echo "REJECT: task title implies manual UI work. Rewrite as a script." >&2
  echo "See IAC_PRINCIPLES.md 'Banned patterns'." >&2
  exit 2
fi

# Ban tests that assert true / are skipped.
if echo "$title $acceptance" | grep -Eiq 'assert.*true|xit\(|describe\.skip|skip.*test'; then
  echo "REJECT: a test that asserts true or is skipped is not a test." >&2
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

# G-NATIVE-OWNER: a task touching a platform concern must name the Atlassian-
# native owner (NIH theme: native-first, _CONVENTIONS.md S1/S2).
if echo "$title" | grep -Eiq '\b(field|issue.?type|status|workflow|filter|dashboard|automation|rovo|screen|segment|partner|service)\b'; then
  if ! echo "$acceptance" | grep -Eiq 'ACLI|Jira REST|golden template|Forge|JPD|JSM Assets|Confluence|Analytics|Goals|native owner|documented (endpoint|API)'; then
    echo "REJECT: this task touches a platform concern but names no Atlassian-" >&2
    echo "native owner. Name the native owner (ACLI / golden template / Forge /" >&2
    echo "JPD / Assets / REST) or justify the custom code against the four" >&2
    echo "allowed reasons. See _CONVENTIONS.md S1-S2 and nih-roadmap.md." >&2
    exit 2
  fi
fi

# Ban private-endpoint dependence as a supported path at task-creation time.
if echo "$title $acceptance" | grep -Eiq 'gateway/api/automation/internal-api|rest/cb-automation|keychain'; then
  if ! echo "$title $acceptance" | grep -Eiq 'experimental|non-default|platform-blocker|remove|purge'; then
    echo "REJECT: do not create supported-path tasks on private Atlassian" >&2
    echo "endpoints or keychain auth. See _CONVENTIONS.md S3 theme 1." >&2
    exit 2
  fi
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
if [[ -f specs/v2/agent-team/TASK_BOARD.md ]]; then
  if grep -E '^- \*\*T-' specs/v2/agent-team/TASK_BOARD.md >/dev/null 2>&1; then
    echo "WAKE: claim the next unblocked task from TASK_BOARD.md or run infra:plan to surface drift." >&2
    exit 2
  fi
fi

# Fallback: re-run verify to surface drift.
echo "WAKE: run 'npm run infra:verify' and open a task on any red row." >&2
exit 2
```

## Lead approval rubric (restated, with NIH resolutions)

The lead rejects a plan when any of these hold; otherwise approves:

- Acceptance includes human action, screenshots, or a navigation path.
- A "Run" field that is not a command, or needs interactive input.
- Evidence path is not produced by a repo script (or is not deterministic on re-run).
- Script violates `SCRIPTS_CONTRACT.md` (prompts, reads stdin, no exit-code
  contract, no JSON report).
- Touches non-staging / production.
- Broadens Forge scopes.
- Enables an Automation rule before VM-AUTOMATION-AUDIT is green from a **native**
  audit-log run.
- A test asserts `true`, or is skipped (`xit` / `describe.skip`).
- Lowers test coverage, disables safety tests, or skips CI.
- **NIH-1:** depends on a private/internal Atlassian endpoint or reverse-engineered
  keychain auth as a *supported* path (experimental + platform-blocker note required otherwise).
- **NIH-native-owner:** touches a platform concern without naming the Atlassian-native owner.
- **NIH-4:** presents webtrigger reachability as proof of native Automation/Rovo
  invocation, or uses "guaranteed visible" where only a manifest/install check ran.
- **NIH-7:** adds or edits a supported `scripts/*` entrypoint without exactly one
  T-NIH-07 label, or labels a script `documented-api-gap` while it binds a
  private endpoint on a supported path.
- Builds a per-resource converge engine before T-NIH-03 (ACLI inventory) and
  T-NIH-04 (golden-template validation) are green.
- Destructive without `AIGO_DESTRUCTIVE=1` + `AIGO_CONFIRM` (and, for
  project/workflow-scheme/rule delete or `forge uninstall`, explicit human
  operator approval).

## CI parity with hooks

`.github/workflows/ci.yml` re-runs the same reject logic the hooks do locally:
reject images under `evidence/`, require `generated_by:` on all evidence files,
scan the supported path for internal/private endpoints and keychain auth, fail
if any `evidence/*` claims native Automation/Rovo proof from webtrigger output,
and fail if any supported `scripts/*` entrypoint lacks its single T-NIH-07
label. This keeps manual artefacts and NIH regressions out via CI as well as
locally.
