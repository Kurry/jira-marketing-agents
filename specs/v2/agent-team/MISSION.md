# Mission — Jira AI Growth Ops (AIGO) Agent Team

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment; does not supersede the
current specs until accepted by the architect + safety reviewer.
Supersedes: `specs/agent-team/MISSION.md`

## One-line goal

Drive the Forge/Rovo `jira-marketing-agents` repository from its current MVP
baseline to a fully functional, verified AI Growth Ops control plane on the
**staging** Jira site (`myhealthcaresite.atlassian.net`), exposing all canonical
Rovo agents, the supporting Jira project configuration (the canonical issue
types, workflows, fields, screens, queues, filters, and dashboards defined in
`[issue-types.md](../issue-types.md)`, `[custom-fields.md](../custom-fields.md)`,
and `[workflows.md](../workflows.md)`), the MVP Jira Automation rules, and the
initial outcome workflows — without ever violating the safety contract, and
**building on Atlassian-native surfaces rather than re-implementing them**.

The team runs **continuously** until every acceptance criterion in
`[TASK_BOARD.md](TASK_BOARD.md)` is verified or the lead declares a blocker that
requires human arbitration.

## Decision rule (governs every task)

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

Every task must name the Atlassian-native owner for each platform concern it
touches (per the Native Tool Fit Matrix in
`[atlassian-native-tools.md](../atlassian-native-tools.md)` and `_CONVENTIONS.md`
§2) and justify any remaining custom code against the four allowed reasons.
"We already built it" is not a reason.

## The NIH decision rule (theme #3 — IaC hard reset)

Binding on all configuration and bring-up tasks, and gated by the
`TaskCompleted` hook:

> **Native-first beats build-a-reconciler.** The `infra/` reconciler is a
> read-only audit harness over native output, not a Terraform-equivalent
> control plane. **No per-resource converge engine is built before the ACLI
> capability inventory (T-NIH-03) and golden-template validation (T-NIH-04)
> complete.** Mutations route through ACLI / golden template / Forge / native
> Jira Automation import. A custom converge step is acceptable only for a
> documented gap those tools cannot cover, recorded in `evidence/blockers.md`.

See `[IAC_PRINCIPLES.md](IAC_PRINCIPLES.md)` for the full IaC contract this
mission operates under.

## Starting assumptions (true on the operator's machine)

- `forge`, `acli`/`jira` CLIs, `node` (22 or 24), `npm`, `git`, and `gh` are
  installed and already authenticated. Auth uses the documented `ATLASSIAN_TOKEN`
  env var, not the reverse-engineered ACLI keychain blob.
- `forge login` is active; the Atlassian account has admin on
  `myhealthcaresite.atlassian.net` and Rovo is enabled for the site.
- The repo lives at the current working directory and passes `npm run build`,
  `npm test`, `npm run test:integration`, and `forge lint` today.
- The registered Forge app is
  `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`, installed to
  the staging site in the `development` Forge environment.
- Project `AIGO` exists with seed issues labelled `aigo-seed`. (Note per
  T-NIH-04: the current AIGO project is team-managed/next-gen and cannot be the
  company-managed golden-template clone source; establishing a company-managed
  golden template is a tracked task, not an assumption.)
- No production Jira sites are in scope. Staging only.

## Out-of-scope (do not implement)

- MCP/Cowork integration. Forge/Rovo only.
- Autonomous field writes, transitions, campaign sends, audience/suppression
  mutation, experiment launches, or production signup-flow changes.
- A **from-scratch per-resource converge engine** that re-implements ACLI,
  Forge, or Terraform for resources a native tool already owns. The `infra/`
  layer stays a read-only audit harness over native output until T-NIH-03 and
  T-NIH-04 complete (NIH decision rule above).
