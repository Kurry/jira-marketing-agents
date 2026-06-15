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
