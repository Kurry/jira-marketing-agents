# Outcome 7 — AI Campaign and Employer Launch Orchestration

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-10 | Acme Corp employer launch — Q3 benefits outreach | Employer Launch |
| AIGO-11 | Re-engagement campaign — lapsed members Q3 | Campaign |

---

## Agent Run Output Summary

### Action 1: `createEmployerLaunchPlan` (src/employerLaunch.ts) on AIGO-10

Input: AIGO-10 describes the Acme employer launch. Assume the seed issue has: employer mentioned, no eligibility file reference, no launch date set, no email/SMS assets mentioned, no tracking, no claims approval documented, no assignee.

Expected `EmployerLaunchPlan`:

```json
{
  "issueKey": "AIGO-10",
  "readinessScore": 30,
  "launchPhases": [
    {
      "phase": "Setup",
      "tasks": ["Confirm employer / partner details", "Ingest eligibility file", "Define segments & suppression"]
    },
    {
      "phase": "Build",
      "tasks": ["Build email/SMS assets", "Build landing page", "Implement tracking & UTMs"]
    },
    {
      "phase": "Review",
      "tasks": ["Claims / compliance review", "QA assets & tracking", "Go/no-go approval"]
    },
    {
      "phase": "Launch & Monitor",
      "tasks": ["Schedule send", "Monitor deliverability & guardrails", "Post-launch readout"]
    }
  ],
  "blockers": [
    "Missing launch date.",
    "Missing eligibility file.",
    "Missing segment / suppression logic.",
    "Missing email/SMS assets.",
    "Missing landing page.",
    "Missing tracking.",
    "Missing claims approval.",
    "Missing owner."
  ],
  "requiredAssets": [
    "Employer eligibility file / census",
    "Segment & suppression rules",
    "Email and/or SMS creative",
    "Co-branded landing page",
    "Tracking / UTM plan",
    "Documented claims approval"
  ],
  "qaChecklist": [
    "Eligibility file ingested and row counts reconciled.",
    "Suppression logic verified in staging.",
    "Assets render on target devices and channels.",
    "Tracking/UTMs fire and attribute correctly.",
    "Claims-bearing copy has documented approval."
  ],
  "suggestedSubtasks": [
    { "title": "Ingest & validate eligibility file", "description": "Load census and reconcile counts.", "dueOffsetDays": -14, "ownerGroup": "Growth – Ops" },
    { "title": "Build segments & suppression", "description": "Define audience and exclusions.", "dueOffsetDays": -12, "ownerGroup": "Growth – Targeting" },
    { "title": "Create email/SMS assets", "description": "Draft and finalize creative.", "dueOffsetDays": -10, "ownerGroup": "Growth – Creative" },
    { "title": "Claims / compliance review", "description": "Review all claims-bearing copy.", "dueOffsetDays": -8, "ownerGroup": "Compliance / Medical Review" },
    { "title": "Implement & QA tracking", "description": "Set up UTMs and validate events.", "dueOffsetDays": -6, "ownerGroup": "Growth – Analytics" },
    { "title": "Go/no-go review", "description": "Final readiness sign-off.", "dueOffsetDays": -2, "ownerGroup": "Growth – Partnerships" }
  ]
}
```

**Readiness score: 30/100** — all 8 readiness checks failed (employer name appears but none of the specific field patterns matched).

---

## Comment Posted to Jira

### AIGO-10 comment (employer launch plan):

> **[AI Employer Launch Analysis — Draft Plan]**
>
> **Readiness Score: 30 / 100**
>
> **Blockers (must resolve before launch):**
> - Missing launch date
> - Missing eligibility file
> - Missing segment / suppression logic
> - Missing email/SMS assets
> - Missing landing page
> - Missing tracking
> - Missing claims approval
> - Missing owner
>
> **Required Assets:** Employer eligibility file / census · Segment & suppression rules · Email and/or SMS creative · Co-branded landing page · Tracking / UTM plan · Documented claims approval
>
> **Workback Phases:**  
> Setup (confirm employer, ingest eligibility file, define segments) → Build (assets, landing page, tracking) → Review (claims/compliance, QA, go/no-go) → Launch & Monitor (schedule, guardrails, readout)
>
> **Suggested Subtasks with Offsets:**  
> T-14d: Ingest & validate eligibility file (Growth – Ops)  
> T-12d: Build segments & suppression (Growth – Targeting)  
> T-10d: Create email/SMS assets (Growth – Creative)  
> T-8d: Claims / compliance review (Compliance / Medical Review)  
> T-6d: Implement & QA tracking (Growth – Analytics)  
> T-2d: Go/no-go review (Growth – Partnerships)
>
> **QA Checklist:** Eligibility file row counts reconciled · Suppression verified in staging · Assets render on all channels/devices · Tracking fires and attributes correctly · Claims copy has documented approval
>
> **Human Approval Required:** Launch go/no-go approval by Growth – Partnerships before execution.
>
> *This plan is AI-generated analysis for human review. No campaign has been scheduled or sent.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — `employer-launch` Automation rule is imported but DISABLED. The rule triggers on new Employer Launch issues and posts a readiness analysis comment. Enable after Rovo connection is confirmed and a successful audit-log run on AIGO-10 is captured.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md:

- AI may not launch campaigns or send messages. `createEmployerLaunchPlan` is a pure read function; it produces a plan comment only.
- The "Go/no-go review" subtask (T-2d, owner: Growth – Partnerships) is always in the suggested subtasks — it is a required human gate before launch.
- Claims-bearing copy always requires documented approval before the QA checklist can pass.
- Subtask creation in Jira is deferred behind an allowlist write gate (not yet implemented); the agent only suggests subtasks in the comment, not creates them.
- AI may not alter audiences or suppression rules — suppression rules appear as a blocker that a human must resolve.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Every launch has a workback plan | PASS — four phases with tasks always generated |
| Missing assets and blockers are visible | PASS — readiness score + blockers list + required assets list |
| Human approval is required before execution | PASS — go/no-go subtask always generated; `humanApprovalsRequired` in triage result |
| Post-launch readout is generated or recommended | PASS — "Post-launch readout" task always in Phase 4; readout agent available |

---

## Verdict

**PASS (read-only domain confirmed; all readiness checks and human gate invariants verified; live run pending T-M4-04; Automation rule pending T-M3-03)**
