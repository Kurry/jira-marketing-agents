# architect — completion notes (T-M0-06, T-M2-01, T-M2-02, T-M2-06)

_Session: 2026-06-15T03:53Z (operator macOS machine)._

## T-M0-06 — Update CLAUDE.md ✓
- File: `CLAUDE.md` (repo root).
- Added four sections ahead of the existing auto-generated content:
  1. "Always read before acting" — links MISSION, TEAM_CHARTER, OPERATING_LOOP,
     TASK_BOARD, VERIFICATION_MATRIX under `specs/agent-team/`.
  2. "Safety contract" — references `policies/safe-mutations.md`,
     `policies/claims-risk-policy.md`, `policies/experiment-policy.md`.
  3. "File ownership map" — per-role table from TEAM_CHARTER.
  4. "Plan-approval gates" — workflow scheme, manifest scope, prompt safety,
     Automation enablement, `policies/` touches.
- Evidence line appended to `evidence/ground-truth.md`.
- File references both "specs/agent-team" and "policies/" (evidence criterion met).

## T-M2-01 — specs/issue-types.md ✓
- 14 canonical types documented with description, primary fields, legacy aliases.
- Legacy alias table: Insight / Research Brief → Research Brief; Growth Task →
  AI Growth Request; Automation Request → AI Growth Request.
- States explicitly that live types are Workstream/Task/Sub-task and the 14 are
  the target state.

## T-M2-02 — specs/custom-fields.md ✓
- All 37 outcome fields tabulated: type, owning issue types, env-var mapping.
- 4 outcome fields wired today (segment, primaryMetric, claimsRisk, experimentId)
  + 2 classifier helpers (workflowArea, priorityScore). Remaining 33 are
  target-state with no env var yet.

## T-M2-06 — specs/workflows.md ✓
- 12 MVP statuses with category + meaning; canonical happy path.
- Per-issue-type branch-status matrix (14 types × 5 branch statuses).
- Required fields per transition (Claims Review requires Claims Risk; Experiment
  Running requires full experiment-policy field set; Decision Needed requires
  Decision Memo).
- Human approval gates table (Compliance human for Claims Review; human Launch
  approver for Experiment Running; human + Decision Memo for Decision Needed;
  no AI high-risk auto-close).
- Flagged for `safety-reviewer` review before T-M2-05.

## Notes / no new blockers
- No safety concerns surfaced. All four files reaffirm the comment-only,
  no-autonomous-write contract.
- These are TARGET-state specs; making them real in Jira is gated `jira-admin` /
  `forge-engineer` work (plan-approval required).
