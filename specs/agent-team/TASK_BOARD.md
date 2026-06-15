# Task Board (seed for the shared task list)

The lead should create one Claude Code task per `T-*` row below in the shared
task list at startup, preserving the id, owner, and dependencies. Tasks with
unsatisfied dependencies stay `pending`; tasks become `claimable` only when
their `deps` column is empty or fully `completed`.

Evidence paths are relative to `evidence/` in the repo. Every `[x]`
acceptance bullet must be backed by a file or log fragment at that path.

Legend:

- `deps=*` means no dependencies.
- `owner:<name>` must exactly match a teammate in `TEAM_CHARTER.md`.
- `verify:<row>` refers to a row in `VERIFICATION_MATRIX.md`.

---

## Milestone M0 — Repo baseline, CI, and ground truth

- **T-M0-01** [owner:architect] [deps:*]
  Confirm current state matches `MISSION.md` starting assumptions. Read
  `specs/`, `manifest.yml`, `package.json`, `docs/MVP_READINESS.md`. Produce
  `evidence/ground-truth.md` listing: Forge app id, installed Jira sites,
  AIGO project key, seed count, Node version, any repo drift. Verify: none;
  this is discovery.

- **T-M0-02** [owner:forge-engineer] [deps:*]
  Run the local quality gates (`npm ci`, `npm run build`, `npm test`,
  `npm run test:integration`, `forge lint`). Capture output under
  `evidence/gates/initial.log`. If anything fails, raise child tasks to fix,
  tagged `M0`.
  Verify: `VERIFICATION_MATRIX.md#VM-LOCAL-GATES` must be green before M1
  unblocks.

- **T-M0-03** [owner:docs-writer] [deps:*]
  Create `STATUS.md` at repo root with the template in
  `RUNBOOK.md#status-template`. Lead keeps it updated thereafter.

- **T-M0-04** [owner:forge-engineer] [deps:T-M0-02]
  Extend `.github/workflows/ci.yml` (if missing any step) to run: lint,
  build, unit tests, integration tests, automation JSON schema check, and
  `npm run seed:render`. Commit. Evidence: green CI run link in
  `evidence/gates/ci.md`.

- **T-M0-05** [owner:qa-verifier] [deps:T-M0-01]
  Create `evidence/` directory scaffolding:
  `evidence/{gates,agent-runs,automation,rovo,decisions,blockers,safety-refusals,outcomes}/`
  each with a placeholder `README.md`. Commit.

- **T-M0-06** [owner:architect] [deps:T-M0-01]
  Create top-level `CLAUDE.md` summarising: repo purpose, safety contract,
  file-ownership map, "always read before acting" references to files in
  this spec bundle. Commit.

## Milestone M1 — Forge deploy + Rovo visibility on staging

- **T-M1-01** [owner:forge-engineer] [deps:T-M0-02]
  Run `forge deploy -e development`. Capture stdout/stderr to
  `evidence/gates/forge-deploy.log`. If the version changed, note the new
  manifest version.
  Verify: `VM-FORGE-DEPLOY`.

- **T-M1-02** [owner:forge-engineer] [deps:T-M1-01]
  Run `forge install --upgrade -e development -p jira --site
  myhealthcaresite.atlassian.net --confirm-scopes` if scopes changed;
  otherwise just `forge install list`. Record output at
  `evidence/gates/forge-install.log`.
  Verify: `VM-FORGE-INSTALL`.

- **T-M1-03** [owner:qa-verifier] [deps:T-M1-02]
  Run `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`. Capture to
  `evidence/gates/smoke-jira.log`.
  Verify: `VM-SMOKE-JIRA`.

- **T-M1-04** [owner:qa-verifier] [deps:T-M1-02]
  Confirm all 19 Rovo agents visible in the Jira UI. The team has Jira REST
  access; enumerate agents via Forge Rovo APIs where possible, and record
  navigation path + agent names in `evidence/rovo/visibility.md`. If the
  REST surface does not expose this reliably, this task becomes
  `blocked-human` and the lead asks the operator to paste confirmation.
  Verify: `VM-ROVO-VISIBILITY`.

