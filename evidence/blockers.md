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

## BLK-02 — ACTIVE (plan limitation)

- **Opened:** 2026-06-15
- **Status:** Open — requires operator action (plan upgrade)
- **Blocker:** T-M3-03 cannot be completed as-is. The "Use agent" (Rovo AI) action in Jira Automation requires **Atlassian Intelligence**, which is only available on Jira Premium or Enterprise plans. The site `myhealthcaresite.atlassian.net` is on Free/Standard (evidenced by "Upgrade" button in top-right nav).
- **Evidence:** Checked all possible activation paths:
  - admin.atlassian.com → Rovo → Beta features: already ON (green) ✓
  - admin.atlassian.com → Rovo → Access: empty blocklist ✓
  - Jira admin → System settings: no "Atlassian Intelligence" section
  - Jira admin → Beta features (`/jira/settings/system/labs`): only "Jira formula fields" — no AI toggle
  - Jira admin search "atlassian intelligence": no results
  - "Use agent" action in flow builder shows: "To use a Rovo agent, your org admin needs to activate AI"
- **Resolution paths (operator choice):**
  1. Upgrade site to Jira Premium → Atlassian Intelligence becomes available → activate → complete T-M3-03
  2. Accept workaround: operators manually invoke Rovo agents via chat sidebar on individual issues; automation integration deferred
- **Impact:** T-M3-03 BLOCKED · T-M4-live BLOCKED · T-M5-live BLOCKED
- **Safe state:** All 5 automation rules remain DISABLED — no unintended automation fires

---

## Active blockers: BLK-02 (plan limitation — see above)

See STATUS.md for in-flight work.

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
