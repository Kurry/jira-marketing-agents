# Agent Run Evidence — AI Duplicate Detector Agent
Task: T-M4-05
VM row: VM-AGENT-RUN
Date: 2026-06-15
Seed issue key: AIGO-1 (target), AIGO-2 (candidate duplicate)

## Input

- Target issue: AIGO-1 — Mobile Safari signup flow dropping at email field
  - Labels: mobile, safari, signup, funnel
  - Components: web-app, signup
- Candidate pool: [AIGO-2, AIGO-3, AIGO-5, AIGO-7]
  - AIGO-2: Safari mobile signup funnel drop-off at email step (same labels, same components)
  - AIGO-3: Email creative claims (different domain)
  - AIGO-5: Email A/B experiment (different domain)
  - AIGO-7: Employer launch (different domain)

## Domain function invoked

`findDuplicates(issue, candidates)` — `src/duplicates.ts`

## Actual output

```json
{
  "possibleDuplicates": [
    {
      "key": "AIGO-2",
      "summary": "Safari mobile signup funnel drop-off at email step",
      "status": "Open",
      "similarityScore": 0.455,
      "reason": "Text overlap 32%; shared labels; shared components"
    }
  ]
}
```

## Analysis

- AIGO-2 detected as likely duplicate with similarity score 0.455.
- Evidence: text overlap (32%), shared labels (mobile, safari, signup), shared components (web-app).
- AIGO-3, AIGO-5, AIGO-7 correctly NOT flagged (different domain, no label/text overlap with AIGO-1).
- Score 0.455 is a "possible duplicate" signal requiring human confirmation — not an automatic merge.

## Safety check

- Output is recommendation only — no issues were merged, closed, or deleted.
- Human reviewer must confirm before any deduplication action.

## Verdict: PASS

- Correct duplicate candidate surfaced (AIGO-2).
- Non-duplicates correctly excluded.
- Output is advisory only; human approval required before dedup action.

## safety-reviewer sign-off

safety-reviewer: approved — read-only output, no mutations, duplicate flagged for human review not auto-resolved.
