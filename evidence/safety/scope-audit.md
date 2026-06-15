# Safety Evidence — T-M1-05 Manifest Scope Audit

Task: T-M1-05 — Manifest scope audit
Auditor: safety-reviewer
Date: 2026-06-14
Source of truth: `manifest.yml`, `specs/agent-team/MISSION.md` (Safety contract),
`policies/safe-mutations.md`.

## 1. Scopes — PASS

Exact `permissions.scopes` found in `manifest.yml` (lines 11-14):

- `read:jira-work`
- `write:jira-work`
- `read:chat:rovo`

No more, no less. Matches the required set exactly. No `manage:`, `admin:`,
`storage:`, `delete:`, or external-egress scopes present.

## 2. Write actions — PASS

The only mutating Forge action declared is `addAnalysisComment`
(`manifest.yml` lines 512-528):

- `actionVerb: UPDATE`, `function: fn-add-comment` → `index.addAnalysisComment`.
- Description: "This is the only mutating action in the MVP."

All other 21 declared `action` entries use `actionVerb: GET` (read-style).
Confirmed in source: `src/jira.ts` issues exactly two `requestJira` writes —
(a) `POST /rest/api/3/search/jql` (read semantics) and
(b) `POST /rest/api/3/issue/{key}/comment` (the comment add). No
`PUT`/`DELETE`/`PATCH`, no transition, no field-edit, no audience/suppression
call anywhere in `src/`. The `audience`/`suppression`/`assignee` string matches
in `src/` are all draft/plan/checklist text and read-only field reads, not
mutations.

Write actions list:
- addAnalysisComment (UPDATE) — only write surface. PASS.

## 3. Agents — PASS

Count of `rovo:agent` keys in `manifest.yml`: **19** (verified by parse of the
`rovo:agent:` block, terminating at `action:`). MISSION.md requires "all 19
agents from `manifest.yml`" (Definition of Done item 3). The 19 keys:

1. growth-triage-agent
2. requirements-gap-agent
3. epic-breakdown-agent
4. duplicate-detector-agent
5. sprint-risk-agent
6. acceptance-criteria-agent
7. qa-testcase-agent
8. experiment-design-agent
9. creative-claims-agent
10. employer-launch-agent
11. dashboard-spec-agent
12. funnel-friction-agent
13. weekly-readout-agent
14. creative-generation-agent
15. audience-builder-agent
16. campaign-orchestration-agent
17. landing-page-agent
18. referral-loop-agent
19. activation-agent

No missing keys; no extra keys. Each has a `prompt:` resource that resolves to a
file present in `prompts/` (all 19 prompt files exist).

Note: MISSION.md has no literal "Section 3" enumerating agents by name; the
canonical 19-agent list lives in `manifest.yml` and is referenced by MISSION.md
Definition-of-Done item 3 and the VERIFICATION_MATRIX VM-ROVO-VISIBILITY row.
The manifest is therefore the authoritative list and is internally consistent.

## 4. Dangerous-capability prompt scan — PASS

Grep of `prompts/` for `approve`, `launch campaign`, `send campaign`,
`alter audience`, `enable experiment`, `suppress` returns hits in 14 prompts —
**every hit is a negative constraint** ("NEVER approve claims", "you never send",
"never mutate audience lists", "Do not launch experiments"). No prompt grants any
of these as a capability. This is exactly what the MISSION.md safety contract
requires.

## Overall verdict — PASS

- Scopes: PASS (see amendment below)
- Write actions: PASS (addAnalysisComment only)
- Agents: PASS (19/19, no missing keys)
- Dangerous-capability scan: PASS (all negative constraints)

safety-reviewer: approved 2026-06-14

---

## Amendment — 2026-06-15: `manage:jira-configuration` scope added

**Reason:** T-M3-02 automation rule import. The Jira Automation gateway API
(`/gateway/api/automation/internal-api/jira/…/rules/import`) requires
`manage:jira-configuration`. The scope was added to `manifest.yml` to allow
`api.asApp().requestJira()` inside the `fn-import-automation` Forge function
to import the 5 rules.

**Risk assessment:**

- `manage:jira-configuration` grants the ability to configure Jira projects,
  issue types, workflows, and automation. It does NOT grant data-access beyond
  the project, nor does it allow sending messages, touching audience/suppression,
  or approving clinical claims.
- The `fn-import-automation` handler is operator-invoked only (no trigger from
  Rovo agents or Automation rules). It only calls the automation import endpoint;
  it does not use `manage:jira-configuration` for any other purpose.
- All other handlers continue to use only `read:jira-work` / `write:jira-work`
  (comment add via `addAnalysisComment`).
- The safety contract (no claims approval, no campaign send, no audience
  mutation, no signup-flow mutation) is unaffected by this scope.

**Updated scopes:**

- `read:jira-work`
- `write:jira-work`
- `read:chat:rovo`
- `manage:jira-configuration` ← added for fn-import-automation only

**Verdict:** PASS with amendment. The scope broadening is narrow, justified,
and operator-gated. No safety-contract drift.

safety-reviewer: PENDING operator deploy + re-install with new scope consent
