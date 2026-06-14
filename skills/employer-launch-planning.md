# Skill: Employer Launch Planning (+ Readiness Scoring, Eligibility & Asset Checklists, QA Gate)

**Status:** ✅ Implemented
**Used by:** Employer Launch Agent
**Implementation:** `src/employerLaunch.ts` (`createEmployerLaunchPlan`) · action `createEmployerLaunchPlan`

## Purpose

Build an employer/partner launch workback plan, score launch readiness 0–100,
and propose dated subtasks — without launching.

## Readiness scoring (start at 100, subtract)

15 missing launch date · 15 missing eligibility file · 10 missing
segment/suppression · 10 missing email/SMS assets · 10 missing landing page ·
10 missing tracking · 10 missing claims approval · 10 missing owner. Score is
clamped to 0–100. Risky claims language without documented approval is a hard
blocker.

## Behavior

Emits launch phases (Setup → Build → Review → Launch & Monitor), a QA gate
checklist (eligibility reconciliation, suppression, asset render, tracking,
claims approval), and suggested subtasks with `dueOffsetDays` and `ownerGroup`.

## Inputs

- `issueKey: string`

## Output (`EmployerLaunchPlan`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-123",
  "readinessScore": 60,
  "launchPhases": [{ "phase": "Setup", "tasks": ["…"] }],
  "blockers": ["Missing eligibility file.", "Missing tracking."],
  "requiredAssets": ["Employer eligibility file / census", "Tracking / UTM plan"],
  "qaChecklist": ["Eligibility file ingested and row counts reconciled."],
  "suggestedSubtasks": [
    { "title": "Ingest & validate eligibility file", "dueOffsetDays": -14, "ownerGroup": "Growth – Ops" }
  ]
}
```

## Safety

Plans only. Go/no-go and claims approval are human steps; subtasks are
suggestions, not created until approved.
