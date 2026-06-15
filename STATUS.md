# AIGO Agent-Team Status

_Last updated: 2026-06-15T02:00Z_
_Current tick: 4_

## Milestone
- Active: **M3 — Automation Import** (pending operator UI steps below)
- M0 ✓ · M1 ✓ · M2 ✓ · IaC layer ✓ (commits 4d54a1a → 634e8fe → bccdbab)
- Tests: **421 passing** (39 files) — unit + integration-mock (nock)
- Next: Operator completes 3 UI steps → M3 automation import → M4 agent runs

## Top 3 risks
1. **R-01 (Node v26):** forge CLI warns unsupported. All deploys and 421 tests pass. Low active risk.
2. **R-03 (Rovo UI visibility):** All 19 agents in manifest; browser confirmation still pending operator (T-M1-04).
3. **R-05 (Automation import scope):** `provision:automation` needs OAuth admin scope unavailable with personal token — exits code 2 with manual UI fallback steps. Workaround: operator imports rendered JSONs via Jira UI.

## Recent completions
- T-M2-03/04/05 — 14 issue types, 6 custom fields, 8 statuses created in AIGO (Jira)
- IaC: scripts/provision-jira.cjs — idempotent, dry-run, 421 tests
- IaC: scripts/provision-seeds.cjs — idempotent seed import + re-type
- IaC: scripts/provision-automation.cjs — render + import (exit 2 on admin scope)
- IaC: scripts/provision-all.cjs — 10-step orchestrator
- IaC: tests/integration/provision-mock.test.ts — 45 nock HTTP integration tests
- instances/aigo.example.json — single source of truth for all Jira config
- docs/INTEGRATION.md — updated: `npm run provision:all` as primary path

## Blocked / awaiting human ← OPERATOR ACTION NEEDED
1. **T-M2-03b** — Go to `myhealthcaresite.atlassian.net` → AIGO → **Project Settings → Issue Types** → add all 14 canonical types (they exist globally, need project-linking)
2. **T-M2-05 Phase 4** — Go to AIGO → **Project Settings → Board** → add 8 statuses to columns: Intake (To Do), Triage/Spec Ready/In Review/Claims Review/Experiment Running/Decision Needed/Launch Prep (In Progress)
3. **T-M1-04** — Go to `myhealthcaresite.atlassian.net` → **Apps → Rovo → Agents** → confirm all 19 agents are visible. Paste names here.

Once these 3 are done: T-M3-02 (automation import via UI) → T-M4-01–06 (manual agent runs) unblock.

## In-flight
| Task | Owner | Status |
| ---- | ----- | ------ |
| T-M1-04 | qa-verifier | PENDING OPERATOR |
| T-M2-03b | operator | PENDING OPERATOR |
| T-CX-02 | safety-reviewer | continuous |
| T-CX-03 | qa-verifier | continuous |

## Teammate roster
- **forge-engineer** — IaC scripts complete; standby for T-M2-08 (readiness script extension)
- **jira-admin** — M2 execution complete; T-M2-07 plan drafted (awaiting T-M2-03b)
- **automation-eng** — T-M3-02 ready to execute (operator must complete T-M2-03b first)
- **qa-verifier** — T-M1-04 template ready; T-M2-08 next
- **safety-reviewer** — continuous T-CX-02
- **docs-writer** — INTEGRATION.md updated; T-M7-01/02/03 await M4 completion
- **architect** — standby for M5 outcome traces
