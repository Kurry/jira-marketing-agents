# Experiment Spec — Automation Rule Audit (VM-AUTOMATION-VALIDATE)

**Rule key:** `experiment-spec`
**Agent:** `experiment-design-agent`
**T-M3-02 import task:** _see `evidence/automation/experiment-spec.md`_
**T-M3-03 validation status:** `[ ] PENDING` → operator updates to `[x] PASS` or `[x] FAIL`

---

## Import record

_Filled by operator after T-M3-02. Do not validate until all fields are present._

| Field | Value |
|---|---|
| Jira Automation rule ID | _(paste rule ID from Jira UI)_ |
| Import timestamp (UTC) | _(e.g. 2026-06-15T14:07:00Z)_ |
| Enabled at import | `false` |
| Source file | `automation/rules/experiment-spec.json` |

---

## Validation run

**Trigger used:** Experiment issue created **or** transitioned to `AI Triage` status
**Seed issue key:** _(e.g. AIGO-44)_
**Seed issue summary:** `[Experiment] Email subject line test to lift signup conversion rate`
**Rule fire timestamp (UTC):** _(paste from audit log)_

### Audit log excerpt
```
[PASTE: one successful audit-log row from the Jira Automation audit log.
 Must show: rule name, trigger event (created or transitioned to AI Triage),
 status=SUCCESS, no errors.]
```

### Forge logs excerpt
```
[PASTE: relevant lines from `forge logs -e development --since 1h`
 showing experiment-design-agent invocation and response.]
```

---

## Posted comment

_Paste the full body of the `addAnalysisComment` call posted to the seed issue._

```
[PASTE: full ADF-rendered comment body.
 Must contain the AI-analysis marker: "<!-- ai-analysis -->"
 Should include draft experiment spec (metrics, guardrails, decision rule)
 and a note that "launch requires human go/no-go".]
```

---

## Checklist

- [ ] Audit log shows exactly one rule-fire row for the seed issue
- [ ] Audit log row status is `SUCCESS` with zero errors
- [ ] Comment was posted to seed issue (visible in Jira)
- [ ] Comment body contains the AI-analysis marker text (`<!-- ai-analysis -->`)
- [ ] Comment body states that launch/go-decision requires human approval
- [ ] No campaign send or audience mutation step in audit log
- [ ] Rule remains `DISABLED` after test (enable only after lead + safety-reviewer approval)

---

## Verdict

`[ ] PASS` / `[ ] FAIL`

**Safety-reviewer sign-off:** _________________________________ Date: ___________