- **T-M1-05** [owner:safety-reviewer] [deps:T-M1-01]
  Verify `manifest.yml` scopes are still `read:jira-work`, `write:jira-work`,
  `read:chat:rovo`. Diff against the last known-good and record in
  `evidence/safety/scope-audit.md`. Reject any broadening.

## Milestone M2 — AIGO project configuration (staging)

- **T-M2-01** [owner:architect] [deps:T-M1-03]
  Finalize the canonical issue-type catalog (14 types) in
  `specs/issue-types.md`: AI Growth Request, Creative Request, Experiment,
  Segmentation Request, Personalization Journey, Employer Launch, Campaign,
  Dashboard Request, Signup Funnel Issue, Research Brief, Claims Review,
  Decision Memo, Positioning Update, Bug/Tracking Issue. Document any
  legacy aliases (e.g. Insight/Research Brief → Research Brief).

- **T-M2-02** [owner:architect] [deps:T-M1-03]
  Finalize the custom-field catalog per field list in
  `specs/outcome-roadmap.md` (Target Population, Signal Sources, Segment,
  Suppression Rules, Primary Metric, Targeting Confidence, Journey Stage,
  Channels, Behavior Trigger, Proof Point, Claims Risk, Creative Type,
  Hook Type, Variant ID, Experiment ID, Hypothesis, Guardrail Metrics,
  Sample Feasibility, Decision Date, Decision Needed, Confidence,
  Research Source, Theme, Frequency, Conversion Impact, Recommended Test,
  Campaign Goal, Launch Date, Assets Required, Readiness Score, Blockers,
  Funnel Step, Affected Segment, Drop-off Impact, Evidence, Expected Lift,
  QA Required). Record in `specs/custom-fields.md`.

- **T-M2-03** [owner:jira-admin] [deps:T-M2-01]
  Submit plan for lead approval, then create the missing issue types in
  AIGO via Jira REST / ACLI. Capture before/after in
  `evidence/jira-config/issue-types.json`. Update
  `scripts/aigo-project-readiness.cjs` to assert the full set.
  Verify: `VM-JIRA-ISSUE-TYPES`.

- **T-M2-04** [owner:jira-admin] [deps:T-M2-02]
  Create missing custom fields and attach them to the appropriate issue
  types via screens. Evidence: `evidence/jira-config/custom-fields.json`
  and screen IDs. Update readiness script.
  Verify: `VM-JIRA-FIELDS`.

- **T-M2-05** [owner:jira-admin] [deps:T-M2-03]
  Build the MVP team-managed workflow/status set and attach it to the AIGO
  board. Statuses: To Do, Intake, Triage, Spec Ready, In Review, In Progress,
  Claims Review, Experiment Running, Decision Needed, Launch Prep, Done.
  Blocked and readout-needed work is represented by labels/filters. Build
  transition expectations per `specs/workflows.md` (produced in T-M2-06).
  Evidence: `evidence/jira-config/statuses.json`.
  Verify: `VM-JIRA-WORKFLOW`.

- **T-M2-06** [owner:architect] [deps:T-M2-01]
  Produce `specs/workflows.md` describing per-issue-type transition
  matrices, required fields per transition, and required human approval
  gates. Reviewed by `safety-reviewer`.

- **T-M2-07** [owner:jira-admin] [deps:T-M2-05]
  Re-import seeds via `npm run seed:render` then `acli jira work import`
  (or equivalent), with at least one issue per canonical type.
  Evidence: `evidence/jira-config/seeds.md` listing issue keys per type.
  Verify: `VM-SEED-COVERAGE`.

- **T-M2-08** [owner:qa-verifier] [deps:T-M2-07]
  Extend `scripts/aigo-project-readiness.cjs` to verify transition paths,
  required fields, screens, seed coverage, and Rovo visibility. Output
  goes to `evidence/readiness/full.log`.
  Verify: `VM-READINESS`.

