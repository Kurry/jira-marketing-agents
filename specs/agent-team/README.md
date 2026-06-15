# AIGO Agent-Team Specs — v2 (Review + IaC Remediation)

> **NIH note (read alongside this bundle).** Per
> `specs/atlassian-native-tools.md` finding #4 and its "IaC hard reset"
> reduction, treat this entire v2 bundle — especially the bespoke `infra/`
> reconciler and the `infra:plan`/`apply`/`verify` three-command contract —
> as an **audit proposal**, not the repo's authoritative architecture. The
> native owners of the control plane are Forge CLI + `manifest.yml`, ACLI,
> documented Jira REST, a golden company-managed template project, and (for
> JSM/Compass only) the official Atlassian Operations Terraform provider.
> Do not build a full from-scratch convergence engine until each native
> surface has been evaluated and the gap documented (T-NIH-03..07 in
> `specs/tasks.md` / `specs/outcome-roadmap.md`). Frame the reconciler as an
> **audit harness over native command output**, not a replacement for those
> tools.

The first run (specs in `v1/`) confused the agent team because several
tasks implied manual UI work, human pasted screenshots, and "ask the
operator" fallbacks. This v2 bundle is a hard reset around a single
principle:

> **Everything is Infrastructure as Code. Every change, every check, and
> every piece of evidence is produced by a script that is checked into the
> repo and can be re-run from a clean clone to the same green state.**

Read in this order:

1. `IAC_PRINCIPLES.md` — the one page everyone must internalise. Defines
   what "scriptable" means for this repo and what is banned.
2. `REVIEW_MISSION.md` — the new mission: audit what v1 produced, rip out
   anything that violates IaC, and drive the repo to a reproducible,
   scripted, green state.
3. `AUDIT_PLAN.md` — the first-pass audit the team runs against the repo
   and staging Jira, with explicit outputs.
4. `DECLARATIVE_STATE.md` — the declarative schema under
   `infra/` that replaces UI-captured artefacts (issue types, fields,
   workflows, screens, filters, dashboards, automation rules, rovo
   agents).
5. `SCRIPTS_CONTRACT.md` — the contract every script under `scripts/`
   must follow (idempotent, `--plan`/`--apply`/`--verify`, exit codes,
   JSON output, no prompts).
6. `SCRIPTABLE_VERIFICATION.md` — replaces v1's `VERIFICATION_MATRIX.md`.
   Every row is a command, a JSON artefact, and a success predicate.
   No "ask the human", no screenshots, no navigation paths.
7. `TEAM_CHARTER.md` — team composition for the remediation run.
8. `TASK_BOARD.md` — audit → remediate → verify → harden → prove tasks.
9. `OPERATING_LOOP.md` — forever-loop rules, updated for IaC convergence.
10. `QUALITY_GATES.md` — hooks updated to reject non-scriptable evidence.
11. `RUNBOOK.md` — operator view.
12. `LAUNCH_PROMPT.md` — the new paste-in prompt.

Everything under `v1/` is retained for reference only. The new team
should read `v1/` files **once** during the audit to understand what
prior agents attempted, then rely exclusively on the v2 bundle going
forward.
