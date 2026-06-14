# Skill: Backlog Prioritization

**Status:** ✅ Implemented
**Used by:** Backlog Agent
**Implementation:** `src/backlog.ts` (`prioritizeBacklog`, on top of `scorePriority`)

## Purpose

Score and order a set of backlog items so the highest-leverage work surfaces
first.

## Behavior

Applies [Priority Scoring](priority-scoring.md) to each item (text, labels,
issue type, due date), then sorts by P0 → P1 → P2 → P3. Each item keeps its
`reasons` for transparency. This is the list-level counterpart to the
single-issue triage skill; an impact/confidence/effort weighting can be layered
on once those custom fields are configured (`src/config.ts`).

## Inputs

```ts
Array<{ key: string; summary: string; labels?: string[]; issueType?: string; dueDate?: string }>
```

## Output

```jsonc
[
  { "key": "AIGO-2", "summary": "Production outage on signup", "priority": "P0",
    "reasons": ["Matched P0 signal: \"production outage\""] },
  { "key": "AIGO-3", "summary": "Standard creative request", "priority": "P2", "reasons": ["…"] },
  { "key": "AIGO-1", "summary": "Research future ideas", "priority": "P3", "reasons": ["…"] }
]
```

## Safety

Pure, read-only. Recommends an order; humans own the backlog.
