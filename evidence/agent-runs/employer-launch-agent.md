# Agent Run Evidence — AI Employer Launch Agent
Task: T-M4-04
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD — strong candidate: AIGO-4 ("[Employer Launch] Employer launch for Acme Corp on June 20")

## Input
- Issue summary: TBD (likely "[Employer Launch] Employer launch for Acme Corp on June 20")
- Issue type: Employer Launch
- Issue status: In Progress

## Expected output (from prompts/employer-launch-agent.md + src/employerLaunch.ts)

The agent calls `getIssueContext` then `createEmployerLaunchPlan`. Based on src/employerLaunch.ts:

- **Readiness score (0–100)** — starts at 100, deducts for each missing component:
  - −15: missing launch date (but AIGO-4 has "June 20" → likely present → +15 retained)
  - −15: missing eligibility file (likely absent in seed text)
  - −10: missing segment/suppression logic
  - −10: missing email/SMS assets
  - −10: missing landing page
  - −10: missing tracking
  - −10: missing claims approval
  - −10: missing owner
  For AIGO-4 with minimal description, expect score in range 25–55 depending on what details are in the issue.
- **Launch phases** — always 4 fixed phases:
  1. Setup: Confirm employer/partner details, Ingest eligibility file, Define segments & suppression
  2. Build: Build email/SMS assets, Build landing page, Implement tracking & UTMs
  3. Review: Claims/compliance review, QA assets & tracking, Go/no-go approval
  4. Launch & Monitor: Schedule send, Monitor deliverability & guardrails, Post-launch readout
- **Blockers** — one entry per failed readiness check (e.g. "Missing eligibility file.",
  "Missing segment / suppression logic.", "Missing email/SMS assets.", etc.)
- **Required assets** — from failed checks that have an `asset` field: Employer eligibility file /
  census, Segment & suppression rules, Email and/or SMS creative, Co-branded landing page,
  Tracking / UTM plan, Documented claims approval.
- **QA checklist** — always 5 fixed items: eligibility counts reconciled, suppression in staging,
  assets render on devices, tracking fires correctly, claims copy has documented approval.
- **Suggested subtasks** — always 6 fixed subtasks with dueOffsetDays relative to launch date:
  Ingest & validate eligibility file (−14d), Build segments & suppression (−12d),
  Create email/SMS assets (−10d), Claims/compliance review (−8d), Implement & QA tracking (−6d),
  Go/no-go review (−2d).
- **Hard blocker check**: if risky/prohibited claims language detected without documented approval,
  adds "Risky claims language detected without documented approval." to blockers.
- **Safety**: agent NEVER launches. "Go/no-go and claims approval are always human steps."

## Actual output
TBD — pending T-M2-07 completion and live Rovo run

## forge logs excerpt
TBD — run after agent execution:
```
forge logs -e development --since 1h --limit 50
```

## Verdict: [PASS / FAIL / PENDING]
PENDING

## safety-reviewer sign-off
safety-reviewer: [approved / OBJECTION] — TBD
