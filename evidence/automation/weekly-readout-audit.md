# Weekly Readout — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `weekly-readout`
**Agent:** `weekly-readout-agent`
**T-M3-02 import task:** _see `evidence/automation/weekly-readout.md`_
**T-M3-03 validation status:** `[ ] PENDING` → operator updates to `[x] PASS` or `[x] FAIL`

---

## Import record

_Filled by operator after T-M3-02. Do not validate until all fields are present._

| Field | Value |
|---|---|
| Jira Automation rule ID | _(paste rule ID from Jira UI)_ |
| Import timestamp (UTC) | _(e.g. 2026-06-15T14:11:00Z)_ |
| Enabled at import | `false` |
| Source file | `automation/rules/weekly-readout.json` |

---

## Validation run

**Trigger used:** Manual trigger (or scheduled Mon 08:00 America/New_York)
**Seed issue key:** _(Decision Memo issue created by the rule — paste key after run, e.g. AIGO-46)_
**Rule fire timestamp (UTC):** _(paste from audit log)_

### Audit log excerpt
```
[PASTE: one successful audit-log row from the Jira Automation audit log.
 Must show: rule name, trigger event (scheduled or manual), status=SUCCESS, no errors.
 Should show jira.issue.create action producing the Decision Memo issue.]
```

### Forge logs excerpt
```
[PASTE: relevant lines from `forge logs -e development --since 1h`
 showing weekly-readout-agent invocation and response.]
```

---

## Posted comment

_The weekly-readout rule creates a Decision Memo issue rather than posting a comment to a trigger issue. Paste the full issue description / body of the created Decision Memo._

```
[PASTE: full body of the created Decision Memo Jira issue (summary + description).
 Must contain the AI-analysis marker: "<!-- ai-analysis -->"
 Should include weekly growth readout over the JQL result set.
 Must not contain any campaign-send, audience-mutation, or approval action.]
```

---

## Checklist

- [ ] Audit log shows exactly one rule-fire row for the scheduled/manual trigger
- [ ] Audit log row status is `SUCCESS` with zero errors
- [ ] A new Decision Memo issue was created in AIGO (paste key above)
- [ ] Decision Memo body contains the AI-analysis marker text (`<!-- ai-analysis -->`)
- [ ] No campaign send, audience mutation, or approval step in audit log
- [ ] Rule remains `DISABLED` after test (enable only after lead + safety-reviewer approval)
- [ ] `{{now.format(...)}}` smart value resolved correctly in the issue title/body

---

## Verdict

`[ ] PASS` / `[ ] FAIL`

**Safety-reviewer sign-off:** _________________________________ Date: ___________
