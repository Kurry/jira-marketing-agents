# specs/v2 — Index

Date: 2026-06-15
Status: **Proposal.** This `specs/v2/` set is a rewrite that re-aligns the specs
to the Atlassian-native / NIH-reduction direction. It does **not** supersede the
current `specs/` until explicitly accepted by the architect + safety reviewer.
The current `specs/` (and `specs/agent-team/`) remain **authoritative** in the
meantime. The legacy `specs/agent-team/v1/` archive is **historical** and is not
rewritten.

Read [_CONVENTIONS.md](_CONVENTIONS.md) first — it is the shared contract for
this set: the decision rule (§1), the Native Tool Fit Matrix (§2), the five NIH
themes (§3), the canonical-data-model rule (§4), the safety contract (§5), house
style (§6), and the author ownership map (§7).

## Reading order

1. [_CONVENTIONS.md](_CONVENTIONS.md) — shared contract; read before any other file.
2. [atlassian-native-tools.md](atlassian-native-tools.md) — architecture / Fit Matrix.
3. [nih-roadmap.md](nih-roadmap.md) — the single ordering authority for T-NIH tasks.
4. [issue-types.md](issue-types.md) · [custom-fields.md](custom-fields.md) · [workflows.md](workflows.md) — the canonical data model.
5. [refactor-plan.md](refactor-plan.md) — the code → native mapping and sequencing.

## Root files

| File | Description |
| --- | --- |
| [_CONVENTIONS.md](_CONVENTIONS.md) | Shared authoring contract: decision rule, Native Tool Fit Matrix (LAW), five NIH themes, canonical-data-model rule, safety contract, house style, and the v2 ownership map. Read first. |
| [atlassian-native-tools.md](atlassian-native-tools.md) | Architecture: the use-native-first decision rule, the Native Tool Fit Matrix, NIH risk findings, what stays custom vs moves native, and the recommended architecture boundary. |
| [design.md](design.md) | Target control-plane design — request flow, module boundaries, and how native owners and the repo-owned layer fit together. |
| [requirements.md](requirements.md) | Functional/non-functional requirements for the v2 Growth Ops control plane, re-aligned to native owners. |
| [outcome-roadmap.md](outcome-roadmap.md) | Field / issue-type / outcome catalog and the product-adoption subtasks (T-NIH-05A..F). |
| [issue-types.md](issue-types.md) | **Canonical** issue-type definitions, counts, names, and native owner of each — the only place counts are defined. |
| [custom-fields.md](custom-fields.md) | **Canonical** custom-field definitions and native owner (Assets / JPD / Jira) of each. |
| [workflows.md](workflows.md) | **Canonical** workflow/status definitions and native owner. |
| [tasks.md](tasks.md) | Executable task list; references the T-NIH IDs in nih-roadmap.md and carries the separate-evidence-rows discipline. |
| [nih-roadmap.md](nih-roadmap.md) | Consolidated T-NIH-01..14 board: states, native owners, dependency graph, and execution waves. The single ordering authority. |
| [refactor-plan.md](refactor-plan.md) | **(this set's bridge)** Concrete code → native mapping: every `scripts/*` category, each `src/` module, the `infra/` tree, `automation/`, and `manifest.yml` mapped to KEEP / DELEGATE / RETIRE with native owner, governing T-NIH task, risk, and gate; plus the phased sequence. Proposal only — changes no code. |
| [README.md](README.md) | This index. |

> `atlassian-product-adoption-spike.md` and `golden-template-validation.md` are
> referenced by [nih-roadmap.md](nih-roadmap.md) and the ownership map
> ([_CONVENTIONS.md](_CONVENTIONS.md) §7, scope A4); they are authored under
> that scope and indexed here when present.

## `agent-team/` files

| File | Description |
| --- | --- |
| [agent-team/IAC_PRINCIPLES.md](agent-team/IAC_PRINCIPLES.md) | Infrastructure-as-Code principles re-cast for the native-first direction (the reconcile loop reframed as a read-only audit harness over native output). |
| [agent-team/MISSION.md](agent-team/MISSION.md) | Goal, safety contract (hard rules), and definition of done for the agent team. |
| [agent-team/REVIEW_MISSION.md](agent-team/REVIEW_MISSION.md) | Mission for the safety/NIH review role — what every diff, prompt, and rule is checked against. |
| [agent-team/TEAM_CHARTER.md](agent-team/TEAM_CHARTER.md) | Roles, file-ownership map, and plan-approval gates. |
| [agent-team/OPERATING_LOOP.md](agent-team/OPERATING_LOOP.md) | How each teammate claims and runs work. |
| [agent-team/AGENTS.md](agent-team/AGENTS.md) | Roster of agents/roles and their responsibilities. |
| [agent-team/RUNBOOK.md](agent-team/RUNBOOK.md) | Operating runbook for the team and the reconcile/verify flow. |
| [agent-team/TASK_BOARD.md](agent-team/TASK_BOARD.md) | Live task list and dependencies for the v2 work. |
| [agent-team/QUALITY_GATES.md](agent-team/QUALITY_GATES.md) | TaskCompleted quality gates and the banned-pattern rejects. |
| [agent-team/DECLARATIVE_STATE.md](agent-team/DECLARATIVE_STATE.md) | What the declarative state under `infra/` is (and is not) the source of truth for. |
| [agent-team/SCRIPTABLE_VERIFICATION.md](agent-team/SCRIPTABLE_VERIFICATION.md) | How each invariant is proven by a script. |
| [agent-team/VERIFICATION_MATRIX.md](agent-team/VERIFICATION_MATRIX.md) | Matrix mapping each invariant to its verifying command and evidence artifact. |
| [agent-team/SCRIPTS_CONTRACT.md](agent-team/SCRIPTS_CONTRACT.md) | The contract every supported `scripts/*` entrypoint must satisfy (interface, exit codes, T-NIH-07 label, no internal endpoints). |
| [agent-team/AUDIT_PLAN.md](agent-team/AUDIT_PLAN.md) | The read-only, native-sources-only startup audit (Phase 1) and its JSON outputs. |
| [agent-team/LAUNCH_PROMPT.md](agent-team/LAUNCH_PROMPT.md) | The paste-in launch prompt that briefs a fresh team on the v2 mission. |
| [agent-team/README.md](agent-team/README.md) | Index and reading order for the agent-team bundle. |
