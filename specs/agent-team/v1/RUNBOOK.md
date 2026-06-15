# Operator Runbook

This runbook is for the **human operator** who starts the team and checks in
on it periodically. It is not for teammates.

## Prerequisites (verify once, before launch)

```bash
claude --version                  # must be >= 2.1.32
node --version                    # 22.x or 24.x
forge --version && forge whoami   # authenticated
which acli && acli --version      # optional, used for Jira ops
which jq tmux                     # tmux recommended for split panes
gh auth status                    # if CI evidence is expected
```

Enable agent teams globally (operator setting), then drop into the repo:

```bash
mkdir -p ~/.claude
# merge with existing settings if any
jq -s '.[0] * .[1]' ~/.claude/settings.json <(cat <<'JSON'
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "teammateMode": "auto"
}
JSON
) > ~/.claude/settings.json.new && mv ~/.claude/settings.json.new ~/.claude/settings.json

cd /path/to/jira-marketing-agents
# Copy the spec bundle into the repo so teammates can read it:
mkdir -p specs/agent-team .claude/hooks evidence
cp /tmp/outputs/*.md specs/agent-team/
# install hooks (contents are inside QUALITY_GATES.md)
# (the lead will also do this on first tick if you forget)
```

Start Claude Code from the repo root:

```bash
tmux new -s aigo        # optional, recommended
claude
```

Then paste the **Launch Prompt** from `LAUNCH_PROMPT.md`.

## Status template (`STATUS.md`)

The lead maintains this file at repo root. Use this template:

```markdown
# AIGO Agent-Team Status

_Last updated: <UTC timestamp>_
_Current tick: <N>_

## Milestone
- Active: M<x> — <title>
- Next: M<x+1> — <title>

## Top 3 risks
1. ...
2. ...
3. ...

## Recent completions (last 10)
- T-... — <title> (owner:..., evidence:...)

## In-flight
| Task | Owner | Status | Since |
| ---- | ----- | ------ | ----- |

## Blocked / awaiting human
- ...
```

## Periodic check-in playbook

Every ~30 minutes, the operator:

1. Opens `STATUS.md`. Confirms the tick counter increased.
2. Skims `evidence/blockers.md`. If anything is parked waiting on the
   operator, respond in-chat to the lead with a decision.
3. Glances at the teammate list (Shift+Down in in-process mode, or the
   tmux panes). Spot-check whoever has been silent longest.
4. Asks the lead: `"Lead: summarize progress and next three tasks."`

## When to intervene

- **Safety**: if `evidence/safety-refusals.md` grows, read it; decide.
- **Scope drift**: if a teammate wants to broaden Forge scopes or add
  Terraform resources, confirm the plan before approval.
- **Cost**: agent teams burn tokens quickly. If you need to pause, tell the
  lead: `"Pause the team; leave state intact."` The lead will post a
  paused-state note and stop claiming tasks.

## Resuming a paused/crashed session

Agent teams do **not** fully restore on `/resume`. If the session crashes:

1. Start Claude Code fresh.
2. Paste the Launch Prompt again but add:
   `"Resume: read STATUS.md and evidence/ then rebuild the team. Do not
   redo completed tasks."`
3. The new lead will re-spawn the seven teammates and resume from
   `STATUS.md`.

## Clean up

Only after the lead reports `evidence/DONE.md` and the human is satisfied:

```text
Lead: shut down each teammate one by one, then clean up the team.
```

If a tmux session lingers:

```bash
tmux ls
tmux kill-session -t <session-name>
```
