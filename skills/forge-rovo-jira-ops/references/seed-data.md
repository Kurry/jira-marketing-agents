# Seed Data Reference

Use this seed set in a dev project to exercise all agents and Automation rules.
Create issues in order if stable keys matter; otherwise record the created keys
and substitute them in smoke tests.

The portable CSV import file is
`automation/seed/aigo-seed-issues.csv`. Render it through an instance config
before import so the `projectKey` and `label` columns match the target project.
It imports each seed issue as a `Task` so it works in a fresh team-managed
project before custom issue types and workflows are configured. The intended
type, target status, and routing signals are preserved in each description.

| Type | Status | Labels | Summary |
| --- | --- | --- | --- |
| Growth Task | To Do | `epic`, `acquisition` | Q3 employer acquisition push |
| Experiment | AI Triage | `experiment`, `email`, `signup` | Email subject line test to lift signup conversion rate |
| Creative Request | Ready | `creative`, `claims-risk`, `email`, `sms` | Email and SMS creative: guaranteed diabetes reversal |
| Employer Launch | In Progress | `employer-launch`, `launch-risk` | Employer launch for Acme Corp on June 20 |
| Dashboard Request | To Do | `dashboard`, `channel-performance` | Channel performance dashboard for CAC and signups |
| Signup Funnel Issue | Blocked | `funnel`, `mobile`, `p0` | Signup page broken on mobile Safari |
| Bug / Tracking Issue | To Do | `funnel`, `mobile` | Signup page broken on mobile Safari for new users |
| Segmentation Request | To Do | `audience`, `suppression`, `lapsed` | Target lapsed eligible employer members |
| Automation Request | To Do | `campaign`, `email`, `sms` | Re-engagement campaign to drive signup conversion |
| Growth Task | To Do | `landing-page`, `employer` | Co-branded eligibility landing page for employer members |
| Growth Task | To Do | `referral`, `incentive` | Add post-activation member referral program |
| Growth Task | To Do | `activation`, `onboarding`, `device` | Improve early activation after registration |
| Claims Review | Blocked | `claims-risk`, `blocked` | Claims review for SMS copy waiting on compliance |
| Decision Memo | Decision Needed | `decision-needed` | Q3 budget decision for paid social test |
| Growth Task | Done | `shipped`, `landing-page` | Shipped new employer landing page |

## CLI Import

Authenticate ACLI and verify the target project:

```bash
acli jira auth login --web
acli jira auth status
AIGO_INSTANCE_CONFIG=instances/<name>.json npm run seed:render
acli jira project view --key "<PROJECT>" --json
```

Import the rendered CSV:

```bash
acli jira workitem create-bulk --from-csv automation/seed/generated/<PROJECT>-seed-issues.csv --yes
```

Verify the import:

```bash
acli jira workitem search --jql "project = <PROJECT> AND labels = aigo-seed ORDER BY created DESC" --fields "key,summary,status" --csv
```

Optional status transitions, only after the workflow supports the target status:

```bash
acli jira workitem transition --jql "project = <PROJECT> AND labels = aigo-seed AND summary ~ \"Blocked\"" --status "Blocked" --yes
```

Bulk CSV import creates work items in the workflow's initial status. It does not
create custom issue types, configure workflows, or force arbitrary statuses.

## Description Patterns

Use rich but synthetic descriptions. Include these signals:

- Acquisition epic: employer members, channels, signup and activation metrics,
  compliance review, acceptance criteria.
- Experiment: audience, segment, primary metric, guardrails, decision rule,
  tracking events, due date.
- Creative claims: prohibited phrases such as "Guaranteed reversal of diabetes
  in 30 days" and "get off your medication"; explicit no-auto-approval language.
- Employer launch: launch date, missing final assets, landing page ready,
  tracking unconfirmed, missing claims approval.
- Dashboard: CAC, signups, conversion rate, spend, channel/week/campaign/segment
  dimensions, daily refresh.
- Funnel issue and duplicate bug: mobile Safari registration failure, 500 error,
  blocked on engineering logs.
- Audience/campaign/landing/referral/activation: include consent, suppression,
  tracking, legal/compliance, and human approval guardrails.
- Weekly readout: include one Done issue, one Decision Needed issue, one Blocked
  issue, and several in-flight issues updated recently.

Avoid real PHI, customer secrets, production campaign IDs, or real member data.
