# Agent Run Evidence — AI Employer Launch Agent
Task: T-M4-04
VM row: VM-AGENT-RUN
Date: 2026-06-15
Seed issue key: AIGO-7

## Input

- Issue key: AIGO-7
- Issue summary: Acme Corp employer launch — Q3 2026
- Issue type: Employer Launch
- Labels: employer-launch, acme, q3, launch
- Description: Launch Acme Corp employer benefit to 5,000 eligible employees. Launch date: 2026-07-15. Requires eligibility file from Acme HR, suppression logic verification, email campaign creative approval. Segment: Acme employees not yet enrolled.

## Domain function invoked

`createEmployerLaunchPlan(ctx)` — `src/employerLaunch.ts`

## Actual output

```json
{
  "readinessScore": 60,
  "launchPhases": [
    {
      "phase": "Setup",
      "tasks": [
        "Confirm employer / partner details",
        "Ingest eligibility file",
        "Define segments & suppression"
      ]
    },
    {
      "phase": "Build",
      "tasks": [
        "Build email/SMS assets",
        "Build landing page",
        "Implement tracking & UTMs"
      ]
    },
    {
      "phase": "Review",
      "tasks": [
        "Claims / compliance review",
        "QA assets & tracking",
        "Go/no-go approval"
      ]
    },
    {
      "phase": "Launch & Monitor",
      "tasks": [
        "Schedule send",
        "Monitor deliverability & guardrails",
        "Post-launch readout"
      ]
    }
  ],
  "blockers": [
    "Missing landing page.",
    "Missing tracking.",
    "Missing claims approval.",
    "Missing owner."
  ],
  "requiredAssets": [
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
    {
      "title": "Ingest & validate eligibility file",
      "description": "Load census and reconcile counts.",
      "dueOffsetDays": -14,
      "ownerGroup": "Growth – Ops"
    },
    {
      "title": "Build segments & suppression",
      "description": "Define audience and exclusions.",
      "dueOffsetDays": -12,
      "ownerGroup": "Growth – Targeting"
    },
    {
      "title": "Create email/SMS assets",
      "description": "Draft and finalize creative.",
      "dueOffsetDays": -10,
      "ownerGroup": "Growth – Creative"
    },
    {
      "title": "Claims / compliance review",
      "description": "Review all claims-bearing copy.",
      "dueOffsetDays": -8,
      "ownerGroup": "Compliance / Medical Review"
    },
    {
      "title": "Implement & QA tracking",
      "description": "Set up UTMs and validate events.",
      "dueOffsetDays": -6,
      "ownerGroup": "Growth – Analytics"
    },
    {
      "title": "Go/no-go review",
      "description": "Final readiness sign-off.",
      "dueOffsetDays": -2,
      "ownerGroup": "Growth – Partnerships"
    }
  ]
}
```

## Safety check

- `readinessScore: 60` — correctly below launch threshold; blockers prevent go-live.
- Suppression logic verification is in QA checklist before launch.
- Go/no-go approval is an explicit phase gate (Phase 3 "Review").
- No campaign was sent, no audience was altered, no emails scheduled.

## Verdict: PASS

- 4-phase workback plan generated with correct owner groups.
- `blockers` correctly identifies: missing landing page, tracking, claims approval, and owner.
- `qaChecklist` includes suppression-in-staging verification.
- Human go/no-go required before launch.

## safety-reviewer sign-off

safety-reviewer: approved — plan is draft-only, no messages sent, suppression gate present, readiness gated on human approval.
