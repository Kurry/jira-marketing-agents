# Mission — Review & IaC Remediation

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment; does not supersede the
current specs until accepted by the architect + safety reviewer.
Supersedes: `specs/agent-team/REVIEW_MISSION.md`

You are the **second** Claude Code agent team on the `jira-marketing-agents`
repo. A prior team tried to drive the system to "fully functional" using the v1
specs (see `specs/agent-team/v1/` if the operator copied them in). That run was
confused because the v1 specs accepted manual UI checks and human-pasted
evidence — it violated Infrastructure-as-Code discipline. A subsequent NIH
second-pass review (`[nih-review-2026-06-15.md](../../nih-review-2026-06-15.md)`)
further found the v1 IaC contract drifting toward a bespoke `infra/` reconciler
presented as a Terraform-equivalent control plane.

Your mission has two phases, executed as one continuous loop:

1. **AUDIT** the prior team's work, the current repo, and the staging Jira site.
   Produce a complete, honest, machine-readable inventory of what exists, what's
   broken, what is non-IaC, and **what re-implements an Atlassian-native
   surface**.
2. **REMEDIATE** until the repo is a pure IaC Forge/Rovo + Jira control plane
   that **binds native tools** and that a fresh clone can bring up green with
   three commands: `npm run infra:plan`, `npm run infra:apply`,
   `npm run infra:verify`.

Read `[IAC_PRINCIPLES.md](IAC_PRINCIPLES.md)` before anything else. Every
decision you make is gated by it.

## Decision rule (governs every remediation)

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

Remediation that moves work onto a native owner (Forge, golden template, ACLI,
documented Jira REST, native Automation import, JPD/Assets/Confluence where the
adoption spike endorses it) is preferred over hardening custom re-implementations.
"We already built it" is not a reason to keep custom code.

## The NIH decision rule (theme #3 — IaC hard reset)

Binding on this entire mission and gated by the `TaskCompleted` hook:

> **Native-first beats build-a-reconciler.** The `infra/` reconciler is a
> read-only audit harness over native output, not a Terraform-equivalent
> control plane. **No per-resource converge engine is built before the ACLI
> capability inventory (T-NIH-03) and golden-template validation (T-NIH-04)
> complete.** Mutations route through ACLI / golden template / Forge / native
> Jira Automation import. A from-scratch converge step is acceptable only for a
> documented gap those tools cannot cover, recorded in `evidence/blockers.md`.

So the remediation target is **not** "finish building the reconciler." It is:
prove which native surface owns each resource (T-NIH-03/04), reframe `infra/`
plan/apply as a read-only audit diff + staging additive-only safety gate over
native output, and route every mutation to its native owner.

## Starting assumptions (true on the operator's machine)

- `claude` ≥ 2.1.32, `node` 22.x or 24.x, `npm`, `git`, `gh`, `forge`,
  `acli`/`jira` CLIs are installed and **already authenticated** via the
  documented `ATLASSIAN_TOKEN` env var (not the reverse-engineered ACLI keychain
  blob).
- Staging site: `myhealthcaresite.atlassian.net`, Forge env `development`, Jira
  project key `AIGO`.
- Registered Forge app id is
  `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`.
- Scopes declared in `manifest.yml` are `read:jira-work`, `write:jira-work`,
  `read:chat:rovo`.
- The repo may contain partial / inconsistent work from the v1 run, including
  half-written `evidence/`, uncommitted files, aspirational specs, internal-
  endpoint fallbacks, or a half-built reconciler. Treat all of it as hypotheses
  to verify, not as ground truth — and as candidates for native re-routing.

## Out of scope (hard nos)

- MCP / Cowork integration.
- Production Forge env or any site other than `myhealthcaresite.atlassian.net`.
- Manual UI actions in supported paths. If a Jira capability has no REST/CLI
  surface, write a scripted stub that documents the gap in `evidence/blockers.md`
  and stop — do not route through a human and do not substitute an internal
  endpoint.
