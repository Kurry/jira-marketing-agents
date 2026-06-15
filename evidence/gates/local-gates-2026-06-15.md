# VM-LOCAL-GATES — 2026-06-15T09:20Z

**Result: PASS — all gates green**

## Commands run (from repo root)

| Command | Exit | Notes |
|---|---|---|
| `npm ci` | 0 | 0 vulnerabilities |
| `npm run build` | 0 | tsc --noEmit clean, 0 TS errors |
| `npm test` | 0 | 450 tests, 41 files |
| `npm run test:integration` | 0 | 77 tests, 7 files |
| `npx forge lint` | 0 | 1 intentional warning (addAnalysisComment standalone action) |

## Test counts

- Unit tests: **450 passing** (41 files)
- Integration tests: **77 passing** (7 files) — handlers, manifest, portable-provisioning, provision-mock (Suites 1–9)
- Total: **527 assertions across 48 test files**

## forge lint note

The single `forge lint` warning (`addAnalysisComment` not referenced by any
Rovo agent) is intentional: `addAnalysisComment` is a standalone operator
action callable via Jira Automation, not wired to a specific Rovo agent.
Per `VERIFICATION_MATRIX.md`, this warning is the only acceptable one.

## IaC dry-run checks (also passing)

```
node scripts/provision-dashboards.cjs --dry-run              → exit 0
node scripts/forge-import-automation.cjs --config ... --dry-run → exit 0
node scripts/provision-seeds.cjs --dry-run --config ...      → exit 0
node scripts/provision-automation.cjs --dry-run --config ... → exit 0
npm run provision:jira:dry                                   → exit 0
npm run seed:render                                          → exit 0
```

## Commit at time of run

`109b933` — ci: add dry-run gates for provision-dashboards + forge-import-automation
