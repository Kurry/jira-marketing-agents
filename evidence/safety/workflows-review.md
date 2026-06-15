# Safety Review — specs/workflows.md (T-M2-05 plan-approval gate)

**Reviewer:** safety-reviewer
**Date:** 2026-06-14
**Artifact under review:** `specs/workflows.md` (12-status MVP workflow spec, authored by architect)
**Purpose:** Verify the workflow spec is safe before `lead` approves `jira-admin`'s
plan to implement the workflow-scheme change in Jira (plan-approval-gated).
**Cross-references checked:** `src/comments.ts`, `src/index.ts`, `manifest.yml`,
`evidence/jira-config/current-state.md`, `evidence/automation/rule-audit.md`,
`policies/safe-mutations.md`, `policies/claims-risk-policy.md`,
`policies/experiment-policy.md` (as cited by the spec).

---

## Per-criterion verdict

### 1. Claims Review requires a human reviewer (AI routes only) — PASS
- §1 status #9 defines Claims Review as "Health/clinical claims await Compliance review."
- §4 gate table: approver = "Compliance / Medical Review **human**"; rule states AI
  "may flag, score Claims Risk, and recommend safer copy, but **must not approve**
  clinical/health claims or move the item to `Done`/approved."
- §3 transition requirements: `Any → Claims Review` requires **Claims Risk** set
  (Medium/High/Prohibited routes here) + Proof Point — a routing gate, not an approval.
- Corroborated by `rule-audit.md` §1: the creative-claims rule only *routes* to
  Claims Review (CONTAINS "Risky"); comment labeled "not an approval."

### 2. Experiment Running requires explicit human launch approval — PASS
- §1 status #10: "Approved experiment is live; awaiting readout."
- §4 gate table: approver = "**Human** Launch approver"; rule: "An experiment moves
  to `Experiment Running` only after a human approves launch; AI cannot launch."
- §3: `Any → Experiment Running` requires the full experiment-policy field set
  (Hypothesis, Primary/Guardrail Metrics, Variant ID, Decision Date, Sample
  Feasibility, tracking note) before the move is permitted.
- No path in §2/§3/§4 lets AI autonomously set this status. PASS.

### 3. Decision Needed requires linked Decision Memo + human review — PASS
- §1 status #8: "A human decision (Decision Memo) is required."
- §3: `Any → Decision Needed` requires "Decision Needed, plus a linked **Decision Memo**."
- §4 gate table: approver = "**Human** decision owner ... the human records the
  decision. AI drafts the memo and recommendation only." AI does not resolve. PASS.

### 4. No AI path moves high-risk issue types directly to Done — PASS
- §3: `Any → Done` requires "Type-specific acceptance fields satisfied; no open
  required gate." Open Claims Review / Experiment / launch gates block Done.
- §4 gate table: "High-risk → Done / approved" = "**Human** reviewer ... High-risk
  tickets cannot be closed or approved without human review. AI cannot auto-close."
- Type-specific: Employer Launch → Done requires Readiness Score + QA Required
  cleared. No autonomous AI close path exists. PASS.

### 5. No new write surfaces beyond addAnalysisComment — PASS
- §3 explicitly notes required-field gates "are enforced by review/readiness checks,
  **not by autonomous field writes**."
- §4 closing statement: "All AI contributions across every status are comment-only
  via `addAnalysisComment`, the single mutating Forge action. No transition, field
  write, or approval is performed by AI."
- Verified against code: `src/comments.ts` is the only mutating action
  (`addAnalysisComment`), and `src/index.ts` documents handlers "never mutate
  issues, approve claims, launch [...]". `manifest.yml` scopes are the canonical
  three (read:jira-work, write:jira-work, read:chat:rovo) — unchanged. PASS.

### 6. Guardrails against prohibited autonomous AI actions — PASS
- §4 enumerates human-only gates covering: approving claims (Claims Review gate),
  launching experiments/campaigns (Experiment Running gate), closing high-risk
  tickets (High-risk → Done gate), and decision resolution (Decision Needed gate).
- §4 final paragraph forbids AI transitions, field writes, and approvals globally.
- Automation row: enabling any rule that drives a transition requires
  `lead` + `safety-reviewer` plan-approval; rules imported disabled; transitions
  via Automation out of scope for MVP unless explicitly allowlisted. This matches
  `rule-audit.md` §3 (all 5 rules DISABLED).
- Note: "sending messages / altering audiences" is not a workflow-status concern,
  but is covered out-of-band by `src/index.ts` ("never ... launch") and the
  manifest scope set (no messaging/audience scopes). No gap introduced by this spec.

---

## Overall verdict: APPROVED

The workflow spec describes status routing and human approval gates only. It
introduces **no new AI write surface**: AI remains comment-only via
`addAnalysisComment`. Every high-risk transition (Claims Review, Experiment
Running launch, Decision Needed, High-risk → Done) is explicitly gated to a named
human role, and the spec states AI "never crosses these gates itself." The spec is
consistent with the implemented code, the manifest scopes, and the disabled
automation ruleset. Safe for `lead` to approve `jira-admin`'s T-M2-05 plan.

**Non-blocking observations (carry-forward, not objections):**
- The required-field gates in §3 are described as enforced by "review/readiness
  checks." When `jira-admin` implements the actual Jira workflow validators, confirm
  these are configured as Jira-native transition validators (human-side) and that
  no Automation rule is wired to auto-populate gated fields. Re-review the
  `plan-custom-fields.md` / `plan-issue-types.md` plans when submitted.
- This is a STAGING-only change (`myhealthcaresite.atlassian.net`), consistent with
  the staging-only mandate.

---

## jira-admin plan submission check

As of this review, `evidence/jira-config/` contains: `README.md`, `acli-auth.md`,
`current-state.md`. **No `plan-issue-types.md` or `plan-custom-fields.md` has been
submitted yet.** Current-state discovery (`current-state.md`) is benign read-only
enumeration (PASS — no mutations, staging only, all GET/search/view commands).
The implementation plans remain pending; I will review them under my continuous
T-CX-02 mandate when they appear.

`evidence/automation/` (`rule-audit.md`) was reviewed: all 5 rules DISABLED,
comment-only, no approve/launch steps — consistent with prior SR-001 clean review.

---

*Verification matrix: VM-JIRA-WORKFLOW. Linked: MISSION.md DoD #4.*
