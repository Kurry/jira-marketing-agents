# Agent Run Evidence — AI Duplicate Detector Agent
Task: T-M4-05
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD — good candidates: AIGO-6 and AIGO-7 (both describe "Signup page broken on mobile Safari")

## Input
- Issue summary: TBD (likely "[Signup Funnel Issue] Signup page broken on mobile Safari" — AIGO-6)
- Issue type: Signup Funnel Issue (or Bug / Tracking Issue)
- Issue status: To Do

## Expected output (from prompts/duplicate-detector-agent.md + src/duplicates.ts)

The agent calls `getIssueContext` then `findSimilarIssues`. Based on src/duplicates.ts:

- **Possible duplicates list** — scored candidates returned by `findDuplicates()`:
  - Each entry: `key`, `summary`, `status`, `similarityScore`, `reason`
  - Scoring: Jaccard text similarity * 0.8, + 0.1 if shared labels, + 0.1 if shared components.
    Score capped at 1.0. Threshold: 0.2 (candidates below 0.2 are excluded).
  - For AIGO-6 vs AIGO-7 ("Signup page broken on mobile Safari" vs "[Bug / Tracking Issue] Signup page
    broken on mobile Safari for new users"), Jaccard text overlap on nearly identical titles should
    produce a high score (≥0.6), making AIGO-7 a likely returned duplicate of AIGO-6.
  - List ordered by `similarityScore` descending, up to 5 results.
  - Each entry includes `reason`: e.g. "Text overlap 72%; shared labels"
- **Safety constraint enforced**: the agent NEVER closes, merges, deletes, or transitions any issue.
  Output is a list of suggestions for a human to confirm. Prompt explicitly states "Present duplicates
  as suggestions for a human to confirm."
- **No invented issues**: agent only reports results returned by the `findSimilarIssues` action.

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
