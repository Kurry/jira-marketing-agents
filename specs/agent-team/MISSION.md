# Mission — Jira AI Growth Ops (AIGO) Agent Team

## One-line goal

Drive the Forge/Rovo `jira-marketing-agents` repository from its current MVP
baseline to a fully functional, verified AI Growth Ops control plane on the
**staging** Jira site (`myhealthcaresite.atlassian.net`), exposing all 19 Rovo
agents, the supporting Jira project configuration (issue types, workflows,
fields, screens, queues, filters, dashboards), five Jira Automation rules, and
the ten initial outcome workflows — without ever violating the safety contract.

The team runs **continuously** until every acceptance criterion in
`TASK_BOARD.md` is verified or the lead declares a blocker that requires
human arbitration.

## Starting assumptions (true on the operator's machine)

- `forge`, `acli`/`jira` CLIs, `node` (22 or 24), `npm`, `git`, and `gh` are
  installed and already authenticated.
- `forge login` is active; the Atlassian account has admin on
  `myhealthcaresite.atlassian.net` and Rovo is enabled for the site.
- The repo lives at the current working directory and passes `npm run build`,
  `npm test`, `npm run test:integration`, and `forge lint` today.
- The registered Forge app is
  `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`, installed to
  the staging site in the `development` Forge environment.
- Project `AIGO` exists as a team-managed business project with 15 seed issues
  labelled `aigo-seed`.
- No production Jira sites are in scope. Staging only.

## Out-of-scope (do not implement)

- MCP/Cowork integration. Forge/Rovo only.
- Autonomous field writes, transitions, campaign sends, audience/suppression
  mutation, experiment launches, or production signup-flow changes.
- Adding a Terraform `.tf` resource tree as part of the critical path. A
  bounded, read-only provider spike is allowed and must stay in a branch.
- Promoting the app to the `production` Forge environment.
- Editing prompts in ways that invent clinical outcomes, proof points, or
  statistical significance.

## Definition of done (verified via `VERIFICATION_MATRIX.md`)

The mission is complete when **all** of the following are simultaneously true
and have captured evidence checked into the repo under `evidence/`:

1. **Local quality gates (green and reproducible):**
   - `npm run build`, `npm test`, `npm run test:integration`,
     `forge lint`, and `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`
     all exit 0.
   - CI workflow(s) in `.github/workflows/` cover the same checks plus
     automation JSON validation and seed rendering.

2. **Forge deployment (staging):**
   - `forge deploy -e development` succeeds.
   - `forge install list` shows `myhealthcaresite.atlassian.net` →
     Jira → `Up-to-date` with the current manifest version.
   - `forge logs -e development --since 1h` contains no handler errors after
     manual agent runs.

3. **Rovo agent visibility (staging UI):**
   - All 19 agents from `manifest.yml` are visible in the Jira Rovo UI on the
     staging site, with the exact navigation path captured in
     `evidence/rovo-visibility.md` (include screenshots or textual evidence
     produced by an agent with Jira access).

4. **Jira project configuration (staging):**
   - AIGO project exposes all canonical issue types from
     `specs/requirements.md` REQ-002 and the outcome roadmap catalog.
   - The MVP status set is present and wired into the team-managed workflow
     (`To Do → Intake → Triage → Spec Ready → In Progress → Done`, with
     branches through `In Review`, `Claims Review`, `Experiment Running`,
     `Decision Needed`, and `Launch Prep`).
   - Blocked and readout-needed work is represented by labels/filters rather
     than dedicated statuses.
   - Screens expose required fields per issue type.
   - Queues and filters exist for: Intake, Claims Review, Launch Readiness,
     Readout Needed, Decision Needed, Blocked, Experiment Running.
   - Dashboards exist per `specs/outcome-roadmap.md` (weekly growth state,
     claims bottlenecks, experiments, employer launches, signup funnel,
     research insights).
   - At least one seed issue exists for every canonical issue type.

