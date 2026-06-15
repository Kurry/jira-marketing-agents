# Troubleshooting Guide

Reference for diagnosing and resolving issues with the AI Growth Ops Forge/Rovo
app on `myhealthcaresite.atlassian.net`. Read this alongside
[`INTEGRATION.md`](INTEGRATION.md) and [`MVP_RUNBOOK.md`](MVP_RUNBOOK.md).

---

## 1. Rovo UI vs Forge install vs Automation — what each surface tells you

These three surfaces are independent. Confusion between them is the most common
source of wasted debugging time.

### What `forge install list` tells you

`forge install list` reports whether the Forge **app** (identified by the app id
in `manifest.yml`) is installed to a Jira Cloud site and whether the installed
version matches the last deployed version:

```
Site                              Product  Status
myhealthcaresite.atlassian.net    Jira     Up-to-date
```

`Up-to-date` means the Jira site has the current deployed version of the app.
`Not installed` means `forge install` has never been run for this site, or it
was uninstalled. A version number mismatch means `forge deploy` was run but
`forge install --upgrade` was not.

`forge install list` does **not** prove that Rovo agents are visible to end
users, that automation rules are enabled, or that the Jira project is configured
correctly.

### How to verify agents are visible in the Rovo UI

Agent visibility in Rovo requires all of the following to be true simultaneously:

1. The app is deployed (`forge deploy -e development`) and installed
   (`forge install list` shows `Up-to-date`).
2. Rovo / Atlassian Intelligence is enabled for the site (admin → Atlassian
   Intelligence settings).
3. The `read:chat:rovo` scope was consented during `forge install
   --confirm-scopes`.

Navigation path to verify in the Jira UI:

> **Jira Settings (gear icon) → Apps → Manage apps → find "AI Growth Ops" →
> Rovo agents tab**

All 19 agents from `manifest.yml` (`rovo:agent` entries) should appear there.
You can also open any AIGO issue → open the **Rovo** chat panel → type the name
of an agent to confirm it appears as a suggestion.

### How Automation rules relate to Rovo agents

Jira Automation rules and Rovo agents are **separate systems**. Automation rules
are configured in **Project settings → Automation** and run on Jira triggers
(issue created, transitioned, scheduled, etc.). A Rovo agent is a conversational
interface backed by this Forge app.

The connection is the **Use Rovo agent** Automation action: an Automation rule
can call a Rovo agent and capture its response in `{{agentResponse}}`, which a
subsequent **Add comment** step posts to the issue. This is the wiring used by
all five MVP Automation rules (Intake Triage, Creative Claims, Experiment Spec,
Employer Launch, Weekly Readout).

Rovo agents are **not** Automation rules and do not appear in the Automation
rules list. Automation rules do not appear in the Rovo agents tab.

### Webtrigger fallback vs native Automation proof

The Forge webtrigger (`fn-agent-webtrigger`) is a CLI-callable fallback that can
invoke the same domain logic and post AI-labeled Jira comments. Current
webtrigger evidence proves that fallback path is working.

It does **not** prove that Jira Automation invoked a Rovo agent. Native
Automation proof requires a Jira Automation audit-log row from a rule containing
the **Use Rovo agent** action, followed by the configured **Add comment** step.

### "Use agent" blocked by "your org admin needs to activate AI" (R-07 / BLK-02)

If the "Use agent" (Rovo AI) step in the Automation flow builder shows this
message, the org does not currently have Rovo/AI activated for this Jira site.
Current Atlassian docs say Rovo is included with paid Standard, Premium, and
Enterprise subscriptions, while Free subscriptions cannot use Rovo. The docs
also state that the organization must have at least one verified business
domain; orgs using only generic domains such as gmail.com cannot enable Rovo.

Do not assume Premium is the only fix until billing tier and domain eligibility
are confirmed in Atlassian Admin.

Official docs checked 2026-06-15:
- <https://support.atlassian.com/rovo/docs/rovo-usage-limits/>
- <https://support.atlassian.com/studio/docs/use-rovo-in-an-automation-rule/>
- <https://support.atlassian.com/rovo/docs/administer-atlassian-rovo-for-your-organization/>

**Observed check list (all confirmed on `myhealthcaresite.atlassian.net` 2026-06-15):**

| Location | What to look for | Observed result |
|---|---|---|
| admin.atlassian.com → Rovo → Beta features | "Rovo beta features" toggle | Already ON — not the blocker |
| admin.atlassian.com → Rovo → Access | Org/user blocklist | Empty — not the blocker |
| `myhealthcaresite.atlassian.net/jira/settings/system/labs` | "Atlassian Intelligence" toggle | Not present — only "Jira formula fields" |
| Jira admin → System settings sidebar | "Atlassian Intelligence" section | Not present |
| Jira admin search "atlassian intelligence" | Any result | No results |