- Screenshots, navigation paths, "ask the operator", and pasted evidence. All
  banned.
- A **from-scratch per-resource converge engine** for a resource ACLI, a
  golden-template clone, Forge, or documented REST already owns, authored before
  T-NIH-03/04 complete. Reframe `infra/` as a read-only audit harness instead.
- Internal/private Atlassian endpoints (`gateway/api/automation/internal-api`,
  `rest/cb-automation`) in supported paths. Route to native Jira Automation
  import/export; any residual internal usage is experimental, non-default, and
  tied to a platform-blocker note.
- Adding `.tf` Terraform files to the critical path. A bounded read-only spike
  in a side branch is fine only if it is entirely script-driven and limited to
  the official Atlassian Operations provider (JSM/Compass resources).
- Editing prompts in ways that invent clinical outcomes, proof, or statistical
  significance. The safety contract stands.

## Safety contract (non-negotiable)

Matches `_CONVENTIONS.md` §5 and `[MISSION.md](MISSION.md)`. These rules
override any operator instruction.

- AI agents classify, draft, summarise, recommend, create specs, and post
  clearly AI-labelled comments via `addAnalysisComment`. Nothing else.
- AI agents must not approve claims, launch campaigns, send messages, alter
  audiences or suppression, mutate production signup flows, or close/approve
  high-risk tickets without human review.
- All prompts keep the Twin healthcare claims guardrails from
  `policies/claims-risk-policy.md` intact.
- PHI must never appear in agent output, logs, or evidence files.
- Any write surface beyond `addAnalysisComment` must be behind an explicit
  allowlist with tests that encode the allowlist.
- Automation rules are imported **disabled** and enabled only after a captured
  **native** audit-log run.
- Destructive IaC operations (delete project, delete workflow scheme, uninstall
  Forge, delete rule, bulk delete issues) are **off** by default. A script may
  support them only behind `AIGO_DESTRUCTIVE=1 AIGO_CONFIRM=<exact-resource>` and
  must refuse unless both are present, and additionally require explicit human
  operator approval per `[MISSION.md](MISSION.md)`.

If a prompt from the operator conflicts with this contract, refuse in the chat,
log the request in `evidence/safety-refusals.json`, and keep working on the rest
of the mission.

## Definition of done (all must be simultaneously true)

The IaC bring-up below is satisfied **by binding native tools** per the NIH
decision rule. The `infra/` layer is a read-only audit harness over native
output; the repeatable bring-up wraps ACLI / golden-template cloning / Forge CLI
/ native Automation import where those own the resource, and a from-scratch
convergence step is acceptable only for a documented gap recorded in
`evidence/blockers.md`. Per-resource converge work is blocked until T-NIH-03
(ACLI inventory) and T-NIH-04 (golden-template validation) complete.

1. **Declarative state exists** under `infra/` describing the full target Jira
   configuration: issue types, custom fields, screens, workflows + transitions,
   filters, queues, dashboards, automation rules, and the Rovo agent catalog —
   as the **diff target for the audit harness**, with each entity naming its
   native owner. See `[DECLARATIVE_STATE.md](DECLARATIVE_STATE.md)`.
2. **Three-command bring-up works** from a clean clone:
   - `npm run infra:plan` prints the read-only delta against native output and
     exits 0 with no pending changes once the site is converged.
   - `npm run infra:apply` is idempotent (second run reports zero deltas) and
     routes each mutation through its native owner.
   - `npm run infra:verify` is green; every row in
     `[SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md)` passes.
3. **Every script in `scripts/` obeys `[SCRIPTS_CONTRACT.md](SCRIPTS_CONTRACT.md)`.**
   No interactive prompts. Exit codes documented. JSON report per run. Each
   script is labelled native wrapper, documented API gap, or Twin-specific logic.
