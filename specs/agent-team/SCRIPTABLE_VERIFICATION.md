# Scriptable Verification Matrix

> **NIH note.** This matrix is sound framed as an **audit harness over
> native output** (per `specs/atlassian-native-tools.md` finding #4): each
> verifier should diff/assert against what ACLI, Forge CLI, Jira REST, or a
> golden-template clone reports. The risk is verifiers that presuppose the
> bespoke `infra:apply` engine exists. Where a row asserts shape (issue
> types, fields, workflow, filters, dashboards), it can run equally well
> against a template clone or ACLI output — keep the assertion, stay
> agnostic about whether a hand-rolled reconciler produced the state.

Every verification is a command that writes JSON and exits 0 on green,
2 on red, 5 if the platform doesn't support it. No manual steps, no
screenshots, no navigation paths, no "ask the operator".

The umbrella command is:

```bash
npm run infra:verify
```

which runs every row below in series, aggregates the JSON reports, and
exits 0 only if every row is green.

## VM-LOCAL — Local gates

- Command: `npm run build && npm test && npm run test:integration && npm run forge:lint`
- Evidence: `evidence/verify/local.json`
- Green: exit 0 on all four. The only acceptable `forge lint` warning
  is the intentional standalone `addAnalysisComment` action; the
  verifier parses `forge lint --json` and asserts the warning count
  equals 1 and matches that rule.

## VM-FORGE-INSTALL — App installed on staging

- Command:
  ```
  node scripts/verify/forge-install.mjs --instance staging --json
  ```
- What it does: parses `forge install list --json` (or `forge install
  list` piped through a parser), asserts `myhealthcaresite.atlassian.net`
  Jira entry is `Up-to-date`.
- Green: assertion passes; deployed manifest version matches
  `manifest.yml`.

## VM-FORGE-LOGS — No handler errors in the last deploy window

- Command:
  ```
  node scripts/verify/forge-logs.mjs --since 2h --json
  ```
- What it does: `forge logs -e development --since 2h --json`, filters
  for `level: ERROR` and known handler-exception stack traces.
- Green: zero errors, or all errors matched against an allowlist file
  `infra/allowlists/forge-log-errors.yaml` (each entry dated and
  justified).

## VM-ROVO-CATALOG — 19 agents reachable

- Command:
  ```
  node scripts/verify/rovo-agents.mjs --json
  ```
- What it does: for each `rovo:agent.key` in `manifest.yml`, invoke a
  trivial `getIssueContext` round-trip via the Forge function REST
  surface with a known seed issue key. Record success per agent.
- Green: every agent in `manifest.yml` returned a structured response
  within the timeout.
- Platform-missing (exit 5): if Rovo invocation REST is unavailable to
  the authenticated account, the script records the endpoint it tried
  and exits 5. In that case the row is marked
  `unsupported-by-platform` in `evidence/verify/run-all.json` and the
  verifier as a whole still passes, **but** a file
  `evidence/blockers/rovo-catalog.json` is written to drive a human
  decision.

> **NIH note.** A Forge-function round-trip proves the action handler
> works; it does **not** prove Rovo **UI visibility**. Per
> `specs/atlassian-native-tools.md` finding #2 and T-NIH-01, this row must
> report "manifest/install verified; UI/API confirmation pending" unless a
> public Rovo agent **listing** API exists — do not let the round-trip be
> relabeled as a guarantee of visibility. The agent catalog itself is owned
> by `manifest.yml`; this verifier should diff against it, not maintain a
> second catalog.

## VM-JIRA-PROJECT — Project shape matches declaration

- Command:
  ```
  node scripts/verify/jira-project.mjs --json
  ```
- What it does: fetches project metadata via REST, diffs against
  `infra/instances/staging.yaml`.
- Green: zero diff.

## VM-JIRA-ISSUE-TYPES — Canonical types present

- Command:
  ```
  node scripts/verify/jira-issue-types.mjs --json
  ```
- What it does: diff `infra/jira/issue-types.yaml` against live issue
  types.
- Green: every declared type exists with the declared name; aliases
  resolved.

## VM-JIRA-FIELDS — Custom fields and screens

- Command: `node scripts/verify/jira-fields.mjs --json`
- Green: every declared field exists, has the declared schema, and is
  on at least one screen for every issue type in `appliesTo`.

## VM-JIRA-WORKFLOW — Workflow and transitions

- Command: `node scripts/verify/jira-workflow.mjs --json`
- Green: every declared status exists, every declared transition
  exists and is wired to the expected from/to statuses, validators
  and conditions match the declaration.

## VM-JIRA-FILTERS — Filters exist

- Command: `node scripts/verify/jira-filters.mjs --json`
- Green: each filter in `infra/jira/filters.yaml` exists with the
  declared JQL and sharing.

## VM-JIRA-DASHBOARDS — Dashboards + gadgets

- Command: `node scripts/verify/jira-dashboards.mjs --json`
- Green: each declared dashboard exists with the declared gadget set
  (gadget type + filter id resolvable).

## VM-JIRA-SEEDS — Seed coverage

- Command: `node scripts/verify/jira-seeds.mjs --json`
- Green: at least one issue of every canonical type exists in AIGO
  with label `aigo-seed`.

## VM-AUTOMATION-RENDER — Rendered rules have no placeholders

- Command: `node scripts/verify/automation-render.mjs --json`
- Green: render each rule from `infra/jira/automation/*.yaml`,
  assert no remaining `${...}` tokens; every `agentKey` resolves to
  `manifest.yml`.

## VM-AUTOMATION-IMPORT — Live rules match rendered

- Command: `node scripts/verify/automation-import.mjs --json`
- Green: each declared rule exists in Jira Automation with a body
  matching the rendered JSON (modulo ids and timestamps). Rules that
  have not been audited yet are `enabled=false`.

## VM-AUTOMATION-AUDIT — Each rule has one green run

- Command: `node scripts/verify/automation-audit.mjs --json`
- What it does: for each rule, triggers a known seed issue transition
  (or posts a synthetic comment) that would fire the rule, then polls
  the rule's audit log for a successful entry within a timeout.
- Green: every rule has at least one entry with `status: SUCCESS`,
  captured under `evidence/automation/<rule>.json`.
- Safety: Creative Claims audit assertion includes a regex check that
  the posted comment does not contain the substrings `approved:` or
  `approve claims`.

## VM-ROVO-INVOKE — Per-agent scripted invocation

- Command: `node scripts/invoke/run-all.mjs --json`
- What it does: for each Rovo agent, invoke against its declared seed
  issue (see `infra/jira/seeds/matrix.yaml`); capture JSON response;
  run `scripts/lib/safety.mjs` assertions against it.
- Green: every agent returns a parseable JSON response; no response
  contains `approved:true`, `launchNow:true`,
  `mutatesProductionAudience:true`, etc.

## VM-SAFETY — Encoded safety tests

- Command: `npm run test:safety`
- Green: every test in `tests/safety/` passes. Tests cover:
  no claims approval, no campaign send, no audience/suppression
  mutation, no auto-transition of high-risk issues, PHI redaction in
  research outputs, policy hash consistency, scope allowlist.

## VM-POLICY-HASH — Policy ↔ prompt hash match

- Command: `node scripts/verify/policy-hashes.mjs --json`
- Green: every prompt that references a policy carries a
  `policyHash: sha256:…` comment matching `sha256sum policies/<file>.md`.

## VM-IDEMPOTENCY — `infra:apply` is a no-op on second run

- Command: `node scripts/verify/idempotency.mjs --json`
- What it does: runs `npm run infra:apply`, then runs it again, and
  asserts the second run reports `changes: []` in every sub-report.
- Green: second-run changes are empty.

## VM-CLEAN-WORKTREE — Working tree clean, no secrets

- Command: `node scripts/verify/worktree.mjs --json`
- Green: `git status --porcelain` is empty; secret-scanner (gitleaks
  or a minimal regex pass via `scripts/lib/secrets.mjs`) finds no
  candidates.

## VM-REGENERABLE-EVIDENCE — `evidence/` is all script output

- Command: `node scripts/verify/evidence-regenerable.mjs --json`
- What it does: for every file under `evidence/`, asserts it contains
  a `generated_by:` header (JSON top-level key or Markdown
  front-matter) referencing an existing script. Any file lacking that
  is a finding.
- Green: zero findings. Optional strict mode: delete `evidence/` and
  re-run `npm run infra:verify`; reject diff != everything in
  `evidence/` regenerated.

## VM-CI — CI is green on HEAD

- Command: `node scripts/verify/ci-status.mjs --json`
- What it does: uses `gh run list --branch <current> --json …` to
  confirm the latest CI run for HEAD is `success`.
- Green: latest run success.

## Final aggregate

- Command: `npm run infra:verify`
- Evidence: `evidence/verify/run-all.json` and
  `evidence/DONE.json` (the latter is produced only when every row
  above is green and safety tests pass).
- Green: all rows green or marked `unsupported-by-platform` with a
  matching blocker file; `evidence/DONE.json` written.
