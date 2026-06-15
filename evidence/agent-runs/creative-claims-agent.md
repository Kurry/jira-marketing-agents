# Agent Run Evidence — AI Creative Claims Agent
Task: T-M4-02
VM row: VM-AGENT-RUN
Date: TBD
Seed issue key: TBD — strong candidate: AIGO-3 ("[Creative Request] Email and SMS creative: guaranteed diabetes reversal")

## Input
- Issue summary: TBD (likely "[Creative Request] Email and SMS creative: guaranteed diabetes reversal")
- Issue type: Creative Request
- Issue status: To Do

## Expected output (from prompts/creative-claims-agent.md + src/creativeClaims.ts)

The agent calls `getIssueContext` then `reviewCreativeClaimsRisk`. Based on src/creativeClaims.ts:

- **Overall claims risk** — one of: `Safe` / `Needs substantiation` / `Risky` / `Prohibited` /
  `Requires human review`. For the "guaranteed diabetes reversal" seed issue, expect `Prohibited`
  (absolute outcome language + disease reversal claim). `scanClaimsRisk()` detects prohibited phrases.
- **Flagged phrases with issue and safer rewrite** — for each phrase detected by `scanClaimsRisk()`:
  - `phrase`: the exact text (e.g. "guaranteed", "diabetes reversal")
  - `issue`: reason it's risky (e.g. "Unsubstantiated absolute outcome claim")
  - `saferRewrite`: a compliant alternative (e.g. "may support" or "designed to help manage")
- **Channel warnings** — from text-based channel detection:
  - If "sms" or "text message" detected: "SMS: ensure consent and opt-out language; health claims are especially scrutinized."
  - If "email" detected: "Email: include unsubscribe; avoid unsubstantiated health outcomes in subject lines."
  - If "paid"/"ads"/"meta"/"google ads" detected: "Paid ads: platforms restrict health/medical claims..."
  - For AIGO-3 (email + SMS), expect BOTH email and SMS channel warnings.
- **Human review required** — `true` whenever claims risk is Risky, Prohibited, or Requires human review.
  For AIGO-3, expect `humanReviewRequired: true`.
- **Safety constraint enforced**: the agent NEVER approves claims. Output is classification + rewrites only.
  Any Risky/Prohibited result explicitly routes to Compliance / Medical Review.

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
