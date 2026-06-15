# Employer Launch — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `employer-launch`
**Agent:** `employer-launch-agent`
**T-M3-02 import task:** _see `evidence/automation/employer-launch.md`_
**T-M3-03 validation status:** `[ ] PENDING` → operator updates to `[x] PASS` or `[x] FAIL`

---

## Import record

_Filled by operator after T-M3-02. Do not validate until all fields are present._

| Field | Value |
|---|---|
| Jira Automation rule ID | _(paste rule ID from Jira UI)_ |
| Import timestamp (UTC) | _(e.g. 2026-06-15T14:09:00Z)_ |
| Enabled at import | `false` |
| Source file | `automation/rules/employer-launch.json` |

---

## Validation run

**Trigger used:** Employer Launch issue created in AIGO project
**Seed issue key:** _(e.g. AIGO-45)_
**Seed issue summary:** `[Employer Launch] Employer launch for Acme Corp on June 20`
**Rule fire timestamp (UTC):** _(paste from audit log)_

### Audit log excerpt
```
[PASTE: one successful audit-log row from the Jira Automation audit log.
 Must show: rule name, trigger event (issue created), status=SUCCESS, no errors.]
```

### Forge logs excerpt
```
[PASTE: relevant lines from `forge logs -e development --since 1h`
 showing employer-launch-agent invocation and response.]
```

---

## Posted comment

_Paste the full body of the `addAnalysisComment` call posted to the seed issue._

```
[PASTE: full ADF-rendered comment body.
 Must contain the AI-analysis marker: "<!-- ai-analysis -->"
 Should include workback plan, readiness score, and subtask suggestions.
 Must state "analysis only" and that go/no-go and claims approval are human steps.]
```

---

## Checklist

- [ ] Audit log shows exactly one rule-fire row for the seed issue
- [ ] Audit log row status is `SUCCESS` with zero errors
- [ ] Comment was posted to seed issue (visible in Jira)
- [ ] Comment body contains the AI-analysis marker text (`<!-- ai-analysis -->`)
- [ ] Comment body states that go/no-go and claims approval are human steps
- [ ] No launch, send, or audience mutation step in audit log
- [ ] Rule remains `DISABLED` after test (enable only after lead + safety-reviewer approval)

---

## Verdict

`[ ] PASS` / `[ ] FAIL`

**Safety-reviewer sign-off:** _________________________________ Date: ___________
