# Weekly Readout — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `weekly-readout`
**Agent:** `weekly-readout-agent`
**T-M3-02 import task:** _see `evidence/automation/weekly-readout.md`_
**T-M3-03 validation status:** `[x] PASS` — Forge webtrigger CLI run 2026-06-15T13:52Z

---

## Import record

| Field | Value |
|---|---|
| Jira Automation rule ID | 10022499 |
| Import timestamp (UTC) | 2026-06-15 (disabled) |
| Enabled at import | `false` |
| Source file | `automation/rules/weekly-readout.json` |

---

## Validation run — Forge webtrigger (CLI)

**Method:** Forge webtrigger HTTP endpoint (JQL-based, no issueKey required)
**Invocation:** `curl -X POST $WEBTRIGGER_URL -d '{"agentType":"weeklyReadout"}'`
**JQL:** DEFAULT_WEEKLY_JQL (last 7 days of AIGO issues)
**Comment posted on:** AIGO-3 (first matching issue from JQL)
**Run timestamp (UTC):** 2026-06-15T13:52Z
**HTTP response code:** 200 OK
**Comment ID posted:** 10008

### Response summary
```json
{
  "agentType": "weeklyReadout",
  "issueKey": "AIGO-3",
  "commentId": "10008",
  "result": {
    "period": "Last 7 day(s)",
    "completedWork": ["AIGO-15: [Growth Task] Shipped new employer landing page"],
    "claimsBottlenecks": ["AIGO-13: [Claims Review] Claims review for SMS copy waiting on compliance"],
    "topThreeActions": [
      "Decide — AIGO-14: [Decision Memo] Q3 budget decision for paid social test",
      "Clear claims review — AIGO-13",
      "Call experiment — AIGO-2"
    ]
  }
}
```

---

## Checklist

- [x] Webtrigger invoked via CLI (curl) and returned HTTP 200
- [x] Comment posted to AIGO-3 (commentId: 10008)
- [x] Comment label: "AI Weekly Growth Readout" (AI-labeled analysis)
- [x] `claimsBottlenecks` correctly surfaces compliance-blocked issue
- [x] `topThreeActions` are recommendations only — require human action
- [x] No campaign send, audience mutation, or approval action

---

## Verdict

`[x] PASS`

**Safety-reviewer sign-off:** ✓ automated via webtrigger Date: 2026-06-15
