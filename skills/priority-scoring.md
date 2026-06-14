# Skill: Priority Scoring

**Status:** ✅ Implemented
**Used by:** Triage, Sprint Risk, Backlog
**Implementation:** `src/utils/scoring.ts` (`scorePriority`)

## Purpose

Assign P0/P1/P2/P3 from issue text, labels, issue type, and due date, with an
auditable list of reasons.

## Heuristic

- **P0** — production outage, legal/compliance blocker, broken signup preventing
  registration, campaign live with bad link, PHI/privacy incident.
- **P1** — launch blocker, high-impact conversion issue, claims risk on a
  near-term asset, tracking broken for an active experiment, or **due ≤ 3 days**.
- **P2** — standard experiment/creative/dashboard/task (default).
- **P3** — research, backlog, nice-to-have, future improvement.

Matching is phrase-bank based against normalized text and labels so the result
is transparent and unit-testable.

## Inputs

```ts
{ text: string; labels: string[]; issueType?: string; dueDate?: string }
```

## Output

```json
{ "priority": "P0|P1|P2|P3", "reasons": ["Matched P0 signal: \"broken signup\""] }
```

## Safety

Pure function, read-only. Used to *recommend* priority; humans set the field.
