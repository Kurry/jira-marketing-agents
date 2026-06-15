# MVP Readiness Note

Date: 2026-06-15 (updated tick 31)

Status: **all autonomous work complete — one operator-gated item remains (T-M3-03 / BLK-02)**.

This note records the current evidence, blockers, risks, and decisions for the
Forge/Rovo-only AI Growth Ops Jira MVP.

---

## Evidence Collected

### Repo quality gates (all green)

- `npm run build` — 0 TypeScript errors
- `npm test` — **1046/1046 tests pass** (73 files)
- `npm run test:integration` — manifest/prompt/action/handler contracts pass
- `forge lint` — 0 errors (one expected `addAnalysisComment` warning)
- `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` — PASS
- `npm run provision:all -- --dry-run` — PASS

Evidence: `evidence/gates/local-2026-06-15T08-16-59Z.log`

### Forge deploy and install

- `forge deploy -e development` — version 2.1.0 deployed
- `forge install list` — `myhealthcaresite.atlassian.net / Jira / Up-to-date`

Evidence: `evidence/gates/forge-deploy.log`, `evidence/gates/forge-install.log`

### Jira project configuration

| Resource | Count | Status |
|---|---|---|
| Canonical issue types | 14 (IDs 10048–10061) | ✓ Live |
| Custom fields | 6 (IDs 10043–10048) | ✓ Live |
| Workflow statuses | 12 | ✓ Live |
| Field options | 24 across 4 fields | ✓ Live |
| JQL saved filters | 7 (IDs 10000–10006) | ✓ Live |
| Dashboards | 6 (IDs 10001–10006) | ✓ Live |
| Seed issues | 15 (all 14 canonical types covered) | ✓ Live |
| Automation rules | 5 imported DISABLED | ✓ Ready to enable |
| Rovo agents | 19 in manifest, app Up-to-date | ✓ Verified |

Evidence: `evidence/jira-config/`, `evidence/rovo/visibility.md`,
`evidence/automation/rule-import.md`

### Agent validation (domain function output)

All 6 primary agents validated against seed issues via `npx tsx`:

| Agent | Issue | Result |
|---|---|---|
| AI Growth Triage | AIGO-1 | P2, Signup Funnel, PASS |
| AI Creative Claims | AIGO-3 | Prohibited (2 phrases), PASS |
| AI Experiment Design | AIGO-5 | readyForDesign: true, PASS |
| AI Employer Launch | AIGO-7 | score 60, 4 blockers, PASS |
| AI Duplicate Detector | AIGO-1 vs AIGO-2 | score 0.455, PASS |
| AI Weekly Readout | 4 issues | 3 buckets populated, PASS |

Evidence: `evidence/agent-runs/`

### Outcome traces

All 10 outcome workflow end-to-end traces written to
`evidence/outcomes/<n>/trace.md`. Outcomes 1–10 covered.

### Safety review

Full safety audit signed off 2026-06-15. See `evidence/safety/final-audit.md`.

- 19 agent prompts read and verified — zero critical violations
- Healthcare claims guardrails intact in all prompts and policies
- All 5 automation rules import DISABLED
- `addAnalysisComment` is the only mutating Forge action

---

## Blockers

### BLK-01 — forge not installed (RESOLVED)

`forge 12.22.0` authenticated on operator machine. Resolved.

### BLK-02 — plan limitation (ACTIVE — single remaining blocker)

**"Use agent" (Rovo AI) in Jira Automation requires Atlassian Intelligence
(Jira Premium/Enterprise). Site `myhealthcaresite.atlassian.net` is on
Free/Standard.**

All 5 automation rule flows are correctly configured with:
- ✓ Correct triggers (Work item created / transitioned to Ready / CRON schedule)
- ✓ Correct JQL scope conditions (verified in flow builder 2026-06-15)
- ✓ Placeholder comment actions in place

The only step remaining is replacing the placeholder comment actions with
`jira.rovo.agent.action` steps — which requires Atlassian Intelligence.

**Investigation trail (5 locations checked, all confirmed Free/Standard):**

| Location | Result |
|---|---|
| admin.atlassian.com → Rovo → Beta features | Toggle already ON — not the blocker |
| admin.atlassian.com → Rovo → Access | Empty blocklist — not the blocker |
| `/jira/settings/system/labs` | No AI toggle — only "Jira formula fields" |
| Jira admin → System settings sidebar | No "Atlassian Intelligence" section |
| Jira admin search "atlassian intelligence" | No results |

**Resolution:** Upgrade to Jira Premium at atlassian.com/purchase. Then follow
`skills/jira-automation-rovo-setup/SKILL.md` to complete T-M3-03.

Evidence: `evidence/blockers.md#BLK-02`, `docs/TROUBLESHOOTING.md`

---

## What Is Done vs. What Remains

| Item | Status |
|---|---|
| Repo quality gates (build, test, lint) | ✓ GREEN |
| Forge deploy + install (staging) | ✓ DONE |
| 14 canonical issue types in AIGO | ✓ LIVE |
| 6 custom fields created | ✓ LIVE |
| 12 workflow statuses configured | ✓ LIVE |
| 7 JQL saved filters | ✓ LIVE |
| 6 dashboards created | ✓ LIVE |
| 15 seed issues (all 14 types covered) | ✓ LIVE |
| 5 automation rules imported DISABLED | ✓ LIVE |
| JQL scope conditions on all rules | ✓ VERIFIED in flow builder |
| 19 Rovo agents visible (manifest verified) | ✓ VERIFIED |
| 6 agent domain-function runs evidenced | ✓ DONE |
| All 10 outcome traces written | ✓ DONE |
| Safety audit signed off | ✓ PASS |
| IaC provisioning scripts (idempotent) | ✓ DONE |
| All docs (INTEGRATION, RUNBOOK, PORTABILITY, TROUBLESHOOTING) | ✓ DONE |
| **T-M3-03: enable rules + capture audit logs** | **BLOCKED — BLK-02** |
| Live Rovo comment via automation | PENDING T-M3-03 |
| Live audit-log evidence | PENDING T-M3-03 |

---

## MVP Exit Criteria

The MVP is ready when:

1. ✓ `npm run build`, `npm test`, `npm run test:integration`, `forge lint` all pass
2. ✓ `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` passes
3. ✓ All 19 Rovo agents declared in manifest; app Up-to-date on staging
4. ✓ Primary agents return structured output on seed issues
5. **PENDING** — Jira Automation rules fire without audit-log errors and post
   `🤖 AI Growth Ops` comments (requires Premium upgrade → T-M3-03)
6. **PENDING** — `evidence/automation/<rule>-audit.md` files populated with
   real audit-log rows (requires T-M3-03)

**Items 1–4 are met. Items 5–6 require operator plan upgrade.**

---

## Decisions

- Forge/Rovo is the application framework. MCP/Cowork is out of scope.
- General Jira project configuration is not Terraform-managed in this repo.
  The scalable path is instance configs plus a golden company-managed Jira
  template project cloned with ACLI. See `docs/PORTABILITY.md`.
- Fresh team-managed projects are supported for smoke tests but are not the
  recommended scalable project configuration strategy.
- `addAnalysisComment` (via `src/comments.ts`) remains the only mutating Forge
  action. Any new write surface requires `policies/safe-mutations.md` update.
