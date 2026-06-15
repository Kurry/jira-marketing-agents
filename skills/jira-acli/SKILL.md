---
name: jira-acli
description: Drive Jira Cloud from the terminal with the Atlassian CLI (acli) — auth, and the acli jira workitem family (create, view, edit, search --jql, transition, comment, assign, link, bulk via CSV). Use when scripting Jira from a shell, authenticating with acli jira auth login, running JQL from the CLI, bulk-creating issues, or needing --json/--csv output. Exact flags must be confirmed with the acli workitem command's --help output.
---

# Atlassian CLI (acli) — Jira

`acli` is Atlassian's official command-line tool for Jira Cloud. Issues are called **work items**. This skill covers the `acli jira` command tree; treat live `--help` output as the source of truth since flags evolve.

## Install & auth

- Install per OS from the get-started guide (Homebrew `brew install acli`, apt/winget, or direct binary). Verify with `acli --version`.
- Authenticate: `acli jira auth login` (interactive — supply site/host, email, API token). Related: `acli jira auth status`, `acli jira auth switch` (multiple accounts), `acli jira auth logout`.
- acli stores credentials locally; it does not take a password — use an API token from id.atlassian.com.

## Core commands (`acli jira workitem`)

Subcommands: `create`, `create-bulk`, `view`, `edit`, `search`, `transition`, `assign`, `link`, `clone`, `delete`, `archive`/`unarchive`, `comment-create|list|update|delete|visibility`, `attachment-list|delete`, `watcher`.

```bash
# Create
acli jira workitem create --summary "New Task" --project "TEAM" --type "Task"
acli jira workitem create --from-json "workitem.json"          # full field control
acli jira workitem create --generate-json                       # scaffold a JSON template
# flags: -p/--project, -t/--type, -s/--summary, -d/--description (plain or ADF),
#        --description-file, -a/--assignee (email|accountId|@me|default),
#        -l/--label a,b, --parent, -f/--from-file, --from-json, -e/--editor, --json

# View
acli jira workitem view KEY-1 --json

# Edit
acli jira workitem edit --key "KEY-1" --summary "..." --assignee "@me"

# Search (JQL)
acli jira workitem search --jql "project = TEAM" --paginate
acli jira workitem search --jql "project = TEAM" --count
acli jira workitem search --jql "project = TEAM" --fields "key,summary,assignee" --csv
acli jira workitem search --jql "project = TEAM" --limit 50 --json
acli jira workitem search --filter 10001 --web
# flags: -j/--jql, --filter, -f/--fields, -l/--limit, --paginate, --count, --csv, --json, -w/--web

# Transition (uses status name, not transition ID)
acli jira workitem transition --key "KEY-1,KEY-2" --status "Done"
acli jira workitem transition --jql "project = TEAM" --status "In Progress"
acli jira workitem transition --filter 10001 --status "To Do" --yes
# flags: -k/--key, --jql, --filter, -s/--status, -y/--yes, --ignore-errors, --json

# Comment / assign / link
acli jira workitem comment-create --key "KEY-1" ...
acli jira workitem assign --key "KEY-1" --assignee "user@example.com"
acli jira workitem link ...
```

## Common workflows

1. **One-off issue:** `acli jira workitem create --project P --type Task --summary "..."`. For complex fields, run `--generate-json`, edit the file, then `--from-json file.json`.
2. **Bulk create from CSV/JSON:** `acli jira workitem create-bulk` — confirm the exact `--file`/`--csv` flag and column mapping with `acli jira workitem create-bulk --help` before running.
3. **Export a saved query:** `search --jql "..." --fields "..." --csv > out.csv`, or `--json` to pipe into `jq`.
4. **Move issues through workflow:** `transition --jql "..." --status "Done"` — note `transition` matches by target **status name**; if multiple transitions reach a status or the status is ambiguous, expect a prompt unless `--yes`.

## Gotchas / current changes

- `transition --status` takes the **status name**, not a numeric transition ID (unlike the REST `transitions` endpoint).
- `search` supports `--paginate` to walk all results; without `--limit` or `--paginate` you get a default page. `--count` returns only the number of matches.
- `--json` is available on most subcommands for machine parsing; default `search` fields are `issuetype,key,assignee,priority,status,summary`.
- Bulk verbs (`create-bulk`, `transition --jql`, `delete`, `archive`) operate on many items — exact flags differ per release. **Always confirm with `acli jira workitem <cmd> --help`** rather than guessing.
- `acli` also has `jira project`, `jira field`, `jira filter`, `jira board`, `jira sprint`, `jira dashboard`, plus `admin` and `rovodev` trees.

## Safety

Read/draft by default — `view`, `search`, and `--count` are safe. `delete`, `archive`, bulk `transition --jql`/`create-bulk`, and any `--yes` that skips confirmation are destructive: require explicit human approval, prefer `--jql` previews (`search` first) before mutating, and never run against production without sign-off.

## References

- acli jira workitem index: https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem/
- create: https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-create/
- search: https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-search/
- transition: https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-transition/
- auth: https://developer.atlassian.com/cloud/acli/reference/commands/jira-auth/
- get started: https://developer.atlassian.com/cloud/acli/guides/how-to-get-started/
