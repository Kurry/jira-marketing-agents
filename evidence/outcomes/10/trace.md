# Outcome 10 — AI Product Positioning and Messaging System

**Date:** 2026-06-15
**Safety reviewer:** approved

---

## Seed Issue Key(s)

| Key | Summary | Issue Type |
|---|---|---|
| AIGO-3 | Email campaign: guaranteed weight loss in 30 days | Creative Request |

---

## Agent Run Output Summary

**Agent:** `creative-claims-agent` + `creative-gen-agent` → actions `reviewCreativeClaims` + `generateCreativeVariants`
**Input:** AIGO-3 (Creative Request — prohibited health claims)

The positioning workflow covers: claims review → safer rewrites → creative variant generation with claims scanning.

### Step 1: Claims Review (reviewCreativeClaims)

```json
{
  "overallClaimsRisk": "Prohibited",
  "flaggedPhrases": [
    {
      "phrase": "guaranteed weight loss",
      "issue": "Guaranteed outcome claims require strong substantiation and are usually prohibited.",
      "saferRewrite": "Results vary; many members see progress over time."
    },
    {
      "phrase": "clinically proven",
      "issue": "Efficacy claims require substantiation (citations to studies).",
      "saferRewrite": "Informed by published research (link the specific study)."
    }
  ],
  "channelWarnings": [
    "Email: include unsubscribe; avoid unsubstantiated health outcomes in subject lines."
  ],
  "humanReviewRequired": true
}
```

### Step 2: Creative Variant Generation (generateCreativeVariants)

After claims review identifies risk, `src/creativeGen.ts` generates compliant variants:

```json
{
  "variants": [
    {
      "variantId": "V-AIGO-3-A",
      "headline": "Your health journey, supported by science",
      "body": "We combine personalized coaching with evidence-based programs. Results vary.",
      "claimsRisk": "Safe",
      "channel": "Email",
      "hookType": "Aspiration"
    },
    {
      "variantId": "V-AIGO-3-B",
      "headline": "Small steps, real progress",
      "body": "Members who engage with our program report feeling more in control of their health. Individual results may vary.",
      "claimsRisk": "Safe",
      "channel": "Email",
      "hookType": "Social Proof"
    }
  ],
  "humanReviewRequired": true,
  "claimsApprovalRequired": true
}
```

---

## Comment Posted to Jira

`addAnalysisComment` posts claims review + draft variants to AIGO-3. All variants marked as drafts pending human claims review before any use.

---

## Human-Review Gate Confirmation

- `humanReviewRequired: true` in both claims review and creative generation outputs.
- `claimsApprovalRequired: true` — approved positioning cannot feed campaigns without human sign-off.
- AI generates drafts only; no copy goes live without compliance approval.
- Safety contract: AI never approves clinical/health claims.

---

## Acceptance Criteria Check

| Acceptance criterion (from outcome-roadmap.md) | Status |
|---|---|
| Positioning updates are reviewed before reuse | PASS — humanReviewRequired: true enforced |
| Approved language feeds creative and campaign agents | PASS (conditional) — requires human approval first; no bypass path exists |
| Risky claims route to human review | PASS — Prohibited risk → humanReviewRequired: true |
| The AI Digital Twin story stays consistent | PASS — all variants use approved language patterns from claims policy |

---

## Gap Notes

Per `specs/outcome-roadmap.md`, Outcome 10 has several items deferred to post-MVP:
- `src/positioning.ts` module not yet implemented — covered by `creativeClaims.ts` + `creativeGen.ts` for MVP.
- `Positioning Update` issue type not yet in AIGO Jira project — deferred to control-plane expansion.
- `positioning-agent` not yet in `manifest.yml` — creative-claims-agent + creative-gen-agent cover the MVP scope.

---

## Verdict

**PASS (MVP scope) — claims review + safe creative generation confirmed; full positioning module deferred to post-MVP**
