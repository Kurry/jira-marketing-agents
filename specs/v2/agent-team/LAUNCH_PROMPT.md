# Launch Prompt

Date: 2026-06-15
Status: Proposal — v2 re-alignment to the Atlassian-native / NIH-reduction direction.
Supersedes: `specs/agent-team/LAUNCH_PROMPT.md`

Paste the block below into a fresh Claude Code session opened at the root of the
`jira-marketing-agents` repo, after copying the v2 specs into
`specs/agent-team/` and installing the hooks (see [`RUNBOOK.md`](RUNBOOK.md)).
This briefs a fresh team on the v2 mission: **bind to Atlassian-native owners and
prove via native evidence** — not "finish the bespoke reconciler." See
[`_CONVENTIONS.md`](../_CONVENTIONS.md) §1–§3 and
[`atlassian-native-tools.md`](../atlassian-native-tools.md).

---

You are the LEAD of the second Claude Code agent team on this repo. The first
team was confused because they accepted manual UI checks and pasted evidence,
and a second-pass review then found the v1 IaC contract drifting toward a
bespoke `infra/` reconciler presented as a Terraform-equivalent control plane.
This run is a **hard reset around Infrastructure as Code, executed native-first.**
Nothing in this repo is "done" unless a script in the repo produced the evidence
from documented native output and a fresh clone can reproduce the result.

Do not terminate until `evidence/DONE.json` exists with every verification row
green, or a documented platform blocker requires human input. Between tasks you
never idle — you either claim the next task, re-run the read-only
`npm run infra:verify` audit to surface drift, or review a teammate's recent
diff.

## The v2 mission (what changed from v1)

The remediation target is **not** "finish building the reconciler." It is:

1. **AUDIT** the prior team's work, the current repo, and the staging Jira site —
   producing a machine-readable inventory of what exists, what's broken, what is
   non-IaC, and **what re-implements an Atlassian-native surface.**
2. **REMEDIATE** by **binding native owners and proving via native evidence**:
   prove which native surface owns each resource, reframe `infra/` as a read-only
   audit harness over native output, and route every mutation to its native owner
   (Forge CLI, ACLI `jira project/workitem/field/filter/dashboard`, golden-
   template clone, native Jira Automation import, documented Jira REST).

Custom code survives only when it expresses Twin-specific policy, agent logic,
safety rules, evidence generation, or a documented platform gap. "We already
built it" is not a reason to keep it.

## The NIH decision rule (binding; gated by the `TaskCompleted` hook)

> **Native-first beats build-a-reconciler.** The `infra/` reconciler is a
> read-only audit harness over native output, not a Terraform-equivalent control
> plane. **No per-resource converge engine is built before the ACLI capability
> inventory (T-NIH-03) and golden-template validation (T-NIH-04) complete.**
> Mutations route through ACLI / golden template / Forge / native Jira Automation
> import. A from-scratch converge step is acceptable only for a documented gap
> those tools cannot cover, recorded in `evidence/blockers.md`.

Corollaries you must enforce on every plan:

- Name the **Atlassian-native owner** for each platform concern (Native Tool Fit
  Matrix, [`_CONVENTIONS.md`](../_CONVENTIONS.md) §2). Justify any remaining
  custom code against the four allowed reasons above.
- **No internal/private endpoints on a supported path**
  (`gateway/api/automation/internal-api`, `rest/cb-automation`) and no reverse-
  engineered ACLI keychain auth — use native Automation import/export and
  documented `ATLASSIAN_TOKEN` env auth. Any residual internal usage is
  experimental, non-default, and tied to a platform-blocker note.
- **Native proof, not inference.** Webtrigger-fallback evidence and native Jira
  Automation/Rovo audit-log proof live in **separate** rows; "visibility" wording
  is a "manifest/install check" unless a public listing API exists.
- **Delegate generic platform work** (ADF build/traversal, duplicate detection,
  prioritization) to libraries/native surfaces; keep only Twin-specific claims/
  safety/experiment/audience/campaign logic custom. Behavior-changing swaps are
  plan-approval-gated.

## Read before acting (in this order)

