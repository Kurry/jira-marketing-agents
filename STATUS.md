# AIGO Agent-Team Status

_Last updated: 2026-06-15T10:26Z_
_Current tick: 24_

## Milestone
- Active: **M0-M2 ✓ · M6 ✓ · IaC ✓ · docs ✓ · safety ✓ — T-M1-04 ✓ · T-M6-02 ✓ — awaiting operator: T-M3-02 (automation import, needs admin OAuth), T-M4-01..06, T-M3-03**
- M0 ✓ · M1 ✓ · M2 ✓ · M6-filters ✓ · IaC layer ✓ · docs ✓ · T-M8-01 ✓ (partial) · T-M8-02 ✓ · T-M8-03 ✓
- Tests: **838 unit + 90 integration passing** (52 files) — build clean (0 TS errors) — all src/ modules covered
- Issue types: all 14 canonical live (IDs 10048-10061) ✓
- Seeds: all 15 retyped to canonical types; all 14 types covered ✓
- Safety: **T-M8-02 signed off** — evidence/safety/final-audit.md (PASS) ✓
- Completion record: evidence/DONE.md written (T-M8-03) ✓
- Automation rules: 5 rendered (state:DISABLED); ready for operator import ✓

## Jira instance state (live, verified 2026-06-15T06:20Z)
- Custom fields: customfield_10043-10048 (6 fields) ✓
- Workflow statuses: IDs 10003-10010 (8 statuses) ✓
- Field options: 24 options across 4 fields ✓
- Issue types: 14 canonical (IDs 10048-10061) ✓ · JQL filters: 7 (IDs 10000-10006) ✓

## Completed this session (tick 24)
- **T-M1-04 ✓** — Rovo visibility: 19 agents verified (forge install Up-to-date) → `evidence/rovo/visibility.md`
- **T-M6-02 ✓** — 6 dashboards created (IDs 10001–10006) → `evidence/jira-config/dashboards.md`
- **fix** — `forge-import-automation.cjs` repaired (was calling non-existent `forge invoke function`; now delegates to REST path)

## Blocked / awaiting operator action (in order)
1. **T-M3-02** — Automation import: Jira Automation REST API requires admin OAuth 2.0 scope (`manage:jira-configuration`). acli user token insufficient. **Manual UI steps:** Project Settings → Automation → ··· → Import rules → upload each file from `automation/rules/rendered/`
2. **T-M3-03** — Enable each rule, trigger on seed issue, capture audit log (requires T-M3-02 first)
3. **T-M4-01..06** — Manual Rovo agent runs on seed issues
4. **T-M5-01..10** — Outcome workflow traces

## Top 3 risks
1. **R-01 (Node v26):** forge CLI warns unsupported. 435 tests pass. Low active risk.
2. **R-03 (Rovo UI visibility):** 19 agents in manifest; UI confirmation pending T-M1-04.
3. **R-05 (Automation import):** Forge function ready; needs operator `forge deploy` first.

## Completed this tick (ticks 19–22 — coverage sweep)
| Task | Owner | Notes |
| ---- | ----- | ----- |
| tests/utils/adf.test.ts | qa-verifier | new 19 tests: toAdf structure, paragraphs, headings (1-6), bullet lists, mixed content, CRLF |
| readout.test.ts | qa-verifier | 2→22 tests: done-status variants, label bucketing, highImpactFunnelIssues, topThreeActions |
| experiments.test.ts | qa-verifier | 3→35 tests: all channel/metric detections, audience, approvals, hypothesis, readout template |
| triage.test.ts | qa-verifier | 5→39 tests: all 9 area detections, detectMissingInfo, output shape, human approvals, recommendedNextStatus |
| employerLaunch.test.ts | qa-verifier | 4→29 tests: readiness checks, output shape, risky-claims blocker, requiredAssets |
| duplicates.test.ts | qa-verifier | 3→17 tests: score sort, options, label/component overlap boost |
| creativeClaims.test.ts | qa-verifier | 4→17 tests: channel warnings, all risk levels, flaggedPhrase shape |

## In-flight (operator-gated)
| Task | Status |
| ---- | ------ |
| T-M3-02 | PENDING OPERATOR |
| T-M6-02 | PENDING OPERATOR |
| T-M1-04 | PENDING OPERATOR |
| T-M3-03 | PENDING — requires T-M3-02 first |
| T-M4-01..06 | PENDING — requires T-M1-04 |
| T-M5-01..10 | PENDING — requires T-M4 |
| T-CX-02 | continuous (safety-reviewer) |
