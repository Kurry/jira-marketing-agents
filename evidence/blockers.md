# Blockers

_Per MISSION.md "Stop conditions": hard blockers are captured here and escalated._

---

## BLK-01 — RESOLVED ✓

- **Opened:** 2026-06-15T03:41Z (prior Cowork sandbox session)
- **Resolved:** 2026-06-15T00:44Z (operator macOS session confirmed forge working)
- **Resolution:** Operator resumed from macOS machine where `forge 12.22.0` is
  installed and authenticated as Kurry Tran. `forge install list` confirms
  `myhealthcaresite.atlassian.net → development → Up-to-date`. All M1+ work
  is now unblocked.

---

## Active blockers: none

The mission critical path is unblocked. See STATUS.md for in-flight work.

---

## Anticipated gating items (not yet blockers)

- **R-03 (VM-ROVO-VISIBILITY):** Jira/Rovo browser UI confirmation of all 19
  agents requires a human to log into the Jira site and confirm. The agent team
  will prepare the evidence template and ask the operator for one screenshot or
  textual confirmation at the appropriate point (T-M1-04). This is expected, not
  a surprise blocker.
- **R-02 (acli):** `acli` presence on the operator machine needs verification
  before T-M2-07 (seed re-import). If absent, alternatives: Jira REST via curl,
  or manual import via UI. Task-owner `jira-admin` will confirm on claim.