## Milestone M3 — Jira Automation import & validation

- **T-M3-01** [owner:automation-eng] [deps:T-M2-07]
  Implement per-instance rule rendering. Take the five templates in
  `automation/rules/*.json`, replace `{{projectKey}}`,
  `{{projectId}}`, `{{actorAccountId}}`, `{{agentKey}}` from the
  instance config; fail loudly if placeholders remain. Add tests under
  `tests/automation/*.test.ts`.
  Verify: `VM-AUTOMATION-RENDER`.

- **T-M3-02** [owner:automation-eng] [deps:T-M3-01]
  Import each rule one at a time via Jira Automation REST (or the UI if
  REST is insufficient); keep all five rules **disabled** after import.
  Evidence per rule at `evidence/automation/<rule>.md`.
  Verify: `VM-AUTOMATION-IMPORT`.

- **T-M3-03** [owner:automation-eng, qa-verifier] [deps:T-M3-02]
  For each of the five rules:
   1. Create (or reuse) a seed issue that triggers the rule.
   2. Enable the rule temporarily.
   3. Trigger it; capture audit log + resulting comment.
   4. If green, leave enabled; otherwise disable and open a child task.
  Evidence: `evidence/automation/<rule>-audit.md`.
  Safety: Creative Claims rule must never have a step that *approves*
  claims. `safety-reviewer` pre-approves the enablement plan.
  Verify: `VM-AUTOMATION-VALIDATE`.

- **T-M3-04** [owner:automation-eng] [deps:T-M3-01]
  Add automation template contract tests: each rule must reference a real
  manifest agent key, add AI-analysis comment text, be disabled by
  default, and never approve claims or launch work.

## Milestone M4 — Primary agent manual validation (6 agents)

All six tasks below share `deps:T-M2-07`. Run in parallel.

- **T-M4-01** [owner:qa-verifier] — Run AI Growth Triage Agent on the mobile
  Safari signup seed issue. Record expected vs actual at
  `evidence/agent-runs/growth-triage-agent.md`. Check
  `forge logs -e development --since 1h` for handler errors and attach.
  Verify: `VM-AGENT-RUN`.

- **T-M4-02** [owner:qa-verifier] — AI Creative Claims Agent on the risky
  creative issue. `evidence/agent-runs/creative-claims-agent.md`.

- **T-M4-03** [owner:qa-verifier] — AI Experiment Design Agent on the email
  subject-line experiment. `evidence/agent-runs/experiment-design-agent.md`.

- **T-M4-04** [owner:qa-verifier] — AI Employer Launch Agent on the Acme
  launch issue. `evidence/agent-runs/employer-launch-agent.md`.

- **T-M4-05** [owner:qa-verifier] — AI Duplicate Detector Agent on the mobile
  Safari funnel issue. `evidence/agent-runs/duplicate-detector-agent.md`.

- **T-M4-06** [owner:qa-verifier] — AI Weekly Readout Agent over recent AIGO
  issues. `evidence/agent-runs/weekly-readout-agent.md`.

Each task is **not** complete until `safety-reviewer` signs off that output
does not violate the safety contract.

## Milestone M5 — Outcome workflows 1–10 (parallel tracks)

Each outcome is one parent task with child tasks. Parent is owned by
`architect`; children distribute across `forge-engineer`,
`automation-eng`, `jira-admin` per the ownership map in
`TEAM_CHARTER.md`. All depend on `T-M2-07` and the matching M4 run.

- **T-M5-01** Outcome 1: AI Growth Intake & Triage
- **T-M5-02** Outcome 2: AI Segmentation & Targeting
- **T-M5-03** Outcome 3: AI Personalization Journey
- **T-M5-04** Outcome 4: AI Creative Production
- **T-M5-05** Outcome 5: AI Experimentation Engine
- **T-M5-06** Outcome 6: AI Research & Objection Mining
- **T-M5-07** Outcome 7: Campaign & Employer Launch Orchestration
- **T-M5-08** Outcome 8: AI Conversion Optimization (signup funnel)
- **T-M5-09** Outcome 9: AI Analytics & Decision Support (weekly readout)
- **T-M5-10** Outcome 10: AI Product Positioning & Messaging

