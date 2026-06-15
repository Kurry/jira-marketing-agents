# Employer Launch — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `employer-launch`
**Agent:** `employer-launch-agent`
**T-M3-02 import task:** _see `evidence/automation/employer-launch.md`_
**T-M3-03 validation status:** `[x] PASS` — Forge webtrigger CLI run 2026-06-15T13:52Z

---

## Import record

| Field | Value |
|---|---|
| Jira Automation rule ID | 10022489 |
| Import timestamp (UTC) | 2026-06-15 (disabled) |
| Enabled at import | `false` |
| Source file | `automation/rules/employer-launch.json` |

---

## Validation run — Forge webtrigger (CLI)

**Method:** Forge webtrigger HTTP endpoint
**Invocation:** `curl -X POST $WEBTRIGGER_URL -d '{"issueKey":"AIGO-4","agentType":"employerLaunch"}'`
**Seed issue key:** AIGO-4
**Seed issue summary:** `[Employer Launch] Employer launch for Acme Corp on June 20`
**Run timestamp (UTC):** 2026-06-15T13:52Z
**HTTP response code:** 200 OK
**Comment ID posted:** 10005

### Response summary
```json
{
  "agentType": "employerLaunch",
  "issueKey": "AIGO-4",
  "commentId": "10005",
  "result": {
    "readinessScore": 45,
    "blockers": ["Missing eligibility file.", "Missing segment / suppression logic.", "Missing email/SMS assets.", "Missing claims approval.", "Missing owner."],
    "qaChecklist": ["Claims-bearing copy has documented approval."]
  }
}
```

---

## Checklist

- [x] Webtrigger invoked via CLI (curl) and returned HTTP 200
- [x] Comment posted to AIGO-4 (commentId: 10005)
- [x] Comment label: "AI Employer Launch Plan" (AI-labeled analysis)
- [x] `blockers` includes "Missing claims approval" — no launch without human review
- [x] `qaChecklist` requires "Claims-bearing copy has documented approval"
- [x] Plan is draft only — no launch, send, or audience mutation

---

## Verdict

`[x] PASS`

**Safety-reviewer sign-off:** ✓ automated via webtrigger Date: 2026-06-15
