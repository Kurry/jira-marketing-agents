# specs/v2 — Authoring Conventions & Shared Contract

Date: 2026-06-15
Status: **PROPOSAL.** This `specs/v2/` set is a rewrite that aligns the specs to
the Atlassian-native / NIH-reduction direction. It does **not** supersede the
current `specs/` until explicitly accepted by the architect + safety reviewer.
The legacy `specs/agent-team/v1/` archive is historical and is **not** rewritten.

Every v2 author MUST read this file first and conform to it. Its purpose is to
keep ten parallel rewrites internally consistent.

## 1. Decision rule (the spine of every v2 doc)

> Use Atlassian-native capabilities first. Keep custom code only when it
> expresses Twin-specific policy, agent logic, safety rules, evidence
> generation, or a documented platform gap.

Every spec must name the **Atlassian-native owner** for each platform concern it
touches, and justify any remaining custom code against the four allowed reasons
above. "We already built it" is not a reason.

## 2. The Native Tool Fit Matrix is LAW

All v2 docs must be consistent with this matrix (carried forward from
`atlassian-native-tools.md`). If a doc needs to deviate, it must say so
explicitly and route the deviation to the architect.

| Need | Use first | Keep custom only for |
| --- | --- | --- |
| Agent runtime | Forge `rovo:agent`, `action`, `function`, prompt resources | Twin-specific prompts, handlers, safety output schema |
| Agent event triggers | Jira Automation or Studio "Use Rovo agent" action | Temporary webtrigger fallback and audit harness |
| Workflow gates | Forge workflow validator/condition/post-function modules on company-managed projects | Human-gate logic Atlassian modules cannot express |
| Project/work item operations | ACLI `jira project/workitem/field/filter/dashboard` | Documented REST fallback for ACLI gaps |
| Jira admin configuration | Golden company-managed template project + documented Jira REST | Thin scripts for issue types, fields, statuses, options, checks |
| Automation import | Native Jira Automation UI/export/import or documented API | Disabled JSON rendering + validation; **no internal API as a supported path** |
| Ideas & product discovery | Jira Product Discovery (JPD) | Only growth issue types that truly need execution workflow |
| Employers/partners/segments/services | JSM Assets (if licensed) | Minimal custom fields when Assets unavailable |
| Knowledge & SOPs | Confluence pages/databases/knowledge sources | Prompt pack + claims policy files that version with code |
| Readouts & dashboards | Atlassian Analytics/Data Lake where available; Jira dashboards/filters otherwise | Agent decision-memo comments + evidence files |
| Outcome alignment | Atlassian Goals/Projects if in tenant | Jira issue links/labels until Goals adopted |
| Component catalog | Compass (if software ops grows) | Repo-local status files for MVP only |
| Source/CI | GitHub unless team moves to Bitbucket | Bitbucket Pipelines only after source migration |
| Terraform | **Official `atlassian/atlassian-operations` provider, JSM/Compass Operations resources only** | Third-party provider spike only; never the Jira control plane critical path |

## 3. The five NIH themes and how v2 resolves each

The second-pass review (`nih-review-2026-06-15.md`) collapsed ~70 findings into
five themes. Every v2 doc must reflect these resolutions:

1. **Private/internal endpoints** (`gateway/api/automation/internal-api`,
   `rest/cb-automation`) and reverse-engineered ACLI keychain auth → **removed
   from all supported paths.** Native Jira Automation import/export + documented
   `ATLASSIAN_TOKEN` env auth only. Any remaining internal usage is labeled
   experimental, non-default, and tied to a platform-blocker note.
2. **Parallel "configured Jira project" product** (fields/issue-types/filters/
   dashboards/statuses hand-built) → **a golden company-managed template project
   is the source of truth.** Provisioning scripts demote to clone-diff
   fallbacks. Segment/partner/service entities move to **JSM Assets**;
   confidence/lift/discovery fields move to **JPD**.
3. **`infra/` reconciler as a Terraform-equivalent control plane** → **reframed
   as a read-only audit harness over native output.** No per-resource converge
   engine is built before the ACLI inventory (T-NIH-03) and golden-template
   validation (T-NIH-04) complete. Mutations route through ACLI / golden
   template / Forge.