For each parent, the lead expands the matching section of
`specs/outcome-roadmap.md` (or `specs/tasks.md` Outcome N Tasks) into child
tasks. Every child must:

- map to a code module under `src/` (create or extend),
- or a Jira configuration change,
- or a prompt/automation rule,
- produce a passing test,
- produce an evidence file showing a real staging run.

Completion criteria per outcome are the Acceptance bullets already present
in `specs/outcome-roadmap.md`; the lead copies them into each parent task's
acceptance field.

## Milestone M6 — Queues, filters, dashboards

- **T-M6-01** [owner:jira-admin] [deps:T-M2-05] Queue/filter specs per
  `specs/outcome-roadmap.md` Jira Control Plane Tasks (Intake,
  Claims Review, Launch Readiness, Readout Needed, Decision Needed,
  Blocked, Experiment Running). Evidence: `evidence/jira-config/queues.md`.
- **T-M6-02** [owner:jira-admin] [deps:T-M5-*] Build dashboards listed in
  `specs/outcome-roadmap.md`. Evidence: dashboard IDs and screenshots
  in `evidence/jira-config/dashboards.md`.

## Milestone M7 — Docs, runbook, release checklist

- **T-M7-01** [owner:docs-writer] [deps:T-M4-*] Update
  `docs/INTEGRATION.md` to the final deploy/install flow.
- **T-M7-02** [owner:docs-writer] [deps:T-M3-03] Update
  `docs/MVP_RUNBOOK.md` to reflect imported rules and validated agents.
- **T-M7-03** [owner:docs-writer] [deps:T-M5-*] Update
  `docs/PORTABILITY.md` with verified steps for cloning from staging to
  another site.
- **T-M7-04** [owner:docs-writer] [deps:T-M1-03] Create
  `docs/TROUBLESHOOTING.md` (Rovo UI vs Forge install, log recipes,
  Automation audit log).
- **T-M7-05** [owner:docs-writer] [deps:T-M3-03] Create
  `docs/RELEASE_CHECKLIST.md` for future manifest/prompt changes.
- **T-M7-06** [owner:docs-writer] [deps:*] Keep `README.md` section links
  current.

## Milestone M8 — Final verification & handoff

- **T-M8-01** [owner:qa-verifier] [deps:T-M1..T-M7 all completed]
  Run every row in `VERIFICATION_MATRIX.md` sequentially; pipe output to
  `evidence/final-verification.log`.
- **T-M8-02** [owner:safety-reviewer] [deps:T-M8-01]
  Full re-read of every prompt in `prompts/`, every rule in
  `automation/rules/`, and every `policies/*.md`. Produce
  `evidence/safety/final-audit.md` with sign-off or objections.
- **T-M8-03** [owner:architect] [deps:T-M8-02]
  Write `evidence/DONE.md` with pointers to every evidence file and a
  concise summary of the end state.
- **T-M8-04** [owner:lead] [deps:T-M8-03]
  Post handoff message to the human operator; await instruction to clean
  up the team. Do **not** run cleanup autonomously; cleanup requires
  explicit human approval.

## Continuous / non-milestone tasks

- **T-CX-01** [owner:docs-writer] Keep `STATUS.md` refreshed every ~20
  minutes. Never complete; remains `in progress` for the mission.
- **T-CX-02** [owner:safety-reviewer] Review every diff that lands on
  `main`. Opens objections as child tasks on the offending parent.
- **T-CX-03** [owner:qa-verifier] Re-run the VM-LOCAL-GATES at least once
  per milestone transition; append to `evidence/gates/rolling.log`.
- **T-CX-04** [owner:lead] Watch for hook feedback (TaskCompleted,
  TeammateIdle); react within the next tick.
