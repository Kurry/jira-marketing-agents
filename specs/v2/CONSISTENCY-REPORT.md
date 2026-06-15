# specs/v2 — Consistency Report (C10 final pass)

Date: 2026-06-15
Status: Proposal. Final cross-document consistency review of the `specs/v2/`
rewrite against the shared contract in [_CONVENTIONS.md](_CONVENTIONS.md). Does
not supersede current `specs/` until accepted by the architect + safety reviewer.
Supersedes: (new — has no v1 predecessor)

Scope: all 16 root files (14 content docs + `_CONVENTIONS.md` + this report) and
all 16 `agent-team/` files. Every file was read in full and checked against the
seven consistency checks below. Fixes applied in place are limited to broken
links and a stale index; nothing larger was rewritten (recorded as FLAGs).

## Results

| Check | Status | Files | Detail |
| --- | --- | --- | --- |
| 1. Canonical counts (§4) | PASS | `issue-types.md`, `custom-fields.md`, `workflows.md` (canonical); all others | Only the three canonical files state specific entity counts (14 issue types / 39 fields / 11 statuses). All other v2 docs reference them and never restate a count. Grep for "`N issue types/fields/statuses`" matched only the canonical files plus `_CONVENTIONS.md §4` (which describes the historical drift, not a current count). `39 = 6 Assets + 6 JPD + 27 Jira` arithmetic is internally consistent and matches the prose. No contradictory numbers found. |
| 2. Fit Matrix (§2) | PASS (1 documented extension) | `_CONVENTIONS.md`, `atlassian-native-tools.md` | The 13 matrix rows in `atlassian-native-tools.md` match `_CONVENTIONS.md §2` verbatim (need / use-first / keep-custom columns identical). `atlassian-native-tools.md` adds one extra row — **Async context → Loom** — not present in the `_CONVENTIONS.md` matrix. This is **self-disclosed** in that doc's "Merged / Dropped" section ("Loom added to the matrix"), so it is an intentional, documented extension rather than a contradiction. No other doc contradicts the matrix. (Recorded as a minor FLAG for the architect to ratify the Loom row into `_CONVENTIONS.md §2` if desired.) |
| 3. NIH resolutions (§3) | PASS | all docs (esp. `atlassian-native-tools.md`, `design.md`, `requirements.md`, `tasks.md`, all `agent-team/*`) | No supported/default path references `gateway/api/automation/internal-api`, `rest/cb-automation`, or keychain auth except where explicitly labeled removed / experimental / non-default / platform-blocker / to-purge (T-NIH-02, T-NIH-08). Webtrigger evidence is consistently held in a **separate row** from native Automation/Rovo audit-log proof and never presented as native proof (VM-WEBTRIGGER-FALLBACK vs VM-AUTOMATION-AUDIT; DECLARATIVE_STATE, SCRIPTABLE_VERIFICATION, VERIFICATION_MATRIX, QUALITY_GATES hook G-WEBTRIGGER-NEQ-NATIVE). "Rovo visibility" reads as "manifest/install check" throughout; the only "19 agents visible" strings appear as the **prior/renamed** claim being retired, correctly framed. |
| 4. Role names | PASS | `TEAM_CHARTER.md` (canonical), `TASK_BOARD.md`, `OPERATING_LOOP.md`, `AUDIT_PLAN.md`, `LAUNCH_PROMPT.md`, `QUALITY_GATES.md`, `AGENTS.md`, `RUNBOOK.md`, `README.md` | The seven canonical names from `TEAM_CHARTER.md` (`lead`, `native-architect`, `script-eng`, `jira-native-eng`, `forge-rovo-eng`, `safety-tester`, `docs-scribe`) are used consistently in every doc that names roles. No drift (no stray `iac-architect` / `jira-client-eng` / `forge-engineer` — the v1→v2 renames are noted as such only in the TEAM_CHARTER re-alignment note). Hook `teammate-idle.sh` continuous-role list (`lead`/`docs-scribe`/`safety-tester`) matches the charter. |
| 5. T-NIH tasks | PASS | `nih-roadmap.md` (canonical), `atlassian-native-tools.md`, `tasks.md`, `outcome-roadmap.md`, `TASK_BOARD.md`, `refactor-plan.md` | The full `T-NIH-01..14` list with acceptance/dependencies/waves lives in `nih-roadmap.md`. Other docs **reference** the IDs and wire owners/phases/evidence to them without duplicating the full acceptance text. `atlassian-native-tools.md` carries a status-pointer summary (explicitly "summarized here for the architecture record"); `TASK_BOARD.md` Phase 4 says "Do not restate T-NIH-* acceptance here — read the roadmap." The intentional `T-NIH-06` gap (never issued) is consistently noted. No conflicting state markers found across docs for the same ID. |
| 6. Headers (§6) | PASS | all 32 files | Every file opens with `# Title`, `Date: 2026-06-15`, a one-line `Status:`, and a `Supersedes:` pointer where applicable. Files with no v1 predecessor (`refactor-plan.md`, `CONSISTENCY-REPORT.md`) correctly state `Supersedes: (new — has no v1 predecessor)`. `_CONVENTIONS.md` and the two README indexes carry Date + Status as expected. |
| 7. Cross-links | FIXED | `agent-team/AUDIT_PLAN.md`, `agent-team/README.md`, `README.md` (v2 index) | Three broken/stale-link issues found and fixed in place (details below). All other relative links resolve: root files link siblings directly; `agent-team/` files use `../` for v2 root (verified `../atlassian-native-tools.md`, `../nih-roadmap.md`, `../issue-types.md` etc. resolve) and `../../` only for genuine `specs/` root targets (`../../nih-review-2026-06-15.md` exists). |