**Resolution checklist:**
1. Confirm the exact Jira plan in Atlassian Admin / billing. If Free, upgrade to
   a paid Rovo-supported plan. If already paid Standard, continue with the
   remaining checks before assuming Premium is required.
2. Verify or claim a business domain for the organization if it currently relies
   on a generic email domain.
3. Enable Rovo / Atlassian Intelligence for the org and confirm the target Jira
   app has Rovo access.
4. Return to `skills/jira-automation-rovo-setup/SKILL.md` to complete T-M3-03.

**Workaround (no org activation):** Operators can invoke Rovo agents manually
via the Rovo chat sidebar while viewing any AIGO issue, if Rovo chat is
available. Automation integration remains deferred until the "Use Rovo agent"
Automation action can run.

---

## 2. Forge deploy and install troubleshooting

### Install status definitions

| `forge install list` output | Meaning | Action required |
|---|---|---|
| `Up-to-date` | Installed version matches the last deploy | None — proceed to Rovo UI check |
| `Not installed` | App never installed to this site | Run `forge install -e development -p jira --site <site> --confirm-scopes` |
| Version mismatch (e.g. `1.0.0` vs `1.0.1`) | Deploy ran but install did not upgrade | Run `forge install --upgrade -e development -p jira --site <site>` |

### Standard command sequence after any code or manifest change

```bash
forge lint
forge deploy -e development
forge install --upgrade -e development -p jira --site myhealthcaresite.atlassian.net
forge install list
```

Always run `forge lint` first. A manifest validation error (`forge deploy` will
also catch it, but `forge lint` gives clearer output before the upload attempt).

### Node version warning

The `manifest.yml` runtime is `nodejs22.x`. If you run the Forge CLI under
Node.js v26 (or any version outside 22.x or 24.x), the CLI may print a warning
such as:

```
Warning: Forge CLI is not tested on Node.js v26.x. Recommended: 22.x or 24.x.
```

This warning is cosmetic — the deploy and install will still succeed and the app
will run on the declared `nodejs22.x` runtime on Atlassian's platform, not on
your local Node version. Switch to Node 22 or 24 if the warning causes CI
failures or if you want a clean output.

### Common error: manifest.yml validation failures

If `forge deploy` fails with a manifest validation error, run `forge lint` first
to get the specific field path and message:

```bash
forge lint
```

Lint validates module keys, action references, function keys, scope declarations,
and prompt resource paths. Fix lint errors before re-attempting deploy. Common
causes:

- An `action` key listed in a `rovo:agent`'s `actions:` array does not match
  any `action.key` in the manifest.
- A `function.handler` references an export that does not exist in `index.ts`.
- A `resource` path points to a directory that doesn't exist.

---

## 3. Automation audit log

### Where to find the audit log

```
Project settings → Automation → select a rule → (three-dot menu or "Details")
→ Audit log
```

Or open the rule editor → click **View details** next to a recent run at the
bottom of the rule page. Each entry shows the trigger event, the issues
evaluated, the actions executed, and whether the rule succeeded or failed.

### What a successful Rovo agent action log looks like

A passing audit log entry for a rule that uses the **Use Rovo agent** action
will show:

- **Trigger:** the event that fired (e.g. "Issue created — AIGO-17")
- **Condition:** matched (e.g. issue type is "Creative Request")
- **Use Rovo agent:** `Completed` with the agent name and a truncated preview
  of the response
- **Add comment:** `Completed` — the `{{agentResponse}}` was written to the
  issue as a comment

The resulting comment on the Jira issue will be prefixed with
`🤖 AI Growth Ops (analysis only)`.

### What a failed `{{agentResponse}}` looks like vs a successful one

| State | Audit log entry | Comment on issue |
|---|---|---|
| Success | "Use Rovo agent: Completed" | Full structured analysis comment present |
| Agent error | "Use Rovo agent: Failed — agent returned an error" | No comment, or comment with error text |
| `{{agentResponse}}` empty | "Add comment: Completed" but comment is blank | Comment posted but contains only the label prefix with no body |
| Condition skipped | "Condition not met — rule did not run" | No comment |

An empty `{{agentResponse}}` usually means the agent ran but returned no
output, often because the issue context was too sparse (empty summary or
description) or the agent's JQL matched no issues (for the Weekly Readout rule).

### Creative Claims routing — "routed to Claims Review" vs "approved"

When the Creative Claims Automation rule runs on a `Creative Request` issue
transitioning to `Ready`:

- If the claims-risk analysis returns **Prohibited** or **Needs Human Review**,
  the rule transitions the issue to the **Claims Review** workflow status.
  This is **routing only** — it means a human reviewer must evaluate the issue
  before it can proceed. The agent never approves the claim.
- If the analysis returns **Compliant** (low risk), the issue stays in `Ready`
  or proceeds normally. The analysis comment is still posted.

"Routed to Claims Review" in the audit log means the routing step executed. It
does not mean the claim was approved or cleared. A human must review the issue
in the Claims Review queue and transition it forward.

