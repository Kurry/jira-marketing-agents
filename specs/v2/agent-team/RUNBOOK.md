# Operator Runbook

Date: 2026-06-15
Status: Proposal — v2 re-alignment to the Atlassian-native / NIH-reduction direction.
Supersedes: `specs/agent-team/RUNBOOK.md`

You (the human) kick the team off with the prompt in [`LAUNCH_PROMPT.md`](LAUNCH_PROMPT.md) and
then check in periodically. The team does not require you to click anything in Jira. Every
mutating step the team takes runs through a **native-first path** — Forge CLI, ACLI, native
Jira Automation import/export, golden-template clone, or documented Jira REST. If the team ever
tells you to navigate the Jira UI, paste a screenshot, or hit a private
`gateway/api/automation/internal-api` / `rest/cb-automation` endpoint on a supported path, stop
it and tell it to re-read [`IAC_PRINCIPLES.md`](IAC_PRINCIPLES.md) and
[`atlassian-native-tools.md`](../atlassian-native-tools.md).

## Pre-flight

```bash
claude --version                   # >= 2.1.32
node --version                     # 22 or 24
forge --version && forge whoami    # Forge CLI authed (app runtime / Rovo / manifest)
acli --version && acli jira auth status   # ACLI authed (project/workitem/field/filter/dashboard)
gh auth status                     # GitHub (source/CI; Bitbucket only after migration)
# Documented token auth for REST fallbacks (never a keychain-blob hack):
echo "${ATLASSIAN_TOKEN:?set ATLASSIAN_TOKEN for documented Jira REST fallback}" >/dev/null
# Optional, only if the Operations module is in scope:
terraform -version                 # for infra/terraform/atlassian-operations (JSM/Compass ops only)
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

Paste the [`LAUNCH_PROMPT.md`](LAUNCH_PROMPT.md) contents.

## What to watch

- `STATUS.md` at the repo root — updated every ~20 minutes by the lead.
- `evidence/audit/summary.json` — after the first audit tick. Tells you exactly what the team
  will do next, and which native owner each item routes to.
- `evidence/inventory/acli.json` — the ACLI capability inventory (T-NIH-03): what each `jira`
  command owns and where REST/template cloning is still needed.
- `evidence/verify/run-all.json` — the current state of every VM row (read-only audit).
- `evidence/blockers/` — if this directory gains files, read them.

## Useful operator commands

Native-first; these never touch a private endpoint.

```bash
# Is the mission done?
jq -r '.summary' evidence/DONE.json 2>/dev/null \
  || echo "not done yet; see evidence/verify/run-all.json"

# What is still red?
jq -r '.rows[] | select(.status!="green") | "\(.id)\t\(.status)\t\(.reason)"' \
  evidence/verify/run-all.json

# What did the team do in the last hour?
git log --since='1 hour ago' --oneline

# Audit harness (read-only): plan diffs native output, verify asserts every VM row.
npm run infra:plan     # read-only: diff ACLI/Forge/REST/native-Automation output vs declared
npm run infra:verify   # read-only: assert every VM row green; exit non-zero on red

# Native primitives the team applies through (operator can run these too):
forge deploy -e development && forge install list      # Forge app / Rovo agents
acli jira project view --json <KEY>                    # inspect a project's config
acli jira workitem search --jql '<JQL>' --json         # seed/coverage checks
acli jira field list --json                            # field inventory
acli jira filter list --json && acli jira dashboard list --json
# Native Jira Automation: export/import via the UI or documented API only.
# (No `gateway/api/automation/internal-api` / `rest/cb-automation` on a supported path.)
```

> Note: `infra:apply` is **not** an operator step in v2. Mutations route through the native
> owners above (ACLI / golden-template clone / Forge / native Automation import). The `infra/`
> harness is read-only until the converge-engine gate (T-NIH-03/04) is cleared with approval.

## When to intervene

- **Team asks you for a UI action or a screenshot** → tell them to re-read
  `IAC_PRINCIPLES.md` and use a native CLI/import path instead.
- **Team names a private endpoint** (`gateway/api/automation/internal-api`, `rest/cb-automation`)
  **on a supported path, or reverse-engineers ACLI keychain auth** → stop it; require the native
  alternative (UI export/import or documented public API) and documented `ATLASSIAN_TOKEN` auth.
  Internal usage is only ever experimental, non-default, and gated.
- **Blocker file under `evidence/blockers/`** → open it, decide, reply in chat. If the blocker
  is a missing Jira capability, confirm they tried ACLI **and** documented REST; the fallback is
  REST or a golden-template clone, never an internal API. The owning script should exit code 5
  and the VM row is marked `unsupported-by-platform`.
- **Team proposes a destructive action, an internal-endpoint usage, or a behavior-changing NIH
  refactor** (ADF library swap, JQL duplicate delegation, JPD/Assets field moves, promoting the
  audit harness to a converge engine, Terraform outside the Operations module) → these are
  plan-approval-gated; approve in chat with `AIGO_HUMAN_APPROVED=<task-id>` or decline.
- **Team stalls** → `"lead: run 'npm run infra:plan' and re-plan the board from the output"`.

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
