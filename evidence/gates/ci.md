# CI Workflow Extension — T-M0-04

**Date:** 2026-06-14
**Author:** forge-engineer

## What Was Added

The `.github/workflows/ci.yml` workflow was extended with three new steps after the existing unit test step:

### 1. Integration Tests
```yaml
- name: Run integration tests
  run: npm run test:integration
```
Runs `vitest run tests/integration` to exercise all integration-level test suites.

### 2. Automation JSON Schema Validation
```yaml
- name: Validate automation JSON schemas
  run: |
    for f in automation/rules/*.json; do
      node -e "JSON.parse(require('fs').readFileSync('$f', 'utf8')); console.log('OK: $f')"
    done
```
Iterates over every file in `automation/rules/*.json` and parses it with Node's `JSON.parse`, failing the CI step if any file is malformed JSON.

### 3. Seed Render Smoke Check
```yaml
- name: Render seed (smoke check)
  env:
    AIGO_INSTANCE_CONFIG: instances/aigo.example.json
  run: npm run seed:render
```
Runs `node scripts/render-seed.cjs` with `AIGO_INSTANCE_CONFIG` pointing at the example instance config. Output is not committed; this is a smoke check only.

## What Was Not Changed

- `forge-lint.yml` was left as-is (it already has `continue-on-error: true`).
- Node matrix (20.x, 22.x), concurrency group, and permissions are unchanged.

## CI Trigger

The extended CI will run on the next push to `main` or any `claude/**` branch, and on pull requests targeting `main`.

---

## VM-CI-GREEN — Real CI Run Evidence (2026-06-15)

**Run ID:** 27521370688
**Workflow:** CI
**Branch:** main
**Trigger:** push ("Document AI Growth Ops outcome roadmap")
**Status:** success
**Run URL:** https://github.com/Kurry/jira-marketing-agents/actions/runs/27521370688

### `gh run view 27521370688` output

```
✓ main CI · 27521370688
Triggered via push about 5 hours ago

JOBS
✓ Build & Test (20.x) in 16s (ID 81339813212)
✓ Build & Test (22.x) in 14s (ID 81339813222)

ANNOTATIONS
! Node.js 20 actions are deprecated. The following actions are running on Node.js 20
  and may not work as expected: actions/checkout@v4, actions/setup-node@v4.
  Actions will be forced to run with Node.js 24 by default starting June 16th, 2026.

View this run on GitHub: https://github.com/Kurry/jira-marketing-agents/actions/runs/27521370688
```

Both matrix jobs (Node 20.x and 22.x) passed green. Node.js 20 deprecation warning
is informational only and does not affect test results.

Latest Forge Lint run: 27521370692 — completed success (33s) on same commit.
