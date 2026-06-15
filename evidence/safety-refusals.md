# Safety Refusals & Objections Ledger

Append-only. Per MISSION.md safety contract, every refused request and every
safety objection is logged here and never deleted. Entries are reverse-free:
append new entries at the bottom.

Format per entry:
- ID, timestamp, reviewer
- Trigger (what was requested / what was reviewed)
- Decision: REFUSED / OBJECTION / NO-OBJECTION (clean review)
- Rationale + safety-contract clause

---

## SR-001 — 2026-06-14 — safety-reviewer — Tick 2 safety sweep (T-M1-05, T-CX-02, T-M8-02 prereq)

- **Trigger:** Scheduled adversarial review of manifest scopes, recent diffs
  (HEAD~5..HEAD), and all 19 prompts.
- **Decision:** NO-OBJECTION (clean review). No refusal required.
- **Rationale:** Scopes are exactly the canonical three; the only write action is
  `addAnalysisComment`; src/ issues no mutations beyond the comment add; all 19
  rovo:agent keys present with matching prompt files; every prompt carries intact
  safety guardrails and no dangerous capability; no automation rule adds an
  approval step (Creative Claims only *routes* to Claims Review). Evidence:
  `evidence/safety/scope-audit.md`, `evidence/safety/diff-review-tick2.md`,
  `evidence/safety/prompt-audit-tick2.md`.
- **Carry-forward (non-blocking):** Prompts inline the claims/experiment
  guardrails but do not reference the `policies/*.md` files by path. Recommend
  adding explicit policy-file references in T-M8-02 so policy edits propagate by
  reference. Not a violation; guardrails are substantively intact.

safety-reviewer: approved 2026-06-14
