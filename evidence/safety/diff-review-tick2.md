# Safety Evidence — T-CX-02 Continuous Diff Review (tick 2)

Task: T-CX-02 — Continuous diff review
Reviewer: safety-reviewer
Date: 2026-06-14
Range reviewed: HEAD~5..HEAD (8 commits exist total; range covers the last 5).

## Commits in range

- `0ca5b59` added updated specs — specs/agent-team/* only (docs/specs).
- `59cec32` Document AI Growth Ops outcome roadmap — docs/ + specs/ only.
- `22eb6e5` Build Forge Rovo MVP baseline — manifest.yml, src/, prompts/,
  policies/, automation/, docs/. **Removed** the entire `mcp/` and
  `docs/COWORK.md` surface (MCP/Cowork is explicitly out-of-scope per MISSION).
- `18fb722` Merge PR #2 (CodeRabbit unit tests) — tests/ only.
- `1a90fdb` Merge origin/main — app baseline import.

## Safety checks

### A. No new scope added to manifest.yml — PASS
Scopes in the current manifest are exactly the canonical three
(`read:jira-work`, `write:jira-work`, `read:chat:rovo`). The MVP baseline commit
rewrote the manifest but did not introduce any additional scope; no later commit
touches `permissions.scopes`. Net result: no scope creep.

### B. No prompt file weakened safety language — PASS
The `prompts/*.md` files were added as part of the baseline (additions, not edits
that strip guardrails). Every prompt in the working tree carries explicit safety
constraints (verified in prompt-audit-tick2.md). No diff in range removes a
"never approve / do not launch / never mutate" line. No prompt edit invents
clinical outcomes, proof points, or statistical significance.

### C. No automation rule changed to add an "approve" step — PASS
`automation/rules/*.json` and `automation/rules/aigo-automation-ruleset.json`
were added in the baseline. Grep for `approve` across `automation/` returns only:
- Negative guardrail text ("Never approve claims", "No rule approves claims").
- The Creative Claims rule (`creative-claims.json`) on a Creative Request
  transitioning to **Ready** runs the claims agent (prompt ends "Never approve
  claims"), posts an analysis-only comment ("not an approval"), and may
  **transition the issue to `Claims Review`** — a review-queue handoff, not an
  approval and not a claims-state decision. This conforms to
  `policies/safe-mutations.md` ("routes risky items; it never approves") and
  MISSION DoD item 5 ("Creative Claims routing only *routes* risky items; it
  never approves").
- The `approve/defer` text in the Decision-Memo seed CSV is issue *content*, not
  an automation action.
No automation rule adds an approval action.

### D. No src/ code mutates beyond addAnalysisComment — PASS
`src/jira.ts` is the only module issuing Jira writes. Two `POST` calls:
JQL search (read) and comment-add. No transition, field update, assignee change,
audience/suppression mutation, issue delete, or permission change anywhere in
`src/`. `src/comments.ts#addAnalysisComment` wraps the single comment write.
`src/index.ts` header comment affirms handlers "never mutate issues, approve
claims, launch [...]".

## Verdict — PASS (no safety-contract violations in range)

safety-reviewer: approved 2026-06-14