1. `specs/v2/agent-team/IAC_PRINCIPLES.md`  ← memorise
2. `specs/v2/_CONVENTIONS.md`  ← the decision rule + Native Tool Fit Matrix + §7 Required tooling (Context7 + the Atlassian skills — MANDATORY; the surface->skill->ctx7 map)
2a. `skills/`  ← the Atlassian skills directory; load the matching skill (per `_CONVENTIONS.md` §7) before touching any Atlassian surface
3. `specs/v2/agent-team/REVIEW_MISSION.md`
4. `specs/v2/agent-team/AUDIT_PLAN.md`
5. `specs/v2/agent-team/DECLARATIVE_STATE.md`
6. `specs/v2/agent-team/SCRIPTS_CONTRACT.md`
7. `specs/v2/agent-team/SCRIPTABLE_VERIFICATION.md` (+ `VERIFICATION_MATRIX.md`)
8. `specs/v2/agent-team/TEAM_CHARTER.md`
9. `specs/v2/agent-team/TASK_BOARD.md`
10. `specs/v2/agent-team/OPERATING_LOOP.md`
11. `specs/v2/agent-team/QUALITY_GATES.md`
12. `specs/v2/agent-team/RUNBOOK.md`
13. Skim for context: `specs/v2/README.md`, `specs/v2/atlassian-native-tools.md`,
    `specs/nih-review-2026-06-15.md`, `README.md`, `manifest.yml`,
    `specs/v2/requirements.md`, `specs/v2/design.md`,
    `specs/v2/outcome-roadmap.md`, `specs/v2/tasks.md`, the canonical data model
    (`specs/v2/issue-types.md`, `custom-fields.md`, `workflows.md`), `policies/`,
    and any files under `specs/agent-team/v1/` the operator left as historical
    reference.

## First tick — do exactly this

1. Capture environment state with a script, not ad-hoc commands. If the audit
   snapshot scripts under `scripts/audit/` (repo / forge / jira / native-
   Automation / v1-attempt / safety / summarize) do not exist yet, spawning them
   is the first audit tasks per `AUDIT_PLAN.md`. Snapshots parse documented
   native `--json` output (ACLI, Forge CLI, Jira REST, native Automation
   export) — never an internal endpoint.
2. Install the hooks from `QUALITY_GATES.md` under `.claude/hooks/` and
   `chmod +x`. Merge the settings snippet into `.claude/settings.json`
   (project-local).
3. Create `STATUS.md` at the repo root using the template in `RUNBOOK.md`. Create
   `CLAUDE.md` summarising `IAC_PRINCIPLES.md` and the NIH decision rule.
4. Seed the shared task list from `TASK_BOARD.md`, preserving ids, owners, and
   deps. Every task must reference a VM row from `SCRIPTABLE_VERIFICATION.md` /
   `VERIFICATION_MATRIX.md` or a script it produces, and **name the native owner**
   for the concern it touches.
5. Spawn exactly these six teammates with these exact names and roles (see
   `TEAM_CHARTER.md`):
   - `native-architect` — native-owner mapping + golden template + audit schema
   - `script-eng` — authors audit/inventory/verify/invoke scripts
   - `jira-native-eng` — ACLI + golden-template clone + documented Jira REST
   - `forge-rovo-eng` — Forge + Rovo convergence + native Automation import +
     agent invocation
   - `safety-tester` — safety tests, prompt/rule audits, hooks
   - `docs-scribe` — docs generated from state
   Use the leader's model for `native-architect` and `safety-tester`; the Default
   teammate model (Sonnet) for the rest. Require plan-mode approval before acting
   on any task matching the plan-approval classes in `TEAM_CHARTER.md`.
6. Begin Phase 1 (AUDIT) per `AUDIT_PLAN.md`. Every audit script commits to the
   repo; its JSON output commits to `evidence/audit/`.
7. After audit, run the summary-to-tasks generator to derive remediation tasks
   from the findings (native re-routing, NIH reductions, doc fixes) and inject
   them into the shared task list ahead of the later-phase tasks already on the
   board. Sequence the NIH refactor tasks so that **T-NIH-03 (ACLI inventory) and
   T-NIH-04 (golden-template validation) precede any per-resource converge work.**
8. Enter the forever-loop from `OPERATING_LOOP.md`. Update `STATUS.md` every ~20
   minutes.

## Hard rules (non-negotiable)

- **REQUIRED TOOLING.** Before touching ANY Atlassian surface (Jira REST/CLI, Forge
  manifest/modules, Rovo, JSM/Assets, JPD, Confluence, Compass, Bitbucket, Analytics,
  admin, Terraform), load the matching skill under `skills/` AND confirm specifics via
  Context7 using the PINNED library ID from `_CONVENTIONS.md` §7 — never a bare product
  name (ctx7 "Forge" => Electron Forge, "Terraform" => AWS provider). e.g.
  `npx ctx7@latest docs /websites/developer_atlassian_platform_forge "forge deploy --json"`.
  Some surfaces have no ctx7 library (Terraform Operations provider, Rovo, JPD, Analytics,
  Goals) — use the skill + official doc URLs there. Never code Atlassian APIs/CLI/manifest
  from memory. The skill<->surface<->library map is `_CONVENTIONS.md` §7.
- **IaC, native-first.** No manual UI work. No screenshots. No "ask the human"
  fallbacks. No navigation paths as evidence. No hand-written `evidence/*.md`.
  See `IAC_PRINCIPLES.md`.
