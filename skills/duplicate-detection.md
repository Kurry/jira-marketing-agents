# Skill: Duplicate Detection

**Status:** ✅ Implemented
**Used by:** Duplicate Detector Agent
**Implementation:** `src/duplicates.ts` (`findDuplicates`, Jaccard in `src/utils/text.ts`) · action `findSimilarIssues`

## Purpose

Find likely duplicate issues and recommend keep / link / merge (as a suggestion
for a human) — never auto-merge or close.

## Behavior

The handler searches recent issues in the same project
(`project = X AND key != current AND updated >= -90d`). The skill scores each
candidate by **Jaccard token overlap** of summary+description (weight 0.8), plus
+0.1 for shared labels and +0.1 for shared components, capped at 1.0. Candidates
≥ threshold (default 0.2) are returned, sorted descending, top N (default 5).
The current issue is always excluded.

## Inputs

- `issueKey: string` (candidates fetched by the handler)

## Output

```jsonc
{
  "issueKey": "AIGO-100",
  "possibleDuplicates": [
    {
      "key": "AIGO-101",
      "summary": "Signup page broken on mobile Safari for new users",
      "status": "Open",
      "similarityScore": 0.62,
      "reason": "Text overlap 65%; shared labels"
    }
  ]
}
```

## Safety

Read-only. Returns suggestions for a human to confirm; never closes, merges, or
links issues itself.