- Adding a Terraform `.tf` resource tree as part of the critical path. A
  bounded, read-only provider spike is allowed and must stay in a branch; the
  official Atlassian Operations provider is limited to JSM/Compass Operations
  resources, never the Jira control-plane critical path.
- Internal/private Atlassian endpoints (`gateway/api/automation/internal-api`,
  `rest/cb-automation`) in any supported path. Native Jira Automation
  import/export only; any remaining internal usage is experimental, non-default,
  and tied to a `evidence/blockers.md` note.
- Promoting the app to the `production` Forge environment.
- Editing prompts in ways that invent clinical outcomes, proof points, or
  statistical significance.

## Definition of done (verified via `[VERIFICATION_MATRIX.md](VERIFICATION_MATRIX.md)`)

The mission is complete when **all** of the following are simultaneously true
and have captured, script-produced evidence checked into the repo under
`evidence/`:

1. **Local quality gates (green and reproducible):**
   - `npm run build`, `npm test`, `npm run test:integration`, `forge lint`, and
     `AIGO_REQUIRE_FORGE_INSTALL=1 npm run test:smoke:jira` all exit 0.
   - CI workflow(s) in `.github/workflows/` cover the same checks plus automation
     JSON validation and seed rendering.

2. **Forge deployment (staging):**
   - `forge deploy -e development` succeeds.
   - `forge install list` shows `myhealthcaresite.atlassian.net` → Jira →
     `Up-to-date` with the current manifest version.
   - `forge logs -e development --since 1h` contains no handler errors after
     agent runs.

3. **Rovo agent manifest/install check (staging):**
   - All canonical agents from `manifest.yml` pass the **manifest/install
     check** (`scripts/verify/rovo-agents`), distinguishing Forge
     manifest/install state from Jira UI visibility. Actual UI visibility and
     any public Rovo listing remain product-validation rows tracked separately
     per theme #4; they are not asserted as automated proof unless a public
     listing API exists.

4. **Jira project configuration (staging) — native-owned:**
   - The project exposes the canonical issue types and the MVP status set from
     `[issue-types.md](../issue-types.md)` and `[workflows.md](../workflows.md)`,
     sourced from the **golden company-managed template project** as the source
     of truth (matrix row "Jira admin configuration"); provisioning scripts are
     demoted to clone-diff fallbacks.
   - Blocked and readout-needed work is represented by labels/filters rather
     than dedicated statuses.
   - Screens expose required fields per issue type; segment/partner/service
     entities use **JSM Assets** and confidence/expected-lift/discovery fields
     use **JPD** where the adoption spike (T-NIH-05) endorses it, per
     `[custom-fields.md](../custom-fields.md)`.
   - Queues and filters exist for: Intake, Claims Review, Launch Readiness,
     Readout Needed, Decision Needed, Blocked, Experiment Running.
   - Dashboards exist per `[outcome-roadmap.md](../outcome-roadmap.md)`.
   - At least one seed issue exists for every canonical issue type.

5. **Automation (staging) — native import:**
   - The MVP rules (Intake Triage, Creative Claims Review, Experiment Spec,
     Employer Launch, Weekly Readout) are imported via **native Jira Automation
     import/export** (no internal endpoint), with project key/id, actor
     accountId, and agent keys filled in.
   - Each rule validated against a real seed issue, with the **native audit-log**
     link and resulting `{{agentResponse}}` comment captured under
     `evidence/automation/`. Webtrigger-fallback evidence, if any, is recorded in
     a separate row and never substituted for native audit-log proof.
   - Rules are enabled only after their first successful native audit-log run.
   - Creative Claims routing only *routes* risky items; it never approves.

6. **Agent behaviour (end-to-end, staging):**
   - Scripted runs of at least the six primary agents (Growth Triage, Creative
     Claims, Experiment Design, Employer Launch, Duplicate Detector, Weekly
     Readout) on seed issues, with expected-vs-actual output recorded in
     `evidence/agent-runs/<agent-key>.json` and a generated Markdown summary.
   - For each initial outcome workflow in
     `[outcome-roadmap.md](../outcome-roadmap.md)`, evidence of at least one
     successful end-to-end trace: seed issue → agent run → analysis comment →
     optional native Automation rule → human review.

