# Intake Triage — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `intake-triage`
**Agent:** `growth-triage-agent`
**T-M3-02 import task:** _see `evidence/automation/intake-triage.md`_
**T-M3-03 validation status:** `[ ] PENDING` → operator updates to `[x] PASS` or `[x] FAIL`

---

## Import record

_Filled by operator after T-M3-02. Do not validate until all fields are present._

| Field | Value |
|---|---|
| Jira Automation rule ID | _(paste rule ID from Jira UI)_ |
| Import timestamp (UTC) | _(e.g. 2026-06-15T14:03:00Z)_ |
| Enabled at import | `false` |
| Source file | `automation/rules/intake-triage.json` |

---

## Validation run

**Trigger used:** Issue created in AIGO project (event trigger)
**Seed issue key:** _(e.g. AIGO-42)_
**Seed issue summary:** `[Bug / Tracking Issue] Signup page broken on mobile Safari for new users`
**Rule fire timestamp (UTC):** _(paste from audit log)_

### Audit log excerpt
```
[PASTE: one successful audit-log row from the Jira Automation audit log.
 Must show: rule name, trigger event, status=SUCCESS, no errors.]
```

### Forge logs excerpt
```
[PASTE: relevant lines from `forge logs -e development --since 1h`
 showing growth-triage-agent invocation and response.]
```

---

## Posted comment

_Paste the full body of the `addAnalysisComment` call posted to the seed issue._

```
[PASTE: full ADF-rendered comment body.
 Must contain the AI-analysis marker: "<!-- ai-analysis -->"]
```

---

## Checklist

- [ ] Audit log shows exactly one rule-fire row for the seed issue
- [ ] Audit log row status is `SUCCESS` with zero errors
- [ ] Comment was posted to seed issue (visible in Jira)
- [ ] Comment body contains the AI-analysis marker text (`<!-- ai-analysis -->`)
- [ ] No field mutations (workflow area, status, assignee) occurred automatically
- [ ] Rule remains `DISABLED` after test (enable only after lead + safety-reviewer approval)

---

## Verdict

`[ ] PASS` / `[ ] FAIL`

**Safety-reviewer sign-off:** _________________________________ Date: ___________
