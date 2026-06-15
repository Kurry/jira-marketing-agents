# MVP Readiness Note

Date: 2026-06-15

Status: not ready for MVP exit.

This note records the current evidence, blockers, risks, and decisions for the
Forge/Rovo-only AI Growth Ops Jira MVP.

## Evidence Collected

Repo checks pass:

- `npm run build`
- `npm test`
- `npm run test:integration`
- `forge lint` with 0 errors and the expected standalone `addAnalysisComment`
  warning
- `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`
- `AIGO_INSTANCE_CONFIG=instances/aigo.example.json npm run provision:instance -- --all --dry-run`

Live Jira evidence:

- Forge app is installed to Jira on `myhealthcaresite.atlassian.net`.
- Forge install list reports environment `development`, product `Jira`, status
  `Up-to-date`.
- Project `AIGO` exists as `AI Growth Ops`.
- 15 seeded issues with label `aigo-seed` exist.
- Observed seed statuses are `To Do`, `In Progress`, and `Done`.
- Observed issue types are `Workstream`, `Task`, and `Sub-task`.

Portable provisioning evidence:

- Instance config contract exists in `instances/aigo.example.json`.
- Seed rendering rewrites project key and seed label per instance.
- Provisioning dry-run covers Forge install, Jira project create/clone, seed
  import, smoke check, and readiness check.
- `docs/PORTABILITY.md` documents the scalable approach: one Forge app, many
  instance configs, and Jira project cloning from a golden template project.

## Blockers

1. Rovo UI visibility is unverified.
   - The CLI proves Forge installation, not that a human can see all 19 agents
     in Jira/Rovo.
   - TWG Rovo app discovery failed with `Downstream(s) failed: third_party` in
     prior checks, so UI confirmation is still required.

2. The live AIGO project is not configured with the intended issue types.
   - Missing: Growth Task, Experiment, Creative Request, Claims Review,
     Dashboard Request, Automation Request, Employer Launch, Segmentation
     Request, Signup Funnel Issue, Insight / Research Brief, Bug / Tracking
     Issue, Decision Memo.

3. The live workflow is not configured with the intended MVP statuses.
   - Unobserved on seeded issues: AI Triage, Needs Info, Needs Human Review,
     Ready, Claims Review, Blocked, Experiment Running, Readout Needed, Decision
     Needed.
   - ACLI cannot prove team-managed workflow statuses that are not visible on
     issues, so Jira project settings must be checked manually or via a future
     admin API client.

4. Jira Automation is not validated live.
   - Rule JSON exists, but import, placeholder replacement, enablement, and
     audit-log validation have not been completed in Jira.

5. Manual Rovo agent behavior checks are not complete.
   - The six required manual checks from `specs/tasks.md` still need to run in
     Jira/Rovo against seeded issues.

## Safety Review

Repo-level safety posture is aligned with the MVP policy:

- Rovo agents do not directly reference `addAnalysisComment`.
- `addAnalysisComment` is the only mutating Forge action.
- Field writes, transitions, campaign sends, audience mutation, claims approval,
  experiment launch, and production signup-flow changes remain out of scope.
- Jira Automation definitions are intended to use explicit Jira Automation
  comment/routing actions after a Rovo response.

Live Automation safety cannot be signed off yet because the rules have not been
imported and validated in Jira audit logs.

## Decisions

- Forge/Rovo remains the application framework.
- MCP/Cowork remains out of scope.
- General Jira project configuration is not treated as Terraform-managed in this
  repo. There is no complete first-party Terraform path for all required Jira
  project, workflow, board, Automation, and Rovo surfaces.
- The scalable setup path is instance configs plus a golden company-managed Jira
  template project cloned with ACLI.
- Fresh team-managed projects remain supported for seed/import smoke tests, but
  they are not the recommended scalable project configuration strategy.

## Required Before MVP Exit

1. Confirm all 19 agents are visible in Jira/Rovo and record the navigation
   path.
2. Configure or clone the 12 issue types into the target project.
3. Configure or clone the full MVP workflow statuses and transition paths.
4. Re-import or recreate seed issues with custom issue types if useful after
   project configuration.
5. Import/rebuild all five Jira Automation rules.
6. Replace Automation placeholders and enable one rule at a time.
7. Capture Automation audit-log success for all five rules.
8. Run and record the six manual Rovo checks.
9. Check `forge logs -e development --since 1h --limit 50` after manual Rovo
   and Automation runs.

## Exit Criteria

The MVP is ready only when:

- `npm run build`, `npm test`, `npm run test:integration`, `forge lint`,
  `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira`, and
  `npm run test:readiness:jira` pass without readiness failures.
- A human can see the Rovo agents in Jira.
- Primary agents return useful structured output on seeded issues.
- Jira Automation rules run without audit-log errors and post review-only AI
  comments.
- No critical blocker remains for the configured development-site instance.
