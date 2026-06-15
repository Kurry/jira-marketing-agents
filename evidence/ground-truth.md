# Ground Truth — Environment Capture (T-M0-01)

_Original capture: 2026-06-15T03:41Z by prior session (Cowork sandbox — BLK-01)._
_Updated: 2026-06-15T00:44Z — operator macOS machine session. BLK-01 RESOLVED._

## Current execution environment (operator macOS machine)

| Tool | MISSION.md assumption | Actual | Status |
| ---- | --------------------- | ------ | ------ |
| `node` | 22.x or 24.x | **v26.0.0** | ⚠ Functional; forge warns unsupported (risk R-01) |
| `npm` | present | 10.9.x | OK |
| `git` | present | branch `main`, 1 commit ahead of origin | OK |
| `forge` | installed + `forge login` active | **12.22.0 · logged in as Kurry Tran** | ✓ |
| `acli`/`jira` CLI | installed | not verified yet | TBD T-M2-03 |
| `gh` | optional | not verified | TBD |

## Forge identity

- **User:** Kurry Tran (kurry.tran@gmail.com)
- **Account ID:** 557058:297f331c-0582-4201-8db9-72c7ec72bf14
- **Forge app ID:** `ari:cloud:ecosystem::app/d1baf70e-b5ad-4fe7-812b-7dc20c7eb154`

## Forge install list (captured 2026-06-15T00:44Z)

| Installation ID | Environment | Site | App | Version | Status |
| --------------- | ----------- | ---- | --- | ------- | ------ |
| 7e844a39-2e55-418f-93ad-7ae4dc8d9695 | development | myhealthcaresite.atlassian.net | Jira | 2 | Up-to-date |

## AIGO project (from MISSION.md / MVP_READINESS.md)

- **Project key:** AIGO
- **Project name:** AI Growth Ops
- **Site:** myhealthcaresite.atlassian.net
- **Seed issues:** 15 issues with label `aigo-seed` (verified in prior MVP_READINESS)
- **Observed seed issue types:** Workstream, Task, Sub-task (NOT the canonical 14 types yet)
- **Observed statuses:** To Do, In Progress, Done (NOT the 12 MVP workflow statuses yet)

## Manifest state

- **Path:** manifest.yml (18.5 KB)
- **Rovo agents declared:** 19
- **Actions declared:** 22
- **Scopes:** `read:jira-work`, `write:jira-work`, `read:chat:rovo`
- **App version in install:** 2

## Repo state (2026-06-15T00:44Z)

- Branch: `main`, 1 commit ahead of `origin/main`
- Untracked: `.claude/`, `CLAUDE.md`, `STATUS.md`, `evidence/` (all from first session + this tick)
- No modified tracked files

## Local quality gates (this session)

| Gate | Result |
| ---- | ------ |
| `npm ci` | ✓ EXIT 0 |
| `npm run build` | ✓ EXIT 0 |
| `npm test` | ✓ 112 tests pass |
| `npm run test:integration` | ✓ 10 tests pass |
| `forge lint` | ✓ EXIT 0 · 1 expected warning |

Full log: `evidence/gates/local-2026-06-15T0044Z.log`

## Known risks

- **R-01:** Node v26.0.0 — Forge CLI says "unsupported" (22.x / 24.x). Forge commands work but may break on future forge CLI updates. Low immediate risk; noted for operator.
- **R-02:** `acli` not yet verified — required for T-M2-07 seed re-import.
- **R-03:** Rovo UI visibility (VM-ROVO-VISIBILITY) requires human confirmation in browser; CLI alone cannot prove all 19 agents visible.

## BLK-01 — RESOLVED

Prior session blocker (forge not installed in Cowork sandbox) does not apply
on the operator's macOS machine. forge 12.22.0 is authenticated and functional.
See updated `evidence/blockers.md`.

T-M0-06: CLAUDE.md updated 2026-06-15T03:53Z
T-M2-01: specs/issue-types.md created 2026-06-15T03:55Z
T-M2-02: specs/custom-fields.md created 2026-06-15T03:55Z
T-M2-06: specs/workflows.md created 2026-06-15T03:55Z