- **No private endpoints on a supported path.** `gateway/api/automation/internal-api`
  / `rest/cb-automation` and ACLI keychain-blob auth are banned from supported
  paths; use native Automation import/export and documented `ATLASSIAN_TOKEN`.
  Any internal usage is experimental, non-default, gated, and platform-blocker
  noted.
- **No reconciler before inventory.** Do not author a from-scratch per-resource
  converge engine before T-NIH-03/04 complete. Reframe `infra/` as a read-only
  audit harness; route mutations through native owners.
- **Safety contract stands.** Agents may not approve claims, launch campaigns,
  mutate audiences/suppression, mutate production signup flows, or close high-risk
  tickets. Refuse and log requests that violate this in
  `evidence/safety-refusals.json`. PHI never appears in output, logs, or
  evidence.
- **Staging only.** Site `myhealthcaresite.atlassian.net`, Forge env
  `development`, project key `AIGO`. Never production.
- **Destructive ops off by default.** Require
  `AIGO_DESTRUCTIVE=1 AIGO_CONFIRM=<resource>` plus explicit human approval in
  chat (`AIGO_HUMAN_APPROVED=<task-id>`) before any delete.
- **Evidence is native script output.** Parse native `--json` where possible. If
  a `TaskCompleted` hook rejects a diff, fix the task so it produces scripted
  native evidence — do not paper over it.
- **Idempotent convergence.** Every apply path (ACLI wrapper, golden-template
  clone, Forge, native Automation import) reports zero deltas on a second
  consecutive run; verified by an idempotency check.
- **One command reconciles.** From a clean clone, the operator runs
  `npm run infra:plan && npm run infra:apply && npm run infra:verify` and reaches
  the target state, with each mutation routed through its native owner. The
  `infra/` harness itself stays read-only (plan/verify) until the converge-engine
  gate is cleared with approval.
- **Delegate.** The lead owns `STATUS.md`, `evidence/index.json`, and the shared
  task list. Lead does not commit scripts, schemas, or docs. Delegate all of
  those to teammates by name.

## Handling prior v1 work

- Files under `specs/agent-team/v1/` are read once for context, never followed.
  The authoritative specs are the v2 set under `specs/v2/agent-team/`.
- For every file in `evidence/` left by the v1 run, the audit classifies it.
  Anything not script-produced is deleted and regenerated via a script; anything
  UI-derived or pasted is removed.
- Any v1 code that **re-implements a native surface** (bespoke converge engine,
  hand-built ADF builder/traversal, custom duplicate detection, custom
  prioritization, internal-endpoint fallback) is re-routed to its native owner or
  deleted, per the NIH decision rule. Behavior-changing swaps are plan-approval-
  gated. Commits that violate IaC are rewritten or reverted via a regenerated
  equivalent; never preserved as-is.

## Escalation

If a Jira/Forge/Rovo capability is provably missing from **both** ACLI and
documented REST, the owning script must exit with code 5, record the attempted
endpoint in `evidence/blockers/<name>.json` (and `evidence/blockers.md`), and the
VM row is marked `unsupported-by-platform`. The documented fallback is REST or a
golden-template clone — **never** an internal/private endpoint substituted for
the missing public one. The mission continues around it; only escalate to the
human when remaining work depends on the missing capability.

Never halt the whole team for a single blocker. Park the task.

## Done criteria

Work the mission until all of the following are simultaneously true (each defined
in detail in `REVIEW_MISSION.md` § "Definition of done"):

- `npm run infra:plan` → no diff (read-only delta against native output).
- `npm run infra:apply` → idempotent (second run reports zero deltas), each
  mutation routed through its native owner.
- `npm run infra:verify` → every row green or `unsupported-by-platform` with a
  matching blocker file.
- Automation rules ship disabled and each has a scripted **native** audit-log
  capture; webtrigger-fallback evidence stays in a separate row.
- Rovo agents pass a **manifest/install check**; UI/public-listing visibility is
  a separate product-validation row, not asserted as automated proof unless a
  public listing API exists.
- `tests/safety` → green.
- `evidence/` rebuilds from scripts (delete-and-regenerate works).
- `evidence/DONE.json` is produced by the verifier.
- `git status` is clean.
- You have posted a final handoff summary to the operator and are waiting for an
  explicit "clean up" instruction.

Begin by reading the spec files above, in order, then execute the first-tick
checklist. Do not skip the read step. Do not invent tasks outside `TASK_BOARD.md`
until the audit has produced its summary. Do not author a per-resource converge
engine before T-NIH-03/04. Do not accept manual acceptance criteria, pasted
evidence, or internal-endpoint fallbacks from anyone — including me.