---

## 4. Log-search recipes

### Retrieve recent logs

```bash
# Last hour of Forge function invocations (most common usage)
forge logs -e development --since 1h

# Last 24 hours with a higher line limit
forge logs -e development --since 24h --limit 100

# Specific time window (ISO 8601)
forge logs -e development --since 2026-06-14T09:00:00Z
```

### Filter for errors

```bash
# Print only lines containing "error" (case-insensitive)
forge logs -e development --since 1h | grep -i error

# Include context lines around errors
forge logs -e development --since 1h | grep -i -A 3 -B 1 error
```

### Search for a specific handler

Each Forge function handler maps to a TypeScript export in `index.ts`. Handler
names in logs match the `function.handler` values in `manifest.yml` (e.g.
`index.classifyGrowthIssue`, `index.reviewCreativeClaimsRisk`).

```bash
forge logs -e development --since 1h | grep classifyGrowthIssue
forge logs -e development --since 1h | grep reviewCreativeClaimsRisk
```

### Correlate a Forge log entry with a specific Jira issue

Forge log entries for Jira-triggered invocations typically include the issue
key in the payload. Search by issue key:

```bash
forge logs -e development --since 24h --limit 100 | grep "AIGO-17"
```

If you know the approximate time the issue was created or an Automation rule
fired, narrow the `--since` window to that time range and look for the handler
invocation immediately following the trigger event. The Automation audit log
timestamp and the Forge log timestamp should be within a few seconds of each
other.

---

## 5. Common issues and resolutions

| Symptom | Likely cause | Resolution |
|---|---|---|
| Agent not visible in Rovo | `forge install` not run after deploy, or `read:chat:rovo` scope not consented | Run `forge install list` → if not `Up-to-date`, run `forge install --upgrade -e development -p jira --site myhealthcaresite.atlassian.net --confirm-scopes`; confirm Rovo is enabled for the site |
| Automation rule "No response" / blank `{{agentResponse}}` | Agent key mismatch in the rule, or issue context is empty | Open the rule editor → verify the selected agent name matches the manifest `rovo:agent.name`; check that the trigger issue has a non-empty summary and description |
| `"addAnalysisComment" warning in forge lint` | `addAnalysisComment` is an `action` with `actionVerb: UPDATE` not wired to any `rovo:agent` module | Expected and safe to ignore — this action is called by Automation rules directly, not by agents; it is intentionally standalone |
| Claims agent says "Requires human review" | Working as intended — risky creative copy was detected | Route the issue to the Claims Review queue; a human must review and clear it before it can proceed |
| Agent visible in Rovo but returns no output | Issue context too sparse or JQL matched nothing | Add a substantive summary and description to the issue; for the Weekly Readout agent, verify the JQL returns issues in the Jira search |
| `forge deploy` fails with a manifest error | Manifest validation failure | Run `forge lint` first for the specific error; check action keys, function keys, and resource paths |
| `Jira API failed: 401` or `403` | Missing scope consent or wrong installation target | Re-run `forge install --confirm-scopes`; ensure admin account has Jira admin on the target site |
| `Jira API failed: 404` on `getIssueContext` | Bad issue key or app not installed to the project's site | Confirm the issue key is valid; ensure `forge install list` shows the correct site as `Up-to-date` |
| `test:readiness:jira` fails on missing issue types | AIGO project has only default team-managed types | Add the 12 AIGO issue types in Project settings → Issue types, then rerun; use `AIGO_READINESS_WARN_ONLY=1` for a non-blocking gap report |
| Node v26 warning from Forge CLI | CLI not tested on Node 26 | Functional but cosmetic; switch to Node 22 or 24 for a clean output (`nvm use 22`) |
| Automation rule runs but no comment appears | Actor account lacks comment permission, or `Add comment` step missing | Check rule audit log → verify the **Add comment** step exists after **Use Rovo agent** and that the actor account can comment on the project |
| Creative Claims rule routes to Claims Review unexpectedly | Copy contains flagged health claims language | Expected behaviour — review the claims-risk comment on the issue; consult `policies/claims-risk-policy.md` for compliant rewrites |

---

## 6. Related documentation

| Need | File |
|---|---|
| End-to-end install walkthrough | [`INTEGRATION.md`](INTEGRATION.md) |
| Operator checklist and live gaps | [`MVP_RUNBOOK.md`](MVP_RUNBOOK.md) |
| Multi-site provisioning | [`PORTABILITY.md`](PORTABILITY.md) |
| Current blockers and exit criteria | [`MVP_READINESS.md`](MVP_READINESS.md) |
| Release checklist | [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) |
| Safety and claims policy | [`../policies/claims-risk-policy.md`](../policies/claims-risk-policy.md) |
| Manifest (agent keys, action keys) | [`../manifest.yml`](../manifest.yml) |
| Automation rules | [`../automation/jira-automation-rules.md`](../automation/jira-automation-rules.md) |
