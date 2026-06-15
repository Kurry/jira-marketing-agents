# Scriptable Verification — Audit Harness Over Native Output

Date: 2026-06-15
Status: Proposal. Part of the `specs/v2/` re-alignment to the Atlassian-native /
NIH-reduction direction; not authoritative until the architect + safety reviewer
accept it.
Supersedes: `specs/agent-team/SCRIPTABLE_VERIFICATION.md`

## Framing

Every verifier is an **audit harness over native output**: it reads what the
Atlassian-native owner reports and asserts/diffs against the read-only
declarative snapshot in [DECLARATIVE_STATE.md](DECLARATIVE_STATE.md). No verifier
presupposes a bespoke `infra:apply` converge engine — there is none (theme #3).
Shape rows (issue types, fields, workflow, filters, dashboards) run equally well
against a golden-template clone or ACLI/REST output; they stay agnostic about
what produced the state.

### Allowed sources only (theme #1)

Verifiers read **only** these native sources:

- `forge install list` / `forge install list --json`, `forge logs --json`,
  `forge lint --json`.
- ACLI list commands (`jira project`, `jira workitem`, `jira field`,
  `jira filter`, `jira dashboard`) with `--json`/`--csv`.
- Documented Jira Cloud REST **GET** endpoints (`/rest/api/3/...`).
- The **native Jira Automation audit log** for the "Use Rovo agent" action.

Verifiers must **never** read private/internal endpoints —
`gateway/api/automation/internal-api`, `rest/cb-automation`, or any
reverse-engineered surface. A verifier that can only be satisfied via such an
endpoint instead exits 5 (platform-missing) and writes a blocker file.

### Evidence rules (unchanged — never weaken)

Every verification is a command that writes a machine-readable **JSON** report
and exits 0 on green, 2 on red (assertion failure), 5 if the platform exposes no
supported surface. No manual steps, no screenshots, no navigation paths, no
"ask the operator". Markdown summaries are generated from JSON by
`scripts/lib/report.mjs`, never hand-written (see
[SCRIPTS_CONTRACT.md](SCRIPTS_CONTRACT.md)).

The umbrella command:

```bash
npm run infra:verify
```

runs every row below in series, aggregates the JSON reports, and exits 0 only if
every row is green (or `unsupported-by-platform` with a matching blocker file).

Canonical entity counts/names are referenced from
[`issue-types.md`](../issue-types.md), [`custom-fields.md`](../custom-fields.md),
and [`workflows.md`](../workflows.md); rows below never restate them.

## VM-LOCAL — Local gates

- Command: `npm run build && npm test && npm run test:integration && npm run forge:lint`
- Evidence: `evidence/verify/local.json`
- Green: exit 0 on all four. The only acceptable `forge lint` warning is the
  intentional standalone `addAnalysisComment` action; the verifier parses
  `forge lint --json` and asserts the warning count equals 1 and matches that
  rule.

## VM-FORGE-INSTALL — App installed on staging

- Command: `node scripts/verify/forge-install.mjs --instance staging --json`
- Source: `forge install list --json`.
- Green: the `myhealthcaresite.atlassian.net` Jira entry is `Up-to-date` and the
  deployed manifest version matches `manifest.yml`.

## VM-FORGE-LOGS — No handler errors in the last deploy window

- Command: `node scripts/verify/forge-logs.mjs --since 2h --json`
- Source: `forge logs -e development --since 2h --json`, filtered for
  `level: ERROR` and known handler-exception traces.
- Green: zero errors, or all errors matched against `infra/allowlists/forge-log-errors.yaml`
  (each entry dated and justified).

## VM-ROVO-MANIFEST-INSTALL — Manifest/install check (NOT visibility)

> Renamed from the prior "Rovo visibility / catalog" row (theme #4, T-NIH-01).
> There is **no public Rovo agent listing API**, so this row proves only that
> every declared agent is in `manifest.yml` and the app is installed — a
> **manifest/install check**, never a guarantee of Jira UI visibility.

- Command: `node scripts/verify/rovo-manifest-install.mjs --json`
- Source: `manifest.yml` `rovo:agent` entries + `forge install list --json`.
- Green: every `rovo:agent.key` in `manifest.yml` is present, the app is
  installed and `Up-to-date`, and each agent's prompt resource resolves. The
  JSON report states `claim: "manifest/install verified; UI confirmation pending"`.
- If asked to confirm UI visibility and no public listing API exists: exit 5 and
  write `evidence/blockers/rovo-ui-visibility.json`. UI confirmation is a manual,
  product-gated step tracked in the runbook, never asserted as green here.

## VM-ROVO-FUNCTION-ROUNDTRIP — Action handler reachable (separate from native proof)

> This proves the Forge **action handler** works via a function round-trip. It
> does **not** prove a native Jira Automation rule invoked Rovo, and it does
> **not** prove UI visibility. Kept in its own row so it is never relabeled as
> native Automation/Rovo proof (theme #4).

- Command: `node scripts/verify/rovo-function-roundtrip.mjs --json`
- What it does: for each `rovo:agent` action, invoke a trivial
  `getIssueContext` round-trip via the documented Forge function surface against
  a known seed issue; record success per agent.
- Green: every agent returned a structured response within the timeout.
- Platform-missing (exit 5): if Rovo invocation REST is unavailable to the
  authenticated account, record the endpoint tried and write
  `evidence/blockers/rovo-function-roundtrip.json`; the row is marked
  `unsupported-by-platform` and the aggregate still passes.

## VM-JIRA-PROJECT — Project shape matches snapshot

- Command: `node scripts/verify/jira-project.mjs --json`
- Source: documented Jira REST GET project metadata; diff against the read-only
  snapshot derived from native output.
- Green: zero diff.

## VM-JIRA-ISSUE-TYPES — Canonical types present

- Command: `node scripts/verify/jira-issue-types.mjs --json`
- Source: ACLI `jira` issue-type listing (REST GET fallback). Diff the live types
  against the canonical catalog in [`issue-types.md`](../issue-types.md).
- Green: every canonical type exists with the declared name; aliases resolved.

## VM-JIRA-FIELDS — Custom fields and screens

- Command: `node scripts/verify/jira-fields.mjs --json`
- Source: ACLI `jira field` listing + documented REST screen GETs.
- Green: every field in [`custom-fields.md`](../custom-fields.md) exists with the
  declared schema and is on at least one screen for every issue type it applies
  to. Fields the catalog marks as JSM Assets or JPD-owned are asserted against
  their native owner, not re-created as custom fields (theme #2).

## VM-JIRA-WORKFLOW — Workflow and transitions

- Command: `node scripts/verify/jira-workflow.mjs --json`
- Source: documented Jira REST workflow GETs (or the golden-template clone's
  observed shape).
- Green: every status and transition in [`workflows.md`](../workflows.md) exists,
  wired to the expected from/to statuses, with matching validators/conditions.

## VM-JIRA-FILTERS — Filters exist

- Command: `node scripts/verify/jira-filters.mjs --json`
- Source: ACLI `jira filter` listing.
- Green: each filter in the snapshot exists with the declared JQL and sharing.

## VM-JIRA-DASHBOARDS — Dashboards + gadgets

- Command: `node scripts/verify/jira-dashboards.mjs --json`
- Source: ACLI `jira dashboard` listing + documented REST gadget GETs.
- Green: each declared dashboard exists with the declared gadget set (gadget type
  + resolvable filter id).

## VM-JIRA-SEEDS — Seed coverage

- Command: `node scripts/verify/jira-seeds.mjs --json`
- Source: ACLI `jira workitem search --jql` for label `aigo-seed`.
- Green: at least one issue of every canonical type (`issue-types.md`) exists in
  AIGO with the seed label.

## VM-AUTOMATION-RENDER — Rendered rules have no placeholders

- Command: `node scripts/verify/automation-render.mjs --json`
- Green: render each rule from `infra/jira/automation/*.yaml`; assert no remaining
  `${...}` tokens; every `agentKey` resolves to `manifest.yml`. (Local check; no
  network.)

## VM-AUTOMATION-IMPORT — Live rules match rendered

- Command: `node scripts/verify/automation-import.mjs --json`
- Source: native Jira Automation export/list of the project's rules.
- Green: each declared rule exists with a body matching the rendered JSON (modulo
  ids/timestamps). Rules not yet audited are `enabled=false`. If no public
  export/list surface exists, exit 5 and write a blocker (never read
  `cb-automation`/internal endpoints).

## VM-AUTOMATION-AUDIT — Native audit-log proof (separate row from webtrigger)

> This is the **only** row that proves a native Jira Automation rule fired and
> invoked Rovo. It reads the **native Jira Automation audit log** — never a
> webtrigger probe. Webtrigger-fallback evidence lives in
> VM-WEBTRIGGER-FALLBACK below and is never substituted here (theme #4).

- Command: `node scripts/verify/automation-audit.mjs --json`
- What it does: for each rule, trigger a known seed-issue transition (or post a
  synthetic comment) that fires the rule, then poll the **native audit log** for
  a successful entry within a timeout.
- Source: native Jira Automation audit-log GET only.
- Green: every rule has at least one entry with `status: SUCCESS`, captured under
  `evidence/automation/<rule>.json`.
- Safety: the Creative Claims audit assertion includes a regex check that the
  posted comment does not contain `approved:` or `approve claims`.
- Platform-missing (exit 5): if no documented audit-log read surface is available
  to the account, write `evidence/blockers/automation-audit.json`.

## VM-WEBTRIGGER-FALLBACK — Operator-fallback reachability (NOT native proof)

> Tracked in a **separate row** from VM-AUTOMATION-AUDIT (theme #4, finding #6).
> A reachable webtrigger is a controlled operator fallback for invoking a Rovo
> action; it is **not** proof that native Jira Automation invoked Rovo. The
> evidence record keeps these distinct: "webtrigger fallback complete" vs
> "native Automation/Rovo audit proof pending".

- Command: `node scripts/verify/webtrigger-fallback.mjs --json`
- What it does: probe the controlled fallback webtrigger and record reachability.
- Green: webtrigger reachable; the JSON report sets
  `proves: "operator-fallback-reachability"` and explicitly
  `proves_native_automation: false`.
- This row never satisfies VM-AUTOMATION-AUDIT, and the aggregate marks native
  Automation proof pending until VM-AUTOMATION-AUDIT is green on its own.

## VM-ROVO-INVOKE — Per-agent scripted invocation + safety

- Command: `node scripts/invoke/run-all.mjs --json`
- What it does: for each Rovo agent, invoke against its declared seed issue
  (`infra/jira/seeds/matrix.yaml`); capture JSON response; run
  `scripts/lib/safety.mjs` assertions.
- Green: every agent returns a parseable JSON response; no response contains
  `approved:true`, `launchNow:true`, `mutatesProductionAudience:true`, etc.

## VM-SAFETY — Encoded safety tests

- Command: `npm run test:safety`
- Green: every test in `tests/safety/` passes — no claims approval, no campaign
  send, no audience/suppression mutation, no auto-transition of high-risk issues,
  PHI redaction in research outputs, policy-hash consistency, scope allowlist.

## VM-POLICY-HASH — Policy ↔ prompt hash match

- Command: `node scripts/verify/policy-hashes.mjs --json`
- Green: every prompt referencing a policy carries a `policyHash: sha256:…`
  comment matching `sha256sum policies/<file>.md`.

## VM-SNAPSHOT-FRESH — Audit snapshot regenerates with zero diff

> Replaces the prior `VM-IDEMPOTENCY` ("`infra:apply` is a no-op") row: there is
> no apply/converge engine to re-run (theme #3). Instead we assert the read-only
> snapshot is a faithful, current view of native output.

- Command: `node scripts/verify/snapshot-fresh.mjs --json`
- What it does: re-run the audit-snapshot scripts against native sources and diff
  the result against the committed `infra/` snapshot.
- Green: re-generation produces zero diff (the snapshot reflects current native
  state). The Rovo derived view (`infra/rovo/agents.yaml`) regenerates to zero
  diff against `manifest.yml`.

## VM-CLEAN-WORKTREE — Working tree clean, no secrets

- Command: `node scripts/verify/worktree.mjs --json`
- Green: `git status --porcelain` empty; secret scanner finds no candidates.

## VM-REGENERABLE-EVIDENCE — `evidence/` is all script output

- Command: `node scripts/verify/evidence-regenerable.mjs --json`
- Green: every file under `evidence/` has a `generated_by:` header referencing an
  existing script; zero findings. Strict mode: delete `evidence/`, re-run
  `npm run infra:verify`, reject any diff.

## VM-CI — CI is green on HEAD

- Command: `node scripts/verify/ci-status.mjs --json`
- Source: `gh run list --branch <current> --json …`.
- Green: latest CI run for HEAD is `success`.

## Final aggregate

- Command: `npm run infra:verify`
- Evidence: `evidence/verify/run-all.json` and `evidence/DONE.json` (the latter
  written only when every row is green and safety tests pass).
- Green: all rows green or marked `unsupported-by-platform` with a matching
  blocker file. Native Automation/Rovo proof (VM-AUTOMATION-AUDIT) and
  webtrigger-fallback reachability (VM-WEBTRIGGER-FALLBACK) are reported as
  distinct lines so no aggregate ever implies native proof from fallback
  evidence.
