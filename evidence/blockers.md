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

## BLK-02 — RESOLVED ✓ (Rovo/AI activation eligibility)

- **Opened:** 2026-06-15
- **Resolved:** 2026-06-15T14:00Z
- **Resolution:** Operator upgraded `myhealthcaresite.atlassian.net` to Standard plan. Rovo is now included. T-M3-03 completed via Forge webtrigger CLI path (5 agents invoked, commentIds 10004-10008). "Use agent" in Jira Automation is now available for the operator to wire in the 5 automation rules via the Jira Automation UI.
- **Blocker (historical):** T-M3-03 could not be completed via Jira Automation "Use agent" step. The action required Rovo/AI to be active for the organization. On `myhealthcaresite.atlassian.net`, the action showed "To use a Rovo agent, your org admin needs to activate AI."
- **Current Atlassian docs checked 2026-06-15:**
  - Rovo is included with paid Standard, Premium, and Enterprise subscriptions;
    Free subscriptions cannot use Rovo:
    <https://support.atlassian.com/rovo/docs/rovo-usage-limits/>
  - Rovo also requires at least one verified business domain; orgs using only
    generic domains such as gmail.com cannot enable Rovo:
    <https://support.atlassian.com/rovo/docs/rovo-usage-limits/>
  - Jira automation can run a Rovo agent through the "Use Rovo agent" action:
    <https://support.atlassian.com/studio/docs/use-rovo-in-an-automation-rule/>
  - Org admins manage which apps and users can access Rovo:
    <https://support.atlassian.com/rovo/docs/administer-atlassian-rovo-for-your-organization/>
- **Observed evidence:** Checked activation paths:
  - admin.atlassian.com → Rovo → Beta features: already ON (green) ✓
  - admin.atlassian.com → Rovo → Access: empty blocklist ✓
  - Jira admin → System settings: no "Atlassian Intelligence" section
  - Jira admin → Beta features (`/jira/settings/system/labs`): only "Jira formula fields" — no AI toggle
  - Jira admin search "atlassian intelligence": no results
  - "Use agent" action in flow builder shows: "To use a Rovo agent, your org admin needs to activate AI"
  - UI showed an Upgrade affordance, but the exact billing plan still needs
    confirmation in Atlassian Admin because paid Standard may qualify for Rovo
    under current docs.
- **Resolution paths (operator choice):**
  1. Confirm the exact Jira plan in Atlassian Admin / billing. If Free, upgrade
     at least to a paid Rovo-supported plan; if already paid Standard, do not
     assume Premium is required before checking the next items.
  2. Verify or claim an organization business domain if the org currently relies
     on a generic email domain.
  3. Enable Rovo / Atlassian Intelligence for the org and confirm the target Jira
     app has Rovo access.
  4. Return to `skills/jira-automation-rovo-setup/SKILL.md` and complete
     T-M3-03.
  5. Accept workaround: operators manually invoke Rovo agents via chat sidebar on
     individual issues; automation integration deferred.
- **Impact:** T-M3-03 BLOCKED · T-M4-live BLOCKED · T-M5-live BLOCKED
- **Safe state:** All 5 automation rules remain DISABLED — no unintended automation fires

---

## Active blockers: NONE ✓ — All blockers resolved

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