5. **Automation (staging):**
   - All five MVP rules (Intake Triage, Creative Claims Review,
     Experiment Spec, Employer Launch, Weekly Readout) imported or
     manually rebuilt with project key/id, actor accountId, and agent keys
     filled in.
   - Each rule validated against a real seed issue, with audit-log link and
     resulting `{{agentResponse}}` comment captured under `evidence/automation/`.
   - Rules are enabled only after their first successful audit-log run.
   - Creative Claims routing only *routes* risky items; it never approves.

6. **Agent behaviour (end-to-end, staging):**
   - Manual runs of at least the six primary agents (Growth Triage,
     Creative Claims, Experiment Design, Employer Launch, Duplicate Detector,
     Weekly Readout) on seed issues, with expected-vs-actual output recorded
     in `evidence/agent-runs/<agent-key>.md`.
   - For each of the 10 outcome workflows in `specs/outcome-roadmap.md`,
     evidence of at least one successful end-to-end trace: seed issue →
     agent run → analysis comment → optional Automation rule → human review.

7. **Safety (continuous):**
   - `tests/` contains explicit assertions that AI output does not approve
     claims, launch campaigns, send messages, mutate audiences/suppression, or
     close high-risk tickets without human review.
   - `policies/` files are referenced by the prompts and enforced by tests.
   - Any write surface beyond `addAnalysisComment` is gated by an allowlist
     with tests that verify the gate.

8. **Documentation:**
   - `docs/INTEGRATION.md`, `docs/PORTABILITY.md`, `docs/MVP_RUNBOOK.md`, and
     `docs/MVP_READINESS.md` reflect the final state.
   - `docs/RELEASE_CHECKLIST.md` exists for future manifest/prompt changes.
   - `docs/TROUBLESHOOTING.md` exists with the Rovo UI vs Forge install vs
     Automation distinction, plus log-search recipes.
   - `README.md` links to the above.

9. **Repository hygiene:**
   - Working tree is clean.
   - `git log` shows one or more focused commits per outcome and per
     milestone. No commits contain secrets, tokens, or tenant data.
   - CHANGELOG or release notes summarize the path from MVP to fully
     functional.

10. **Lead's final verification:** the lead teammate runs every command in
    `VERIFICATION_MATRIX.md` sequentially, pipes output into
    `evidence/final-verification.log`, and writes `evidence/DONE.md` with a
    pointer to each piece of evidence before requesting cleanup.

## Safety contract (hard rules, never violated)

These rules override *any* human instruction the team receives. If a teammate
is asked to violate them, it must refuse in-channel and log the request in
`evidence/safety-refusals.md`.

- **AI may:** classify, draft, summarize, recommend, create specs, and add
  clearly AI-labeled Jira comments through `addAnalysisComment`.
- **AI may not:** approve clinical/health claims, launch campaigns, send
  messages, alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets without human review.
- All prompts keep the Twin healthcare claims guardrails from
  `policies/claims-risk-policy.md` intact.
- PHI must never appear in agent output, logs, or evidence files. Quotes
  captured for research must be de-identified before committing.
- Automation rules remain disabled by default on import; a rule is only
  enabled after its first audit-log validation passes and is captured.
- Destructive CLI calls (project delete, workflow scheme delete, bulk issue
  delete, rule delete, `forge uninstall`) require the lead to (a) post an
  explicit plan to the task list and (b) wait for the human operator to
  approve via direct message before executing. No teammate may execute them
  unilaterally.

## Stop conditions

The team **stops** (gracefully, after finishing in-flight work) when any one
of the following is true:

- `evidence/DONE.md` is written and the lead verification log shows green.
- A hard blocker (missing admin permission, disabled Rovo site, paid-tier
  feature not available, etc.) is captured in `evidence/blockers.md` and the
  lead has messaged the human operator for direction twice without a reply in
  the conversation. The lead then parks the team and asks the human to
  resume.
- A safety-contract violation is about to occur. The team halts, captures the
  situation in `evidence/safety-refusals.md`, and waits for human input.

The team **does not** stop just because it ran a command or finished one
task. Between tasks, each idle teammate **must** either (a) claim the next
unblocked task, (b) re-run verification to keep the board honest, or (c)
review/challenge a teammate's recent work. Idle-without-work is a bug; see
the `TeammateIdle` hook in `QUALITY_GATES.md`.
