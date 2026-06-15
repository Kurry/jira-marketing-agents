# MVP Readiness Note

Date: 2026-06-15 (updated after Atlassian-native tooling review)

Status: **CLI fallback validated; native Jira Automation/Rovo proof still pending.**
The Forge webtrigger path invoked the five MVP agents and posted AI-labeled Jira
comments. That proves the safe comment-writing fallback, but it is not the same
as Jira Automation invoking the native "Use Rovo agent" action and producing
Automation audit-log evidence.

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

Counts are regenerated from `infra/jira/` YAML by `scripts/docs/generate.mjs`
(the inline `<!--count:…-->` tokens). The canonical-vs-live reconciliation lives
in `specs/v2/issue-types.md`.

| Resource | Count | Status |
|---|---|---|
| Managed issue types | <!--count:managedIssueTypes-->13<!--/count--> | ✓ Live |
| Custom fields | <!--count:customFields-->8<!--/count--> | ✓ Live |
| Workflow statuses | <!--count:workflowStatuses-->3<!--/count--> | ✓ Live |
| JQL saved filters | <!--count:filters-->7<!--/count--> | ✓ Live |
| Dashboards | <!--count:dashboards-->6<!--/count--> | ✓ Live |
| Seed issues | <!--count:seeds-->15<!--/count--> | ✓ Live |
| Automation rules | <!--count:automation-->5<!--/count--> (imported DISABLED) | ✓ Ready to enable |
| Rovo agents | 19 in manifest, app Up-to-date | Manifest/install verified; UI confirmation pending |

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
- All <!--count:automation-->5<!--/count--> automation rules import DISABLED
- `addAnalysisComment` is the only mutating Forge action

---

## Blockers

### BLK-01 — forge not installed (RESOLVED)

`forge 12.22.0` authenticated on operator machine. Resolved.

### BLK-02 — Rovo/AI activation and Automation wiring

**Partially resolved 2026-06-15:** Operator upgraded
`myhealthcaresite.atlassian.net` to Standard. Rovo should be included on the
paid plan, but the native Jira Automation "Use Rovo agent" path still needs to
be wired, enabled, triggered, and verified from the Automation audit log.

The Forge webtrigger CLI path remains available as a fallback and has posted
comments successfully. It should not be counted as completion of native
Automation/Rovo wiring.

Next step: Wire "Use Rovo agent" in the five Jira Automation rules, enable them
only after review, trigger each rule on seed issues, and capture the real audit
log rows. See `skills/jira-automation-rovo-setup/SKILL.md`.

Evidence: `evidence/blockers.md#BLK-02`, `evidence/automation/*-audit.md`

---

## What Is Done vs. What Remains

| Item | Status |
|---|---|
| Repo quality gates (build, test, lint) | ✓ GREEN |
| Forge deploy + install (staging) | ✓ DONE |
| <!--count:managedIssueTypes-->13<!--/count--> managed issue types in AIGO | ✓ LIVE |
| <!--count:customFields-->8<!--/count--> custom fields created | ✓ LIVE |
| <!--count:workflowStatuses-->3<!--/count--> workflow statuses configured | ✓ LIVE |
| <!--count:filters-->7<!--/count--> JQL saved filters | ✓ LIVE |
| <!--count:dashboards-->6<!--/count--> dashboards created | ✓ LIVE |
| <!--count:seeds-->15<!--/count--> seed issues | ✓ LIVE |
| <!--count:automation-->5<!--/count--> automation rules imported DISABLED | ✓ LIVE |
| JQL scope conditions on all rules | ✓ VERIFIED in flow builder |
| 19 Rovo agents manifest/install check | ✓ VERIFIED |
| 19 Rovo agents visible in Jira UI | PENDING UI confirmation |
| 6 agent domain-function runs evidenced | ✓ DONE |
| All 10 outcome traces written | ✓ DONE |
| Safety audit signed off | ✓ PASS |
| IaC provisioning scripts (idempotent) | ✓ DONE |
| All docs (INTEGRATION, RUNBOOK, PORTABILITY, TROUBLESHOOTING) | ✓ DONE |
| **T-M3-03: enable rules + capture audit logs** | **PARTIAL — webtrigger CLI complete; native Automation audit logs pending** |
| Live agent comment via webtrigger | ✓ DONE — 5 AI-labeled comments posted to Jira |
| Live native Automation audit-log evidence | PENDING — evidence/automation/*-audit.md currently records webtrigger validation |

---

## MVP Exit Criteria

The MVP is ready when:

1. ✓ `npm run build`, `npm test`, `npm run test:integration`, `forge lint` all pass
2. ✓ `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` passes
3. ✓ All 19 Rovo agents declared in manifest; app Up-to-date on staging
4. ✓ Primary agents return structured output on seed issues
5. ✓ Agent analysis invoked via CLI (Forge webtrigger), AI-labeled comments posted to Jira seed issues (commentIds 10004–10008)
6. PENDING: native Jira Automation rules invoke Rovo agents through "Use Rovo agent" and produce audit-log evidence

Five exit criteria are met. The native Automation/Rovo audit-log criterion is
still pending.

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
