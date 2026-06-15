# AGENTS.md

Date: 2026-06-15
Status: Proposal — v2 re-alignment to the Atlassian-native / NIH-reduction direction.
Supersedes: `specs/agent-team/AGENTS.md`

Instructions for agents operating in `jira-marketing-agents`. The v1 file carried only the
documentation-fetch (`ctx7`) protocol; that is preserved verbatim below. This v2 file also
records **how the team actually claims and runs work**, so a teammate joining mid-run behaves
correctly. Authoritative process docs: [`OPERATING_LOOP.md`](OPERATING_LOOP.md),
[`TEAM_CHARTER.md`](TEAM_CHARTER.md), [`IAC_PRINCIPLES.md`](IAC_PRINCIPLES.md).

## How the team claims and runs work

- **Source of truth for work** is the shared task list, seeded from
  [`TASK_BOARD.md`](TASK_BOARD.md) (ids/owners/deps preserved). A teammate claims only an
  unblocked task whose owner matches its role in [`TEAM_CHARTER.md`](TEAM_CHARTER.md).
- **Native owner first.** Before writing custom code, the claiming teammate names the
  Atlassian-native owner for the concern from the Native Tool Fit Matrix
  ([`_CONVENTIONS.md`](../_CONVENTIONS.md) §2). Custom code is justified only by Twin-specific
  policy/agent/safety logic, evidence generation, or a documented platform gap.
- **Plan-approval gates** (destructive ops, `manifest.yml`/scope changes, safety-language
  prompt edits, enabling a disabled rule, `policies/` edits, behavior-changing NIH refactors,
  and any internal/private-endpoint usage) require plan mode + lead approval before acting; see
  [`TEAM_CHARTER.md`](TEAM_CHARTER.md). The default for internal endpoints is deny.
- **Build → apply → verify** per the loop: produce a script/native wrapper, apply through the
  native owner (ACLI, golden-template clone, Forge, native Automation import), then run the
  read-only `infra:verify` audit. Re-run apply once to prove idempotency.
- **Evidence is script output.** No hand-written `evidence/*.md`; parse native `--json` output
  where possible. The `TaskCompleted` hook ([`QUALITY_GATES.md`](QUALITY_GATES.md)) rejects
  evidence with no producing script, manual-UI acceptance bullets, screenshots, or
  private-endpoint dependencies on a supported path.
- **Coordination:** one commit per task (`T-<id>: <title>`); `#coord:<file>` notes serialise
  shared `scripts/lib/` edits; `manifest.yml` is `forge-rovo-eng`'s; the golden template and
  audit schemas are `native-architect`'s.
- **Escalate, don't halt.** Provably-missing native capability → exit code 5 + blocker file +
  VM row `unsupported-by-platform`, continue other tasks. Safety conflict → refuse, log to
  `evidence/safety-refusals.json`, continue.

## Documentation fetch protocol (`ctx7`)

<!-- context7 -->
Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps

1. Resolve library: `npx ctx7@latest library <name> "<user's question>"` -- use the official library name with proper punctuation (e.g., "Next.js" not "nextjs", "Customer.io" not "customerio", "Three.js" not "threejs")
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question)
3. Fetch docs: `npx ctx7@latest docs <libraryId> "<user's question>"`
4. Answer using the fetched documentation

You MUST call `library` first to get a valid ID unless the user provides one directly in `/org/project` format. Use the user's full question as the query -- specific and detailed queries return better results than vague single words. Do not run more than 3 commands per question. Do not include sensitive information (API keys, passwords, credentials) in queries.

For version-specific docs, use `/org/project/version` from the `library` output (e.g., `/vercel/next.js/v14.3.0`).

**Atlassian caveat (important).** For any Atlassian surface, do NOT resolve by nickname — `library "Forge"` returns *Electron* Forge, `"Jira"` returns unrelated client libs, `"Terraform"` returns the AWS provider. Use the PINNED Atlassian library IDs in [`../_CONVENTIONS.md`](../_CONVENTIONS.md) §7 (e.g. `/websites/developer_atlassian_platform_forge`, `/websites/developer_atlassian_cloud_jira_platform_rest_v3`, `/websites/developer_atlassian_cloud_acli_reference_commands`). If you must resolve, query `"atlassian <product>"` and confirm the result Title says **Atlassian** before trusting the ID. Several surfaces have no ctx7 library (Terraform Operations provider, Rovo, JPD, Analytics, Goals) — use the matching `skills/` skill and the official doc URLs in its References instead.

If a command fails with a quota error, inform the user and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY` env var for higher limits. Do not silently fall back to training data.
Run Context7 CLI requests outside Codex's default sandbox. If a Context7 CLI command fails with DNS or network errors such as ENOTFOUND, host resolution failures, or fetch failed, rerun it outside the sandbox instead of retrying inside the sandbox.
<!-- context7 -->

When fetching Atlassian-native docs (Forge CLI, ACLI, Jira Automation import/export, the
official `atlassian/atlassian-operations` Terraform provider), prefer `ctx7` over training data
— the native surface is the supported path and its flags change.
