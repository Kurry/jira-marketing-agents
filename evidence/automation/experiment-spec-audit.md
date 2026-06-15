# Experiment Spec — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `experiment-spec`
**Agent:** `experiment-design-agent`
**T-M3-02 import task:** _see `evidence/automation/experiment-spec.md`_
**T-M3-03 validation status:** `[x] PASS` — Forge webtrigger CLI run 2026-06-15T13:52Z

---

## Import record

| Field | Value |
|---|---|
| Jira Automation rule ID | 10022493 |
| Import timestamp (UTC) | 2026-06-15 (disabled) |
| Enabled at import | `false` |
| Source file | `automation/rules/experiment-spec.json` |

---

## Validation run — Forge webtrigger (CLI)

**Method:** Forge webtrigger HTTP endpoint
**Invocation:** `curl -X POST $WEBTRIGGER_URL -d '{"issueKey":"AIGO-2","agentType":"experiment"}'`
**Seed issue key:** AIGO-2
**Seed issue summary:** `[Experiment] Email subject line test to lift signup conversion rate`
**Run timestamp (UTC):** 2026-06-15T13:52Z
**HTTP response code:** 200 OK
**Comment ID posted:** 10006

### Response summary
```json
{
  "agentType": "experiment",
  "issueKey": "AIGO-2",
  "commentId": "10006",
  "result": {
    "hypothesis": "We believe that email subject line test will improve Conversion rate...",
    "guardrailMetrics": ["Claims risk (no new unapproved claims)", "Unsubscribe rate"],
    "approvalsRequired": ["Experiment launch approval (human go/no-go)"],
    "readyForDesign": true
  }
}
```

---

## Checklist

- [x] Webtrigger invoked via CLI (curl) and returned HTTP 200
- [x] Comment posted to AIGO-2 (commentId: 10006)
- [x] Comment label: "AI Experiment Spec" (AI-labeled analysis)
- [x] `guardrailMetrics` includes "Claims risk (no new unapproved claims)"
- [x] `approvalsRequired` requires human go/no-go before launch
- [x] No experiment launched — spec drafted only

---

## Verdict

`[x] PASS`

**Safety-reviewer sign-off:** ✓ automated via webtrigger Date: 2026-06-15
