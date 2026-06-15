# Operator Runbook (v2)

You (the human) kick the team off with the prompt in `LAUNCH_PROMPT.md`
and then check in periodically. The team does not require you to click
anything in Jira. If it tells you to, stop it and tell it to re-read
`IAC_PRINCIPLES.md`.

## Pre-flight

```bash
claude --version                   # >= 2.1.32
node --version                     # 22 or 24
forge --version && forge whoami    # authed
acli --version || jira --version   # one of them, authed
gh auth status
```

Enable agent teams once, globally:

```bash
mkdir -p ~/.claude
tmpfile=$(mktemp)
cat > "$tmpfile" <<'JSON'
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "teammateMode": "auto"
}
JSON
jq -s '.[0] * .[1]' ~/.claude/settings.json "$tmpfile" \
  > ~/.claude/settings.json.new && mv ~/.claude/settings.json.new ~/.claude/settings.json
rm "$tmpfile"
```

Copy the v2 specs into the repo (the team reads them from here):

```bash
cd /path/to/jira-marketing-agents
mkdir -p specs/agent-team .claude/hooks evidence
# v2 specs (drop the old ones into a v1/ dir for audit reference)
mkdir -p specs/agent-team/v1
[[ -d specs/agent-team ]] && find specs/agent-team -maxdepth 1 -name '*.md' \
  -exec mv {} specs/agent-team/v1/ \;
cp /tmp/outputs/*.md specs/agent-team/
cp -r /tmp/outputs/v1 specs/agent-team/v1/ 2>/dev/null || true
```

Start Claude Code:

```bash
tmux new -s aigo-v2         # recommended for split panes
claude
```

Paste the `LAUNCH_PROMPT.md` contents.

## What to watch

- `STATUS.md` at the repo root — updated every ~20 minutes by the lead.
- `evidence/audit/summary.json` — after the first audit tick. Tells you
  exactly what the team will do next.
- `evidence/verify/run-all.json` — the current state of every VM row.
- `evidence/blockers/` — if this directory gains files, read them.

## Useful operator commands

```bash
# Is the mission done?
jq -r '.summary' evidence/DONE.json 2>/dev/null \
  || echo "not done yet; see evidence/verify/run-all.json"

# What is still red?
jq -r '.rows[] | select(.status!="green") | "\(.id)\t\(.status)\t\(.reason)"' \
  evidence/verify/run-all.json

# What did the team do in the last hour?
git log --since='1 hour ago' --oneline

# Manual plan/apply/verify (same commands the team uses)
npm run infra:plan
npm run infra:apply
npm run infra:verify
```

## When to intervene

- **Team asks you for a UI action** → tell them to re-read
  `IAC_PRINCIPLES.md` and write a script instead.
- **Blocker file under `evidence/blockers/`** → open it, decide,
  reply in chat. If the blocker is a missing Jira REST endpoint,
  confirm they should commit a `scripts/lib/...` method that fails
  with exit code 5 and mark the VM row unsupported-by-platform.
- **Team proposes destructive action** → either approve in chat with
  `AIGO_HUMAN_APPROVED=<task-id>` or decline.
- **Team stalls** → `"lead: run 'npm run infra:plan' and re-plan the
  board from the output"`.

## Pause / resume

Agent teams don't fully restore after `/resume`. To pause:

```text
lead: pause the team; flush STATUS.md and evidence; do not claim any
new tasks.
```

To resume from a fresh session, paste the Launch Prompt again with:

```text
RESUME: read STATUS.md and evidence/audit/summary.json. Do not redo
completed tasks. Re-spawn teammates and continue.
```

## Clean up

Only after `evidence/DONE.json` exists and you are satisfied:

```text
lead: shut down every teammate one at a time, then clean up the team.
```

Tmux leftovers:

```bash
tmux ls
tmux kill-session -t <name>
```