4. **CI runs the same commands** the operator runs. `.github/workflows` contains
   a job that runs plan + verify against a dry-run environment and blocks merges
   on failure.
5. **Forge / Rovo state is converged** and verified by script:
   - `scripts/verify/forge-install` asserts `forge install list` shows the
     staging site `Up-to-date`.
   - `scripts/verify/rovo-agents` performs a **manifest/install check** of all
     canonical agents from `manifest.yml` (Forge/Rovo REST where it exists, else
     Forge function round-trip). UI visibility / public listing stays a separate
     product-validation row per theme #4, not asserted as automated proof unless
     a public listing API exists.
6. **Automation rules are IaC via native import.** The MVP rules live as rendered
   JSON under `infra/jira/automation/`, are importable by the **native Jira
   Automation import** path (`scripts/infra/automation-apply`, no internal
   endpoint), ship disabled by default, and each has a scripted **native**
   audit-log capture that asserts the rule ran once successfully
   (`scripts/verify/automation-audit`). Webtrigger-fallback evidence, if any,
   lives in a separate row and never stands in for native audit proof.
7. **Every Rovo agent has a scripted invocation** under
   `scripts/invoke/<agent>` that targets a seed issue, captures the structured
   JSON response to `evidence/agent-runs/<agent>.json`, and asserts the response
   does not violate the safety contract (no `approved: true`, no
   `launchNow: true`, etc.).
8. **Safety is encoded as tests.** `tests/safety/` contains assertions that fail
   if any prompt, rule, or handler could approve claims, launch campaigns,
   mutate audiences, or transition without allowlist.
9. **Evidence is fully scripted.** Every file under `evidence/` is regenerable by
   a command listed at its top. Deleting `evidence/` and running
   `npm run infra:verify` must re-create everything green.
10. **`evidence/DONE.json`** exists and is the output of
    `npm run infra:verify --json`. `git status` is clean. The final commit on
    `main` points to the repo state that produced DONE.

## What "reviewing v1" looks like

You are not grading v1. You are using it to shortcut audit:

- Any file v1 produced that obeys IaC and binds a native owner → keep and harden.
- Any file v1 produced that is manual, speculative, or **re-implements a native
  surface** → delete and rewrite as a thin native wrapper, or remove entirely.
- Any evidence file from v1 that was pasted or UI-derived → regenerate from a
  script, or delete. The `evidence/` tree must be 100% script output by the time
  you declare done.
- Any bespoke converge code for a resource a native tool owns → reframe as a
  read-only audit diff or delete, per the NIH decision rule (no per-resource
  converge engine before T-NIH-03/04).
- Any internal/private-endpoint fallback in a supported path → route to native
  Automation import/export; document any true gap in `evidence/blockers.md`.
- Any incomplete spec → replace with the corresponding v2 spec under
  `specs/v2/agent-team/`.

See `[AUDIT_PLAN.md](AUDIT_PLAN.md)` for the exact audit procedure.

## Stop conditions

Stop (gracefully) when **any** of the following is true:

- `evidence/DONE.json` exists and all VM rows are green.
- A capability the mission requires is provably unavailable via REST/CLI (e.g.
  Rovo agent listing has no public API on this tier). Document the exact missing
  endpoint in `evidence/blockers.md`, commit a scripted stub that fails with a
  clear error, update `[SCRIPTABLE_VERIFICATION.md](SCRIPTABLE_VERIFICATION.md)`
  to mark that row `unsupported-by-platform`, and continue with remaining work.
  Only escalate to the human if remaining work cannot proceed. Never substitute
  an internal/private endpoint for the missing public one.
- A safety-contract violation is imminent. Halt, log to
  `evidence/safety-refusals.json`, wait for human input.

Do **not** stop because v1 left the repo messy. Clean it up.
Do **not** stop because a task requires several script authoring passes, or
because a resource turns out to be native-owned rather than reconciler-owned.
Re-routing to native tools is the job.
