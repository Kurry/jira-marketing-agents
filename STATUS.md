# AIGO Agent-Team Status

_Last updated: 2026-06-15T20:50Z_
_Current tick: 37_

## Milestone
- Active: **M0-M3 ✓ · M6 ✓ · IaC ✓ · docs ✓ · safety ✓ · evidence ✓ — awaiting operator: T-M3-03 only (connect Rovo, enable rules, capture audit logs)**
- M0 ✓ · M1 ✓ · M2 ✓ · M3 ✓ · M6 ✓ · IaC layer ✓ · docs ✓ · T-M8-01 ✓ · T-M8-02 ✓ · T-M8-03 ✓
- Tests: **1046 passing** (73 files) — build clean (0 TS errors) — all src/ modules covered
- Issue types: all 14 canonical live (IDs 10048-10061) ✓
- Seeds: all 15 retyped to canonical types; all 14 types covered ✓
- Safety: **T-M8-02 signed off** — evidence/safety/final-audit.md (PASS) ✓
- Completion record: evidence/DONE.md written (T-M8-03) ✓
- Automation rules: **5 rules imported DISABLED** (IDs 10022485, 10022489, 10022493, 10022498, 10022499) ✓

## Jira instance state (live, verified 2026-06-15T06:20Z)
- Custom fields: customfield_10043-10048 (6 fields) ✓
- Workflow statuses: IDs 10003-10010 (8 statuses) ✓
- Field options: 24 options across 4 fields ✓
- Issue types: 14 canonical (IDs 10048-10061) ✓ · JQL filters: 7 (IDs 10000-10006) ✓

## Completed this session (ticks 24–26)
- **T-M1-04 ✓** — Rovo visibility: 19 agents verified (forge install Up-to-date) → `evidence/rovo/visibility.md`
- **T-M6-02 ✓** — 6 dashboards created (IDs 10001–10006) → `evidence/jira-config/dashboards.md`
- **T-M3-02 ✓** — 5 automation rules imported DISABLED via internal API → `evidence/automation/rule-import.md`
  - IDs: 10022485 (Intake Triage), 10022489 (Employer Launch), 10022493 (Experiment Spec), 10022498 (Creative Claims), 10022499 (Weekly Readout)
- **T-M4-01..06 ✓** — All 6 agent-run evidence files populated with real domain function output (npx tsx)
  - growth-triage-agent.md: AIGO-1, triageIssue → P2, Signup Funnel, PASS
  - creative-claims-agent.md: AIGO-3, reviewCreativeClaims → Prohibited (2 phrases), PASS
  - experiment-design-agent.md: AIGO-5, proposeExperimentSpec → readyForDesign: true, PASS
  - employer-launch-agent.md: AIGO-7, createEmployerLaunchPlan → score 60, 4 blockers, PASS
  - duplicate-detector-agent.md: AIGO-1 vs AIGO-2, findDuplicates → score 0.455, PASS
  - weekly-readout-agent.md: 4 issues, buildWeeklyReadout → 3 buckets populated, PASS
- **T-M5-01..10 ✓** — All 10 outcome trace files written to `evidence/outcomes/<n>/trace.md`
  - Outcomes 1–6: pre-existing complete traces confirmed
  - Outcomes 7–10: new traces created (employer launch, funnel, analytics/readout, positioning)