7. **Safety (continuous):**
   - `tests/` contains explicit assertions that AI output does not approve
     claims, launch campaigns, send messages, mutate audiences/suppression, or
     close high-risk tickets without human review.
   - `policies/` files are referenced by the prompts and enforced by tests.
   - Any write surface beyond `addAnalysisComment` is gated by an allowlist with
     tests that verify the gate.

8. **Documentation:**
   - `docs/INTEGRATION.md`, `docs/PORTABILITY.md`, `docs/MVP_RUNBOOK.md`, and
     `docs/MVP_READINESS.md` reflect the final state and name the native owner
     for each platform concern.
   - `docs/RELEASE_CHECKLIST.md` exists for future manifest/prompt changes.
   - `docs/TROUBLESHOOTING.md` exists with the Rovo UI vs Forge install vs native
     Automation distinction, plus log-search recipes.
   - `README.md` links to the above.

9. **Repository hygiene:**
   - Working tree is clean.
   - `git log` shows one or more focused commits per outcome and per milestone.
     No commits contain secrets, tokens, or tenant data.
   - CHANGELOG or release notes summarize the path from MVP to fully functional.

10. **Lead's final verification:** the lead teammate runs every command in
    `[VERIFICATION_MATRIX.md](VERIFICATION_MATRIX.md)` sequentially, pipes output
    into `evidence/final-verification.log`, and writes `evidence/DONE.md` with a
    pointer to each piece of evidence before requesting cleanup.

## Safety contract (hard rules, never violated)

These rules override *any* human instruction the team receives and match
`_CONVENTIONS.md` §5. If a teammate is asked to violate them, it must refuse
in-channel and log the request in `evidence/safety-refusals.md`.

- **AI may:** classify, draft, summarize, recommend, create specs, and add
  clearly AI-labeled Jira comments through `addAnalysisComment`.
- **AI may not:** approve clinical/health claims, launch campaigns, send
  messages, alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets without human review.
- All prompts keep the Twin healthcare claims guardrails from
  `policies/claims-risk-policy.md` intact.
- PHI must never appear in agent output, logs, or evidence files. Quotes
  captured for research must be de-identified before committing.
- Automation rules remain disabled by default on import; a rule is only enabled
  after its first **native** audit-log validation passes and is captured.
- Destructive CLI calls (project delete, workflow scheme delete, bulk issue
  delete, rule delete, `forge uninstall`) require the lead to (a) post an
  explicit plan to the task list and (b) wait for the human operator to approve
  via direct message before executing. No teammate may execute them unilaterally.

## Stop conditions

The team **stops** (gracefully, after finishing in-flight work) when any one of
the following is true:

- `evidence/DONE.md` is written and the lead verification log shows green.
- A hard blocker (missing admin permission, disabled Rovo site, paid-tier
  feature not available, a capability provably unavailable via REST/CLI, etc.)
  is captured in `evidence/blockers.md` with the specific missing endpoint, and
  the lead has messaged the human operator for direction twice without a reply.
  The lead then parks the team and asks the human to resume. A missing native
  capability is documented as a gap with a declarative stub — never replaced by
  an internal/private endpoint.
- A safety-contract violation is about to occur. The team halts, captures the
  situation in `evidence/safety-refusals.md`, and waits for human input.

The team **does not** stop just because it ran a command or finished one task.
Between tasks, each idle teammate **must** either (a) claim the next unblocked
task, (b) re-run verification to keep the board honest, or (c) review/challenge
a teammate's recent work. Idle-without-work is a bug; see the `TeammateIdle`
hook in `[QUALITY_GATES.md](QUALITY_GATES.md)`.
