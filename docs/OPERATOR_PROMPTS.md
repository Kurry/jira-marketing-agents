# Operator Prompts

Reusable prompts for tasks that require a human operator with browser access or
admin credentials. Paste into a Claude session that has browser automation tools
loaded.

---

## Add 14 canonical issue types to AIGO (T-M2-03b)

**When to use:** After a fresh site provision, or any time the AIGO project is
missing canonical issue types. Team-managed (next-gen) Jira projects do not
support issue type creation via REST API — this must be done through the UI.

**Prompt:**

> Go to `https://myhealthcaresite.atlassian.net/jira/software/projects/AIGO/settings/issuetypes`
> and add the following 14 issue types to the AIGO project. For each one, click
> "Add issue type", enter the name exactly as shown, and save before moving to
> the next:
>
> 1. AI Growth Request
> 2. Creative Request
> 3. Experiment
> 4. Segmentation Request
> 5. Personalization Journey
> 6. Employer Launch
> 7. Campaign
> 8. Dashboard Request
> 9. Signup Funnel Issue
> 10. Research Brief
> 11. Claims Review
> 12. Decision Memo
> 13. Positioning Update
> 14. Bug / Tracking Issue
>
> This is a team-managed (next-gen) Jira project — issue types can only be added
> here via the UI, not the REST API. Once all 14 are added, come back and let me
> know so I can update `evidence/jira-config/issue-types.json` with the assigned
> IDs and unblock the seed import (T-M2-07).

**After completion:** Update `evidence/jira-config/issue-types.json` — replace
`"status": "MANUAL_REQUIRED"` with `"status": "EXISTS"` and fill in the `"id"`
field for each type. Then run `AIGO_INSTANCE_CONFIG=instances/aigo.example.json node scripts/aigo-project-readiness.cjs` to confirm all 14 are detected.

---

## Confirm 19 Rovo agents are visible (T-M1-04)

**When to use:** After `forge deploy -e development` + `forge install`, to
confirm all agents appear in the Rovo UI.

**Prompt:**

> Go to `https://myhealthcaresite.atlassian.net` → Apps → Rovo → Agents.
> Confirm the following 19 agents are listed and show as active. Paste the
> names you see back here:
>
> 1. AI Growth Triage Agent
> 2. AI Requirements Gap Agent
> 3. AI Epic Breakdown Agent
> 4. AI Duplicate Detector Agent
> 5. AI Sprint Risk Agent
> 6. AI Acceptance Criteria Agent
> 7. AI QA Test Case Agent
> 8. AI Experiment Design Agent
> 9. AI Creative Claims Agent
> 10. AI Employer Launch Agent
> 11. AI Dashboard Spec Agent
> 12. AI Funnel Friction Agent
> 13. AI Weekly Readout Agent
> 14. AI Creative Generation Agent
> 15. AI Audience Builder Agent
> 16. AI Campaign Orchestration Agent
> 17. AI Landing Page Agent
> 18. AI Referral Loop Agent
> 19. AI Activation Agent

**After completion:** Record the confirmation in `evidence/gates/rovo-agents-visible.md`.

---

## Import automation rules (T-M3-02)

**When to use:** After issue types and seeds are in place, to import the 5
Jira Automation rules (all disabled by default).

**Prompt:**

> Go to `https://myhealthcaresite.atlassian.net/jira/software/projects/AIGO/settings/automation`
> → Import rules → upload `automation/rules/aigo-automation-ruleset.json`.
> After import, confirm all 5 rules appear in the list and are **disabled**.
> Do not enable any rule yet. Report back the rule names and their IDs from the
> URL when you click into each rule.
>
> Expected rules:
> 1. AIGO Intake Triage
> 2. AIGO Creative Claims Review
> 3. AIGO Experiment Spec
> 4. AIGO Employer Launch
> 5. AIGO Weekly Readout

**After completion:** Record rule IDs in `evidence/automation/` and proceed to
T-M3-03 (enable one rule at a time, trigger on a seed issue, capture audit log).
