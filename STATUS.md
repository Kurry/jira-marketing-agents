# AIGO Agent-Team Status

_Last updated: 2026-06-15T06:20Z_
_Current tick: 5_

## Milestone
- Active: **M2/M3 transition** — IaC provisioning fixed; awaiting 2 UI steps
- M0 ✓ · M1 ✓ · M2 ✓ · IaC layer ✓ (fully corrected base URL + team-managed detection)
- Tests: **421 passing** (39 files) — unit + integration-mock (nock)
- Forge vars: 6 custom field IDs set (customfield_10043-10048) ✓
- Field options: 24 options provisioned (Segment, Primary Metric, Claims Risk, Workflow Area) ✓

## IaC provision-jira.cjs — now idempotent and correct
Fixed bugs discovered this tick:
- Was using `https://{site}` → now `https://api.atlassian.com/ex/jira/{cloudId}` (OAuth requires api.atlassian.com)
- Custom field discovery used non-paginated endpoint → now uses `/rest/api/3/field/search` (paginated)
- Status discovery used wrong endpoint → now scans ID range 10000-10100 in chunks of 50
- Issue types: documented hard limit — team-managed projects require Project Settings UI

## Jira instance state (live, verified 2026-06-15T06:20Z)
- Custom fields: customfield_10043 (Segment), 10044 (Primary Metric), 10045 (Claims Risk), 10046 (Experiment ID), 10047 (Workflow Area), 10048 (Priority Score) ✓
- Workflow statuses: 10003 (Intake), 10004 (Triage), 10005 (Spec Ready), 10006 (In Review), 10007 (Claims Review), 10008 (Experiment Running), 10009 (Decision Needed), 10010 (Launch Prep) ✓
- Field options: 24 options across 4 fields ✓
- Issue types: 3 built-in (Workstream, Task, Sub-task) — 14 canonical types MANUAL REQUIRED

## Blocked / awaiting human ← OPERATOR ACTION NEEDED
1. **T-M2-03b** — Go to `myhealthcaresite.atlassian.net` → AIGO → **Project Settings → Issue Types** → Add all 14 canonical types. *Reason: team-managed projects do not support issue type creation via REST API — proven by exhaustive testing this tick.*
2. **T-M1-04** — Go to `myhealthcaresite.atlassian.net` → **Apps → Rovo → Agents** → confirm all 19 agents are visible. Paste names here.

Once T-M2-03b done: T-M2-07 (seed import) → T-M3-02 (automation) → T-M4-01–06 (agent runs) unblock.

## Top 3 risks
1. **R-01 (Node v26):** forge CLI warns unsupported. All 421 tests pass. Low active risk.
2. **R-03 (Rovo UI visibility):** All 19 agents in manifest; browser confirmation still pending (T-M1-04).
3. **R-05 (Automation import scope):** `provision:automation` exits code 2 — admin scope needed. Workaround: operator imports via Jira UI.

## In-flight
| Task | Owner | Status |
| ---- | ----- | ------ |
| T-M1-04 | qa-verifier | PENDING OPERATOR |
| T-M2-03b | operator | PENDING OPERATOR |
| T-CX-02 | safety-reviewer | continuous |
| T-CX-03 | qa-verifier | continuous |

## Teammate roster
- **forge-engineer** — IaC scripts fixed and idempotent; standby for T-M2-08
- **jira-admin** — T-M2-07 ready to execute once T-M2-03b complete
- **automation-eng** — T-M3-02 ready (needs T-M2-07 done first)
- **qa-verifier** — T-M1-04 template ready; T-M2-08 next
- **safety-reviewer** — continuous T-CX-02
- **docs-writer** — awaiting M4 completion for T-M7-01/02/03
