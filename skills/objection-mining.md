# Skill: Objection Mining (+ Theme Clustering, Quote Extraction, Messaging Response)

**Status:** 📝 Prompt-driven (no dedicated code action yet)
**Used by:** Research Agent, Weekly Readout
**Implementation:** Agent prompt + [Issue Context Retrieval](jira-context-retrieval.md) and [Claims-Risk Review](claims-risk-review.md). A future `analyzeObjections` action can formalize the clustering.

## Purpose

Cluster member objections from qualitative sources (tickets, CRM notes, call
summaries, surveys), surface themes by segment/employer/funnel stage, pull
representative quotes, and suggest compliant messaging responses.

## Behavior (prompt contract)

1. Read the supplied issues/notes via context retrieval (plain-text extraction
   handles ADF).
2. Cluster objections into themes (e.g. cost, time, trust/privacy, eligibility
   confusion, skepticism about outcomes).
3. For each theme: count, affected segment/employer, 1–2 short representative
   quotes, and a **compliant** suggested response.
4. Run every suggested response through [Claims-Risk Review](claims-risk-review.md)
   before output.

## Inputs

- A set of issue keys or a JQL result of qualitative items (and/or pasted notes).

## Output (recommended shape)

```jsonc
{
  "themes": [
    {
      "theme": "Skeptical it will work for me",
      "count": 12,
      "segments": ["New / prospective"],
      "exampleQuotes": ["\"I've tried programs before and nothing stuck.\""],
      "suggestedResponse": "Twin personalizes guidance to your data and pairs you with a care team — talk to your doctor about what's right for you.",
      "claimsRisk": "Safe"
    }
  ]
}
```

## Safety

Read-only. Quotes are short and de-identified; never expose PHI. Suggested
responses are compliant drafts — risky/prohibited language routes to Compliance.
This skill recommends messaging; it never sends or approves it.