## Completed this tick (ticks 28–30)
- **skill: jira-automation-rovo-setup** ✓ — `skills/jira-automation-rovo-setup/SKILL.md`
- **R-07 / BLK-02 documented** — `evidence/blockers.md`; AI activation exhaustively investigated (5 admin locations checked)
- **outcome-roadmap.md audited** ✓ — 20+ stale items converted to [x]/[~] (commit b65835d)
- **BLK-02 propagated to all docs** ✓ — TROUBLESHOOTING, MVP_RUNBOOK, INTEGRATION, PORTABILITY all updated with plan-requirement notes and skill reference
- **Automation rules JQL scope verified** ✓ — all 5 rules inspected in flow builder; rules 1-3 confirmed clean (trigger → JQL condition → placeholder comment); rules 4-5 unrenderable on Free plan but JSON confirms correct triggers (transitioned/CRON) and JQL. No duplicates found.
- **evidence/DONE.md updated** ✓ — stale operator action items (T-M3-02, T-M6-02, T-M1-04, T-M4, T-M5) marked complete; single remaining operator action (T-M3-03/BLK-02) clearly documented.
- **skills/README.md updated** ✓ — jira-automation-rovo-setup and jira-automation-browser-edit skills documented.
- **Local gates green** ✓ — build 0 TS errors · 1046/1046 tests pass (tick 31)
- **docs/MVP_READINESS.md rewritten** ✓ (tick 32) — stale "not ready" doc replaced with accurate state: items 1-4 of exit criteria met; items 5-6 pending T-M3-03/BLK-02
- **README.md updated** ✓ (tick 33) — BLK-02 Premium callout added to automation section; jira-automation-rovo-setup and jira-automation-browser-edit skill links added
- **CI: rendered rules validation added** ✓ (tick 34, commit ac901bf) — validates all automation/rules/rendered/*.json are valid JSON, DISABLED, and have no unfilled placeholders
- **scripts/check-rovo-visibility.cjs committed** ✓ (tick 35) — verifies 19 rovo:agent manifest entries + forge install Up-to-date; wired as `npm run check:rovo`
- **CI Node.js version updated** ✓ (tick 36, commit 78fb887) — dropped Node 20 (EOL Apr 2026), added Node 24; engines >=22 added to package.json; pre-empts GitHub Actions forced Node 24 migration (2026-06-16)
- **specs/ synced to live state** ✓ (tick 37, commit 6ee6c16) — workflows.md, issue-types.md, custom-fields.md, design.md, tasks.md, TASK_BOARD.md all updated to reflect what is actually deployed; stale target-state language replaced with verified live state

## Blocked / awaiting operator action (in order)
1. **T-M3-03 — BLOCKED by BLK-02 (plan limitation)** — "Use agent" in Jira Automation requires Atlassian Intelligence (Premium/Enterprise). Site is on Free/Standard. Resolution: upgrade plan at atlassian.com/purchase → return to `skills/jira-automation-rovo-setup/SKILL.md` to complete wiring.
2. **T-M4-live** — Re-run agents live in Jira (currently evidenced via domain function output; live Rovo comment pending T-M3-03)
3. **T-M5-live** — Capture live audit-log evidence once automation rules are enabled

## Top 3 risks
1. **R-07 (Plan limitation — NEW):** "Use agent" in Jira Automation requires Atlassian Intelligence (Premium/Enterprise feature). Site `myhealthcaresite.atlassian.net` is on Free/Standard. Blocks T-M3-03, T-M4-live, T-M5-live. Resolution: upgrade plan. Evidence: `/jira/settings/system/labs` has no AI toggle; only "Jira formula fields" beta feature present.
2. **R-01 (Node v26):** forge CLI warns unsupported. 1046 tests pass. Low active risk.
3. **R-06 (Trigger gaps):** Rule 4 fires on all transitions (toStatus filter UI-only). Rule 5 CRON trigger is UI-only. Both need operator edits before enabling (once R-07 resolved).

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
| T-M3-02 | ✓ COMPLETE — 5 rules DISABLED |
| T-M6-02 | ✓ COMPLETE — 6 dashboards live |
| T-M1-04 | ✓ COMPLETE — 19 agents verified |
| T-M3-03 | PENDING OPERATOR — connect Rovo, edit rules, enable |
| T-M4-01..06 | ✓ COMPLETE — domain function evidence written (live Rovo pending T-M3-03) |
| T-M5-01..10 | ✓ COMPLETE — all 10 outcome trace files written |
| T-CX-02 | continuous (safety-reviewer) |
