# Jira Automation Rules

> **Automation as code:** importable JSON definitions of every rule below live in
> [`rules/`](rules/) (`aigo-automation-ruleset.json` bundles all five). See
> [`rules/README.md`](rules/README.md) for how to import them and which
> placeholders to replace. The steps below remain the human-readable reference.

These rules wire the Rovo agents into Jira Automation. They use the **Use Rovo
agent** action and the `{{agentResponse}}` smart value. Rovo actions invoked by
automation are treated as **read-style**; any comment posting is done by an
explicit Automation "Add comment" action that a human configured (see
`policies/safe-mutations.md`).

> Setup: in Jira, go to **Project settings → Automation → Create rule**. For each
> rule below, add the trigger, condition, and actions described.

## Issue types (AIGO project)

Document and configure these issue types:

- Growth Task
- Experiment
- Creative Request
- Claims Review
- Dashboard Request
- Automation Request
- Employer Launch
- Segmentation Request
- Signup Funnel Issue
- Insight / Research Brief
- Bug / Tracking Issue
- Decision Memo

---

## 10.1 Intake Triage Rule

- **Trigger:** Issue created
- **Condition:** `project = AIGO`
- **Action:** Use Rovo agent → *AI Growth Triage Agent*
  - Prompt: "Triage this issue using summary, description, fields, comments,
    labels, and linked issues. Return clean summary, issue type, workflow area,
    risk, claims risk, missing information, suggested owner, acceptance criteria,
    subtasks, and recommended next status."
- **Follow-up action:** Add internal comment with `{{agentResponse}}`.

## 10.2 Creative Claims Rule

- **Trigger:** Issue transitioned to **Ready**
- **Condition:** `issuetype = "Creative Request"`
- **Actions:**
  - Use Rovo agent → *AI Creative Claims Agent*
  - Add comment with `{{agentResponse}}`
  - If risk is detected, transition to **Claims Review** (manual, or via a rule
    condition on the response). Approval remains a human step.

## 10.3 Experiment Spec Rule

- **Trigger:** Issue created, or transitioned to **AI Triage**
- **Condition:** `issuetype = Experiment`
- **Actions:**
  - Use Rovo agent → *AI Experiment Design Agent*
  - Add comment with `{{agentResponse}}`

## 10.4 Employer Launch Rule

- **Trigger:** Issue created
- **Condition:** `issuetype = "Employer Launch"`
- **Actions:**
  - Use Rovo agent → *AI Employer Launch Agent*
  - Add comment with `{{agentResponse}}`

## 10.5 Weekly Readout Rule

- **Trigger:** Scheduled — every Monday 8 AM
- **JQL:** `project = AIGO AND updated >= -7d ORDER BY updated DESC`
- **Actions:**
  - Use Rovo agent → *AI Weekly Readout Agent*
  - Create a **Decision Memo** issue, or add a comment to a recurring weekly
    issue, using `{{agentResponse}}`.

---

## Safety reminder

Automation must never be configured to autonomously approve claims, launch
campaigns, change audiences, alter suppression rules, or modify production
systems. Mutations beyond posting an analysis comment are out of scope for the
MVP.
