# Creative Claims — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `creative-claims`
**Agent:** `creative-claims-agent`
**T-M3-02 import task:** _see `evidence/automation/creative-claims.md`_
**T-M3-03 validation status:** `[ ] PENDING` → operator updates to `[x] PASS` or `[x] FAIL`

---

## Import record

_Filled by operator after T-M3-02. Do not validate until all fields are present._

| Field | Value |
|---|---|
| Jira Automation rule ID | _(paste rule ID from Jira UI)_ |
| Import timestamp (UTC) | _(e.g. 2026-06-15T14:05:00Z)_ |
| Enabled at import | `false` |
| Source file | `automation/rules/creative-claims.json` |

---

## Validation run

**Trigger used:** Creative Request issue transitioned to `Ready` status
**Seed issue key:** _(e.g. AIGO-43)_
**Seed issue summary:** `[Creative Request] Email and SMS creative: guaranteed diabetes reversal`
**Rule fire timestamp (UTC):** _(paste from audit log)_

### Audit log excerpt
```
[PASTE: one successful audit-log row from the Jira Automation audit log.
 Must show: rule name, trigger event (transition to Ready), status=SUCCESS, no errors.]
```

### Forge logs excerpt
```
[PASTE: relevant lines from `forge logs -e development --since 1h`
 showing creative-claims-agent invocation and response.]
```

---

## Posted comment

_Paste the full body of the `addAnalysisComment` call posted to the seed issue._

```
[PASTE: full ADF-rendered comment body.
 Must contain the AI-analysis marker: "<!-- ai-analysis -->"
 Must contain language stating this is "analysis only; not an approval".]
```

---

## Checklist

- [ ] Audit log shows exactly one rule-fire row for the seed issue
- [ ] Audit log row status is `SUCCESS` with zero errors
- [ ] Comment was posted to seed issue (visible in Jira)
- [ ] Comment body contains the AI-analysis marker text (`<!-- ai-analysis -->`)
- [ ] Comment body states this is **not an approval** (e.g. "analysis only; not an approval")
- [ ] **No `approve` step in audit log output — routing only** (transition to "Claims Review" is permitted; approval action is not)
- [ ] No "Approved" status transition occurred
- [ ] Rule remains `DISABLED` after test (enable only after lead + safety-reviewer approval)

---

## Verdict

`[ ] PASS` / `[ ] FAIL`

**Safety-reviewer sign-off:** _________________________________ Date: ___________
