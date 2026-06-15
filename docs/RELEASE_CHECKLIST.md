# Release Checklist

Use this checklist before any deploy to development or when promoting changes that
affect prompts, the manifest, or Automation rules.

T-M7-05 note: final content for the Automation section depends on T-M3-03
(automation validation) completing. Placeholder steps are marked accordingly.

---

## Pre-release local checks

Run all four commands and confirm each exits 0 before proceeding.

```bash
npm run build          # must exit 0
npm test               # must exit 0 (all tests pass)
npm run test:integration  # must exit 0
forge lint             # must exit 0 with only the addAnalysisComment warning
```

---

## Safety review (required for any prompt or policy change)

- [ ] safety-reviewer has reviewed all changed prompts
- [ ] No prompt weakens the safety contract (no approve, no send, no mutate)
- [ ] policies/claims-risk-policy.md guardrails still intact
- [ ] evidence/safety/ contains a sign-off for this change

---

## Manifest change checklist (required when adding/removing agents or scopes)

- [ ] forge lint passes
- [ ] Scopes are still exactly: read:jira-work, write:jira-work, read:chat:rovo
- [ ] Agent count matches expected (currently 19)
- [ ] Every new rovo:agent key has a matching prompts/*.md file
- [ ] architect and safety-reviewer have approved the manifest change
- [ ] Plan-approval gate completed (see TEAM_CHARTER.md)

---

## Automation rule change checklist

- [ ] Rendered JSON has no {{placeholder}} tokens remaining
- [ ] Every agentKey matches a rovo:agent key in manifest.yml
- [ ] Rule is imported DISABLED
- [ ] Safety-reviewer pre-approved the rule (no approve step, no autonomous mutation)
- [ ] Audit-log validation captured in evidence/automation/<rule>-audit.md
- [ ] Rule enabled only AFTER successful audit-log run captured

---

## Deploy checklist

```bash
forge deploy -e development   # capture to evidence/gates/forge-deploy.log
forge install list            # confirm Up-to-date
AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira  # VM-SMOKE-JIRA
```

---

## Rollback procedure

1. Note the previous version from `forge install list` before deploy.
2. If the deploy introduces a regression, re-deploy the previous version:
   `forge deploy -e development` from the previous git commit.
3. Run `forge install list` to confirm the rollback version is active.
4. Document the rollback in evidence/gates/ with the reason.

---

## Post-deploy verification

- [ ] `forge logs -e development --since 1h` shows no handler errors
- [ ] At least one manual Rovo agent run confirms expected behavior
- [ ] VM-LOCAL-GATES still green after any code changes