4. **Custom inference presented as native proof** (webtrigger reachability,
   "guaranteed visible" Rovo) → **webtrigger-fallback evidence and native
   Automation/Rovo audit-log proof are tracked in separate rows.** "Visibility"
   wording becomes "manifest/install check" unless a public Rovo listing API
   exists.
5. **Generic platform capabilities re-implemented in `src/`** (ADF build/
   traversal, duplicate detection, prioritization) → **delegate to libraries/
   native surfaces** (`@atlaskit/adf-utils`; JQL + native "Duplicate" issue
   links; JPD prioritization fields). Twin-specific claims/safety/experiment/
   audience/campaign logic **stays custom**.

## 4. Canonical data model — single source of truth

To prevent the count drift that exists today (issue types 13/14/18, fields
3/12/8, statuses 6/8 across current docs):

- **`specs/v2/issue-types.md`, `custom-fields.md`, and `workflows.md` are the
  ONLY place that defines canonical counts, names, and the native owner of each
  entity.** Every other v2 doc must **reference** these files (e.g. "the
  canonical issue types defined in `issue-types.md`") and must **never restate**
  specific counts or field lists. If you feel you need a number, link instead.

## 5. Safety contract (unchanged — never weaken)

- AI may classify, draft, summarize, recommend, create specs, and add clearly
  AI-labeled Jira comments.
- AI may **not** approve clinical/health claims, launch campaigns, send
  messages, alter audiences or suppression, mutate production signup flows, or
  close/approve high-risk tickets without human review.
- Healthcare claims guardrails (`policies/claims-risk-policy.md`) stay intact in
  every prompt. **PHI must never appear in agent output, logs, or evidence.**
- Automation rules are imported **disabled** and enabled only after a captured
  native audit-log run.

## 6. House style

- Terse, operator-grade prose. Match the voice of the current specs.
- Start each file with `# Title`, then `Date: 2026-06-15` and a one-line
  `Status:` (Proposal). Add a one-line "Supersedes: `specs/<file>`" pointer.
- Cross-reference with relative links (e.g. `[design](design.md)`,
  `[IaC principles](agent-team/IAC_PRINCIPLES.md)`).
- Name native owners explicitly; cite the matrix row when relevant.
- Do not invent Atlassian product capabilities — if unsure, mark as a documented
  gap or a spike, don't assert.
- Preserve every real requirement/task from the v1 doc you are rewriting; this
  is a re-alignment, not a scope cut. Where you drop or merge something, note it.

## 7. v2 ownership map (who writes what — keep scopes disjoint)

| Scope | Files (under `specs/v2/`) |
| --- | --- |
| A1 Architecture | `atlassian-native-tools.md`, `design.md` |
| A2 Requirements & outcomes | `requirements.md`, `outcome-roadmap.md` |
| A3 Data model (canonical) | `issue-types.md`, `custom-fields.md`, `workflows.md` |
| A4 Refactor tasks & spikes | `tasks.md`, `nih-roadmap.md`, `atlassian-product-adoption-spike.md`, `golden-template-validation.md` |
| B5 IaC principles & missions | `agent-team/IAC_PRINCIPLES.md`, `MISSION.md`, `REVIEW_MISSION.md` |
| B6 Declarative state & verification | `agent-team/DECLARATIVE_STATE.md`, `SCRIPTABLE_VERIFICATION.md`, `VERIFICATION_MATRIX.md`, `SCRIPTS_CONTRACT.md` |
| B7 Team org & operating loop | `agent-team/TEAM_CHARTER.md`, `OPERATING_LOOP.md`, `AGENTS.md`, `RUNBOOK.md`, `LAUNCH_PROMPT.md` |
| B8 Task board, gates, audit | `agent-team/TASK_BOARD.md`, `QUALITY_GATES.md`, `AUDIT_PLAN.md`, `README.md` |
| C9 Refactor bridge & index | `refactor-plan.md` (new), `README.md` (v2 index) |
| C10 Consistency pass (last) | `CONSISTENCY-REPORT.md` (+ minor cross-doc fixes) |
