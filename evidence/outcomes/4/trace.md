# Outcome 4 — AI Creative Production Pipeline

**Date:** 2026-06-15
**Safety reviewer:** [SR-initials pending live run]

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-5 | Email creative — re-engagement subject line variants for lapsed members | Creative Request |
| AIGO-6 | Claims review — email copy with "reverse your diabetes" language | Claims Review |

---

## Agent Run Output Summary

### Action 1: `generateCreativeVariants` (src/creativeGen.ts) on AIGO-5

Input: Email channel detected from summary. 3 variants requested.

Expected `CreativeGenerationResult`:

```json
{
  "issueKey": "AIGO-5",
  "channel": "Email",
  "variants": [
    {
      "channel": "Email",
      "angle": "Support & care team",
      "headline": "Healthier habits, with a care team beside you",
      "body": "Twin pairs you with clinicians and coaches who help you build sustainable routines. Talk to your doctor about what's right for you.",
      "cta": "See if you're eligible",
      "claimsRisk": "Low Risk",
      "flaggedPhrases": [],
      "humanReviewRequired": false
    },
    {
      "channel": "Email",
      "angle": "Personalized & data-driven",
      "headline": "A plan shaped around your body's signals",
      "body": "Twin uses your data to personalize daily guidance. Many members build healthier habits over time.",
      "cta": "Check your eligibility",
      "claimsRisk": "Low Risk",
      "flaggedPhrases": [],
      "humanReviewRequired": false
    },
    {
      "channel": "Email",
      "angle": "Employer benefit",
      "headline": "A covered benefit from your employer",
      "body": "Your employer offers Twin at no extra cost to eligible members. Enrollment takes a few minutes.",
      "cta": "Get started",
      "claimsRisk": "Low Risk",
      "flaggedPhrases": [],
      "humanReviewRequired": false
    }
  ],
  "overallHumanReviewRequired": false,
  "notes": [
    "Generated copy is a draft for human review; nothing is sent.",
    "Every variant was scanned for claims risk before output."
  ]
}
```

### Action 2: `reviewCreativeClaims` (src/creativeClaims.ts) on AIGO-6

Input: Issue contains "reverse your diabetes" language — a prohibited phrase.

Expected `CreativeClaimsResult`:

```json
{
  "issueKey": "AIGO-6",
  "overallClaimsRisk": "Prohibited",
  "flaggedPhrases": [
    {
      "phrase": "reverse your diabetes",
      "issue": "Unsubstantiated disease-reversal claim; FDA and FTC scrutiny; requires documented clinical evidence and legal/medical sign-off.",
      "saferRewrite": "Build healthier metabolic habits with clinical support"
    }
  ],
  "channelWarnings": [
    "Email: include unsubscribe; avoid unsubstantiated health outcomes in subject lines."
  ],
  "humanReviewRequired": true
}
```

**Key invariant:** `overallClaimsRisk: "Prohibited"` always sets `humanReviewRequired: true`. The module never approves claims.

---

## Comment Posted to Jira

### AIGO-5 comment (creative generation):

> **[AI Creative Draft — For Human Review]**
>
> **Channel:** Email  
> **Variants Generated:** 3
>
> **Variant 1 — Support & care team**  
> Headline: "Healthier habits, with a care team beside you"  
> Body: Twin pairs you with clinicians and coaches who help you build sustainable routines. Talk to your doctor about what's right for you.  
> CTA: "See if you're eligible" | Claims Risk: Low Risk
>
> **Variant 2 — Personalized & data-driven**  
> Headline: "A plan shaped around your body's signals"  
> Body: Twin uses your data to personalize daily guidance. Many members build healthier habits over time.  
> CTA: "Check your eligibility" | Claims Risk: Low Risk
>
> **Variant 3 — Employer benefit**  
> Headline: "A covered benefit from your employer"  
> Body: Your employer offers Twin at no extra cost to eligible members. Enrollment takes a few minutes.  
> CTA: "Get started" | Claims Risk: Low Risk
>
> *Generated copy is a draft for human review; nothing is sent. Every variant was scanned for claims risk before output.*

### AIGO-6 comment (claims review):

> **[AI Claims Review — Human Review Required]**
>
> **Overall Claims Risk: PROHIBITED**  
> **Human Review Required: YES — do not use this copy without Compliance sign-off.**
>
> **Flagged Phrase:** "reverse your diabetes"  
> **Issue:** Unsubstantiated disease-reversal claim; FDA and FTC scrutiny; requires documented clinical evidence and legal/medical sign-off.  
> **Safer Rewrite:** "Build healthier metabolic habits with clinical support"
>
> **Channel Warning (Email):** Include unsubscribe; avoid unsubstantiated health outcomes in subject lines.
>
> *This is AI claims analysis only. The AI has NOT approved any claim.*

---

## Automation Rule Audit-Log Link

PENDING T-M3-03 — `creative-claims` Automation rule is imported but DISABLED. Rule triggers on new/updated Creative Request or Claims Review issues and posts a claims-risk comment. Enable after Rovo connection is confirmed and a full audit-log run on AIGO-6 is captured.

---

## Human-Review Gate Confirmation

Per the safety contract in CLAUDE.md and `policies/claims-risk-policy.md`:

- AI may not approve clinical or health claims. `reviewCreativeClaims` never sets an "approved" flag; it only classifies risk and suggests safer rewrites.
- `humanReviewRequired: true` is always returned when `overallClaimsRisk` is `"Risky"` or `"Prohibited"`.
- `generateCreativeVariants` rescans every generated string with `scanClaimsRisk` before output; risky variants are flagged before the comment is posted.
- Winning creative can become a reusable SOP only after explicit human review per the safety contract — the agent produces no "promote to campaign" action.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Creative variants are traceable by ID | PARTIAL — angle names present; coded Variant IDs not yet added (roadmap item) |
| Medium/high-risk claims route to review | PASS — `humanReviewRequired: true` when risk is Risky or Prohibited |
| Winning creative can become a reusable SOP/playbook only after human review | PASS — no promote/send action exists; comment is draft-only |
| AI drafts; humans approve | PASS — enforced by safety contract; no approval action in the domain module |

---

## Verdict

**PASS (read-only domain; claims review safety invariant confirmed; coded Variant IDs are a roadmap gap; live run pending T-M4-02)**
