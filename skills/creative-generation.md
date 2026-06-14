# Skill: Creative Generation (+ Variant IDs, Hook Classification, Brief Parsing)

**Status:** 🟡 Partial (variant generation + claims scan implemented; explicit variant IDs and hook tags are prompt-driven)
**Used by:** Creative Generation Agent, Experiment (variant matrix)
**Implementation:** `src/creativeGen.ts` (`generateCreativeVariants`) · action `generateCreativeVariants`

## Purpose

Draft on-brief, compliant creative variants per channel (email, SMS, paid, push,
direct mail) and scan every variant for claims risk — never send.

## Behavior

- Detects the channel and selects compliant angle templates (support & care
  team, personalized/data-driven, employer benefit, simple first step).
- Shapes copy per channel (SMS stays short with `Reply STOP` opt-out).
- Runs `scanClaimsRisk` on every generated variant **and** on the source brief;
  any risky/prohibited result sets `humanReviewRequired`.
- **Variant IDs / hook tags:** the prompt asks the agent to assign a traceable
  ID (e.g. `AIGO-123-V1`) and a hook tag (clinical outcome, ease, employer
  benefit, curiosity, social proof, urgency); a dedicated code action can be
  added later.

## Inputs

- `issueKey: string`

## Output (`CreativeGenerationResult`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-123",
  "channel": "Email",
  "variants": [
    { "angle": "Employer benefit", "headline": "...", "body": "...", "cta": "...",
      "claimsRisk": "Safe", "flaggedPhrases": [], "humanReviewRequired": false }
  ],
  "overallHumanReviewRequired": false,
  "notes": ["Generated copy is a draft for human review; nothing is sent."]
}
```

## Safety

Drafts only. Risky/prohibited copy routes to Compliance; SMS includes opt-out;
never implies cure, guaranteed outcomes, or replacing a doctor.
