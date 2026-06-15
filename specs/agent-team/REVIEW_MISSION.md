# Mission — Review & IaC Remediation

You are the **second** Claude Code agent team on the `jira-marketing-agents`
repo. A prior team tried to drive the system to "fully functional" using
the v1 specs (see `specs/agent-team/v1/` if the operator copied them in).
That run was confused because the v1 specs accepted manual UI checks and
human pasted evidence — it violated Infrastructure-as-Code discipline.

Your mission has two phases, executed as one continuous loop:

1. **AUDIT** the prior team's work, the current repo, and the staging
   Jira site. Produce a complete, honest, machine-readable inventory of
   what exists, what's broken, and what is non-IaC.
2. **REMEDIATE** until the repo is a pure IaC Forge/Rovo + Jira control
   plane that a fresh clone can bring up green with three commands:
   `npm run infra:plan`, `npm run infra:apply`, `npm run infra:verify`.

Read `IAC_PRINCIPLES.md` before anything else. Every decision you make
is gated by it.

## Starting assumptions (true on the operator's machine)

- `claude` ≥ 2.1.32, `node` 22.x or 24.x, `npm`, `git`, `gh`, `forge`,
  `acli`/`jira` CLIs are installed and **already authenticated**.
- Staging site: `myhealthcaresite.atlassian.net`, Forge env
  `development`, Jira project key `AIGO`.
- Registered Forge app id is
  `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`.
- Scopes declared in `manifest.yml` are
  `read:jira-work`, `write:jira-work`, `read:chat:rovo`.
- The repo may contain partial / inconsistent work from the v1 run,
  including half-written `evidence/`, uncommitted files, aspirational
  specs, or missing scripts. Treat all of it as hypotheses to verify,
  not as ground truth.

## Out of scope (hard nos)

- MCP / Cowork integration.
- Production Forge env or any site other than
  `myhealthcaresite.atlassian.net`.
- Manual UI actions. If a Jira capability has no REST/CLI surface, write
  a scripted stub that documents the gap and stop — do not route through
  a human.
- Screenshots, navigation paths, "ask the operator", and pasted
  evidence. All banned.
- Adding `.tf` Terraform files to the critical path. A bounded
  read-only spike in a side branch is fine only if it is entirely
  driven by scripts.
- Editing prompts in ways that invent clinical outcomes, proof, or
  statistical significance. The safety contract stands.

## Safety contract (non-negotiable)

- AI agents classify, draft, summarise, recommend, create specs, and
  post clearly AI-labelled comments via `addAnalysisComment`. Nothing
  else.
- AI agents must not approve claims, launch campaigns, send messages,
  alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets.
- Any write surface beyond `addAnalysisComment` must be behind an
  explicit allowlist with tests that encode the allowlist.
- Destructive IaC operations (delete project, delete workflow scheme,
  uninstall Forge, delete rule, bulk delete issues) are **off** by
  default. A script may support them only behind
  `AIGO_DESTRUCTIVE=1 AIGO_CONFIRM=<exact-resource>` and must refuse
  unless both are present.

If a prompt from the operator conflicts with this contract, refuse in
the chat, log the request in `evidence/safety-refusals.json`, and keep
working on the rest of the mission.

## Definition of done (all must be simultaneously true)

> **NIH note (audit proposal).** Per `specs/atlassian-native-tools.md`
> finding #4, this definition of done describes a bespoke `infra/`
> reconciler. Treat it as a **proposal pending the native-surface
> evaluation** (T-NIH-03 ACLI inventory and T-NIH-04 golden-template clone).
> Terraform is out of scope for the current MVP/NIH completion path. The repeatable bring-up should be satisfiable
> by wrapping ACLI / golden-template cloning / Forge CLI where those cover
> the resource — the from-scratch convergence engine is acceptable only for
> documented gaps those native tools cannot fill.

1. **Declarative state exists** under `infra/` describing the full
   target Jira configuration: issue types, custom fields, screens,
   workflows + transitions, filters, queues, dashboards, automation
   rules, and the Rovo agent catalog. See `DECLARATIVE_STATE.md`.
2. **Three-command bring-up works** from a clean clone:
   - `npm run infra:plan` prints the delta and exits 0 with no pending
     changes once the site is converged.
   - `npm run infra:apply` is idempotent; second run reports zero
     deltas.
   - `npm run infra:verify` is green; every row in
     `SCRIPTABLE_VERIFICATION.md` passes.
3. **Every script in `scripts/` obeys `SCRIPTS_CONTRACT.md`.** No
   interactive prompts. Exit codes documented. JSON report per run.
4. **CI runs the same commands** the operator runs. `.github/workflows`
   contains a job that runs plan + verify against a dry-run environment
   and blocks merges on failure.
5. **Forge / Rovo state is converged** and verified by script:
   - `scripts/verify/forge-install.ts` asserts
     `forge install list` shows the staging site `Up-to-date`.
   - `scripts/verify/rovo-agents.ts` asserts all 19 agents from
     `manifest.yml` are discoverable via Forge/Rovo REST (or, where no
     REST exists, via Forge function trigger round-trip).
6. **Automation rules are IaC.** The five MVP rules live as rendered
   JSON under `infra/jira/automation/`, are importable by script
   (`scripts/infra/automation-apply.ts`), ship disabled by default, and
   each has a scripted audit-log capture that asserts the rule ran once
   successfully (`scripts/verify/automation-audit.ts`).
7. **Every Rovo agent has a scripted invocation** under
   `scripts/invoke/<agent>.ts` that:
   - Targets a seed issue for that agent.
   - Captures the structured JSON response to
     `evidence/agent-runs/<agent>.json`.
   - Asserts the response does not violate the safety contract (no
     `approved: true`, no `launchNow: true`, etc.).
8. **Safety is encoded as tests.** `tests/safety/` contains assertions
   that fail if any prompt, rule, or handler could approve claims,
   launch campaigns, mutate audiences, or transition without allowlist.
9. **Evidence is fully scripted.** Every file under `evidence/` is
   regenerable by a command listed at its top. Deleting
   `evidence/` and running `npm run infra:verify` must re-create
   everything green.
10. **`evidence/DONE.json`** exists and is the output of
    `npm run infra:verify --json`. `git status` is clean. The final
    commit on `main` points to the repo state that produced DONE.

## What "reviewing v1" looks like

You are not grading v1. You are using it to shortcut audit:

- Any file v1 produced that obeys IaC → keep and harden.
- Any file v1 produced that is manual or speculative → delete and
  rewrite as a script, or remove entirely.
- Any evidence file from v1 that was pasted or UI-derived → regenerate
  from a script, or delete. The `evidence/` tree must be 100% script
  output by the time you declare done.
- Any incomplete spec → replace with the corresponding v2 spec under
  `specs/agent-team/`.

See `AUDIT_PLAN.md` for the exact audit procedure.

## Stop conditions

Stop (gracefully) when **any** of the following is true:

- `evidence/DONE.json` exists and all VM rows are green.
- A capability the mission requires is provably unavailable via
  REST/CLI (e.g. Rovo agent listing has no public API on this tier).
  Document the exact endpoint, commit a scripted stub that fails with
  a clear error, update `SCRIPTABLE_VERIFICATION.md` to mark that row
  `unsupported-by-platform`, and continue with remaining work. Only
  escalate to the human if remaining work cannot proceed.
- A safety-contract violation is imminent. Halt, log to
  `evidence/safety-refusals.json`, wait for human input.

Do **not** stop because v1 left the repo messy. Clean it up.
Do **not** stop because a task requires several script authoring
passes. That is the job.
