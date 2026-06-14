# Skill: Funnel Friction Analysis (+ Friction Classification, Impact Estimation, Product Ticket, Regression Checklist)

**Status:** ✅ Implemented
**Used by:** Funnel Friction Agent
**Implementation:** `src/funnel.ts` (`analyzeFunnelFriction`) · action `analyzeFunnelFriction`

## Purpose

Interpret a signup funnel issue: locate the affected step, classify the work
type, estimate impact, and produce a product-ready ticket with QA and regression
checks — without changing the production flow.

## Behavior

- **Step detection:** Landing page, Email capture, Account creation, Eligibility/
  verification, Payment, Confirmation.
- **Friction classification:** Engineering (error/crash/timeout), Analytics
  (tracking misfire), Copy (confusing/non-compliant wording), Product (UX/flow),
  or Unknown — each with a tailored likely cause and recommended fix.
- **Evidence:** extracts drop-off language, percentages, and device mentions; if
  none, recommends pulling funnel analytics.
- Emits QA requirements (reproduce on mobile/desktop, no adjacent-step
  regression, tracking validation) and acceptance criteria.

## Inputs

- `issueKey: string`

## Output (`FunnelFrictionResult`, abbreviated)

```jsonc
{
  "issueKey": "AIGO-123",
  "affectedStep": "Account creation",
  "problemStatement": "...",
  "evidence": ["Quantified signal in issue: 40%."],
  "likelyCause": "A technical error or broken element is blocking completion …",
  "recommendedFix": "Reproduce, capture logs, fix the error, add regression coverage.",
  "expectedImpact": "Recovering drop-off at this step should increase signup conversion …",
  "qaRequirements": ["Reproduce on mobile and desktop."],
  "acceptanceCriteria": ["Users complete the Account creation step without the reported friction."],
  "workType": "Engineering"
}
```

## Safety

Read-only analysis. Production signup changes require human approval; the skill
recommends fixes, it does not apply them.
