#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd node

config_value() {
  node -e 'const { loadInstanceConfig } = require("./scripts/instance-config.cjs"); const config = loadInstanceConfig(); console.log(config[process.argv[1]] ?? "");' "$1"
}

PROJECT_KEY="$(config_value projectKey)"
SEED_LABEL="$(config_value seedLabel)"
MIN_SEED_COUNT="${AIGO_MIN_SEED_COUNT:-$(config_value minSeedCount)}"
IMPORT_SEED="${AIGO_IMPORT_SEED:-0}"
SEED_FILE="$(config_value renderedSeedFile)"

extract_count() {
  grep -Eo '[0-9]+' | tail -n 1
}

require_cmd acli
require_cmd forge

echo "Checking ACLI Jira auth..."
acli jira auth status

echo "Checking Forge auth..."
forge whoami >/dev/null

if [[ "${AIGO_CHECK_FORGE_INSTALL:-1}" == "1" ]]; then
  if grep -q 'ari:cloud:ecosystem::app/00000000-0000-0000-0000-000000000000' manifest.yml; then
    if [[ "${AIGO_REQUIRE_FORGE_INSTALL:-0}" == "1" ]]; then
      echo "Cannot check Forge installs while manifest.yml contains the placeholder app id." >&2
      echo "Run forge register, forge deploy, and forge install -p jira first." >&2
      exit 1
    fi
    echo "Skipping Forge install visibility check because manifest.yml still has the placeholder app id."
  else
    echo "Checking Forge installs visible to this account..."
    forge install list
  fi
fi

echo "Checking Jira project ${PROJECT_KEY}..."
acli jira project view --key "${PROJECT_KEY}" --json >/dev/null

count_output="$(acli jira workitem search --jql "project = ${PROJECT_KEY} AND labels = ${SEED_LABEL}" --count)"
seed_count="$(printf '%s\n' "${count_output}" | extract_count)"

if [[ -z "${seed_count}" ]]; then
  echo "Could not parse seed count from ACLI output:" >&2
  printf '%s\n' "${count_output}" >&2
  exit 1
fi

if (( seed_count < MIN_SEED_COUNT )) && [[ "${IMPORT_SEED}" == "1" ]]; then
  if [[ ! -f "${SEED_FILE}" ]]; then
    echo "Rendered seed file ${SEED_FILE} is missing; generating it..."
    node scripts/render-seed.cjs
  fi
  echo "Found ${seed_count} seeded issues; importing ${SEED_FILE}..."
  acli jira workitem create-bulk --from-csv "${SEED_FILE}" --yes
  count_output="$(acli jira workitem search --jql "project = ${PROJECT_KEY} AND labels = ${SEED_LABEL}" --count)"
  seed_count="$(printf '%s\n' "${count_output}" | extract_count)"
fi

if (( seed_count < MIN_SEED_COUNT )); then
  echo "Expected at least ${MIN_SEED_COUNT} issues with label ${SEED_LABEL}; found ${seed_count}." >&2
  echo "Set AIGO_IMPORT_SEED=1 to import ${SEED_FILE} before checking." >&2
  exit 1
fi

echo "Seeded Jira issues found: ${seed_count}"
acli jira workitem search \
  --jql "project = ${PROJECT_KEY} AND labels = ${SEED_LABEL} ORDER BY created DESC" \
  --fields "key,summary,status" \
  --limit 20 \
  --csv

echo "Live Jira smoke test passed."
