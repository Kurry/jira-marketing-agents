# docs-writer completion notes — 2026-06-14

## T-M7-04: docs/TROUBLESHOOTING.md created

File created at `docs/TROUBLESHOOTING.md`.

Sections:
1. Rovo UI vs Forge install vs Automation distinction — what each surface
   proves, navigation path for Rovo agent visibility check, and the
   Automation ↔ Rovo agent relationship.
2. Forge deploy/install troubleshooting — install status definitions,
   standard command sequence, Node v26 warning note, and manifest validation
   failure diagnosis.
3. Automation audit log — navigation path, success vs failure log appearances,
   empty `{{agentResponse}}` causes, and Creative Claims routing semantics.
4. Log-search recipes — `forge logs` with `--since` and `--limit`, grep for
   errors, handler-specific filtering, and correlating log entries with Jira
   issue keys.
5. Common issues and resolutions — 12-row symptom/cause/resolution table
   covering the most common operator and developer issues.
6. Related documentation cross-reference table.

Source evidence used:
- `manifest.yml` for agent keys, action keys, function handlers, and runtime
  declaration.
- `docs/INTEGRATION.md` section 17 (existing troubleshooting table, extended).
- `docs/MVP_RUNBOOK.md` for Rovo visibility check navigation and known gaps.
- `specs/agent-team/MISSION.md` definition-of-done item 8.

## T-M7-06: README.md updated

Changes to `README.md`:
- Section 6 (Required Forge commands callout block): added two sentences
  pointing to `docs/TROUBLESHOOTING.md` and `docs/RELEASE_CHECKLIST.md`.
- Repository layout section: expanded `docs/` entry to list all current doc
  files; added `specs/agent-team/` entry with description; added `evidence/`
  entry.

## Link check observation

`docs/TROUBLESHOOTING.md` references `docs/RELEASE_CHECKLIST.md` which does not
yet exist (it is a separate deliverable, T-M7-05). Noted in
`evidence/gates/link-check-pending.md` — see that file.

---

## T-M7-05 (pre-draft): docs/RELEASE_CHECKLIST.md created

File created at `docs/RELEASE_CHECKLIST.md`.

Sections:
1. Pre-release local checks — four commands (build, test, test:integration,
   forge lint) each required to exit 0.
2. Safety review — four checklist items covering prompt review, safety contract,
   policy guardrails, and evidence/safety sign-off.
3. Manifest change checklist — six items covering forge lint, scope list, agent
   count, prompt file mapping, approval gates, and TEAM_CHARTER plan gate.
4. Automation rule change checklist — six items covering placeholder tokens,
   agentKey match, import-disabled requirement, safety pre-approval, audit-log
   capture, and enable-after-audit constraint.
5. Deploy checklist — three commands (forge deploy, forge install list,
   VM-SMOKE-JIRA smoke test).
6. Rollback procedure — four-step numbered procedure.
7. Post-deploy verification — three checklist items (forge logs, manual Rovo
   run, VM-LOCAL-GATES green check).

Note: T-M7-05 is marked as depending on T-M3-03 for its final Automation
section content. The checklist includes the pre-draft structure; T-M3 completion
should trigger a review pass on section 4.

Forward reference in `evidence/gates/link-check-pending.md` is now resolved —
the file exists.

## T-M7-07 (partial): docs/MVP_READINESS.md updated

Changes to `docs/MVP_READINESS.md`:
- Evidence Collected: added "Additional evidence (2026-06-14 sprint)" subsection
  with 10 new items covering forge deploy v2.1.0, VM-LOCAL-GATES result, CI
  workflow extension, CLAUDE.md update, specs completion, TROUBLESHOOTING.md
  creation, and safety-reviewer scope audit.
- Blockers: renumbered and rewritten to reflect resolved BLK-01 (forge install),
  T-M1-04 status for Rovo UI, T-M2-03/T-M2-05 pending for issue types and
  workflow, T-M3 pending for Automation, and T-M4 pending for manual Rovo checks.