## Fixes applied (in place, all under specs/v2/)

1. **`agent-team/AUDIT_PLAN.md` line 8** — link to the Fit Matrix doc pointed at
   `../../atlassian-native-tools.md` (resolves to the legacy `specs/atlassian-native-tools.md`).
   Changed to `../atlassian-native-tools.md` (the v2 architecture doc), matching
   the convention used by the four other agent-team files (MISSION, LAUNCH_PROMPT,
   TEAM_CHARTER, RUNBOOK).
2. **`agent-team/README.md` lines 12 and 84** — same `../../atlassian-native-tools.md`
   → `../atlassian-native-tools.md` correction (two occurrences: the "Read first"
   pointer and the "Cross-bundle references" entry). These explicitly cite the
   v2 Native Tool Fit Matrix, so they must point at the v2 doc, not the legacy one.
3. **`README.md` (v2 index)** — the index was stale: it claimed `agent-team/AUDIT_PLAN.md`,
   `agent-team/SCRIPTS_CONTRACT.md`, and `agent-team/LAUNCH_PROMPT.md` were "not
   yet committed," and it omitted `agent-team/README.md`. All four now exist.
   Removed the stale "not yet committed" note and added rows for `SCRIPTS_CONTRACT.md`,
   `AUDIT_PLAN.md`, `LAUNCH_PROMPT.md`, and `agent-team/README.md` to the
   agent-team table (now lists all 16 agent-team files).

## FLAGs for the architect (no in-place rewrite — larger or judgment calls)

- **F-1 (low, §2):** `atlassian-native-tools.md` carries a 14th Fit Matrix row
  ("Async context → Loom") that `_CONVENTIONS.md §2` does not. It is self-disclosed
  as an intentional addition, so it is not a contradiction — but the two matrices
  are no longer byte-identical. Recommend either adding the Loom row to
  `_CONVENTIONS.md §2` or moving it to a clearly-labeled "extensions" note, so the
  "matrix is LAW / carried verbatim" wording stays literally true.
- **F-2 (cosmetic):** `agent-team/AUDIT_PLAN.md` line 12 contains a self-referential
  markdown link with an empty target — `` [`AUDIT_PLAN.md`] `` (no `(...)`). It
  renders as plain bracketed text, harmless, and is a self-reference, so I left it
  rather than guess intent. Recommend deleting the stray brackets.
- **F-3 (informational):** Several agent-team files (IAC_PRINCIPLES, MISSION,
  REVIEW_MISSION) wrap links in backticks, e.g. `` `[DECLARATIVE_STATE.md](DECLARATIVE_STATE.md)` ``.
  The targets resolve correctly; the backtick-around-link style renders the link
  as literal text in some markdown engines. Stylistic only — left as authored.

## Verdict

The `specs/v2/` set is **internally consistent and ready for architect review.**
All seven checks pass once the three cross-link fixes above are applied; the only
residual items are one self-disclosed Fit-Matrix extension (F-1) and two cosmetic
markdown-style notes (F-2, F-3), none of which contradict the shared contract or
the canonical data model. The canonical counts are centralized correctly (14/39/11
stated once each), the Fit Matrix and the five NIH resolutions are reflected
without contradiction across all 32 files, role names are uniform, the T-NIH board
is referenced rather than duplicated, and every file carries a conforming header.
