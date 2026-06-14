# Skill: Claims-Risk Review (Scan + Safe Rewrite + Review Routing + Approval Boundary)

**Status:** ✅ Implemented
**Used by:** Claims Agent, Creative Generation, Triage, Automation
**Implementation:** `src/utils/risk.ts` (`scanClaimsRisk`, `requiresHumanClaimsReview`), `src/creativeClaims.ts` (`reviewCreativeClaims`) · action `reviewCreativeClaimsRisk` · policy [`../policies/claims-risk-policy.md`](../policies/claims-risk-policy.md)

## Purpose

Flag risky health/marketing claims, suggest compliant rewrites, route
medium/high-risk content to human review — and **never approve claims**.

## Risk levels

`Safe` → `Needs substantiation` → `Risky` → `Prohibited` (plus
`Requires human review`). Prohibited triggers include guaranteed reversal /
reverse diabetes in N days, cure, get off / stop medication, guaranteed results.
Risky includes diagnose, replace your doctor. Needs-substantiation includes
unsupported FDA-approved / clinically proven.

## Behavior

`scanClaimsRisk(text)` matches a rule bank of regexes, returns the overall risk
and each flagged phrase with an `issue` and a `saferRewrite`.
`reviewCreativeClaims` adds channel warnings (SMS consent/opt-out, email
unsubscribe, paid-ad restrictions) and sets `humanReviewRequired` for
Risky/Prohibited.

## Inputs

- `issueKey: string` (or raw text via `scanClaimsRisk`)

## Output

```jsonc
{
  "issueKey": "AIGO-123",
  "overallClaimsRisk": "Prohibited",
  "flaggedPhrases": [
    { "phrase": "reverse diabetes in 30 days", "issue": "...", "saferRewrite": "..." }
  ],
  "channelWarnings": ["SMS: ensure consent and opt-out language; …"],
  "humanReviewRequired": true
}
```

## Safety

Classifies only — there is no "approved" state in the output. Any
Risky/Prohibited result routes to Compliance / Medical Review.
