#!/usr/bin/env node
// generated_by: scripts/audit/jira-snapshot.mjs
//
// T-A-03 — Read-only audit snapshot of the AIGO Jira project on staging.
// Calls Jira REST v3 endpoints, writes evidence/audit/jira.json.
//
// Auth: env vars JIRA_API_TOKEN + JIRA_USER_EMAIL (Basic auth).
// Staging only: https://myhealthcaresite.atlassian.net
//
// Exit codes:
//   0  success
//   2  unexpected fatal error / a required endpoint failed
//   3  missing auth env vars
//   5  only failure was the automation API being unavailable (401/403)

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://myhealthcaresite.atlassian.net";
const PROJECT_KEY = "AIGO";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const OUT_PATH = resolve(REPO_ROOT, "evidence/audit/jira.json");

function printHelp() {
  process.stdout.write(
    `jira-snapshot.mjs — read-only audit of the ${PROJECT_KEY} Jira project on staging\n\n` +
      `Usage: node scripts/audit/jira-snapshot.mjs [--help]\n\n` +
      `Requires env vars:\n` +
      `  JIRA_API_TOKEN   Atlassian API token\n` +
      `  JIRA_USER_EMAIL  Atlassian account email (for Basic auth)\n\n` +
      `Target: ${BASE_URL} (staging only)\n` +
      `Writes: evidence/audit/jira.json\n` +
      `Exit codes: 0 ok | 2 fatal | 3 missing auth | 5 only automation API unavailable\n`,
  );
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return "unknown";
  }
}

function authHeader(email, token) {
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

async function jiraGet(path, auth) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return 0;
  }

  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_USER_EMAIL;
  if (!token || !email) {
    process.stderr.write(
      "ERROR: missing auth. Set JIRA_API_TOKEN and JIRA_USER_EMAIL env vars.\n",
    );
    return 3;
  }

  const auth = authHeader(email, token);
  const failures = [];

  // 1. verify auth
  const myself = await jiraGet("/rest/api/3/myself", auth);
  if (!myself.ok) {
    process.stderr.write(
      `ERROR: auth check failed (GET /myself → ${myself.status}). ` +
        `Check JIRA_API_TOKEN / JIRA_USER_EMAIL.\n`,
    );
    return myself.status === 401 || myself.status === 403 ? 3 : 2;
  }

  // 2. project details
  const projectRes = await jiraGet(`/rest/api/3/project/${PROJECT_KEY}`, auth);
  if (!projectRes.ok) {
    failures.push({ endpoint: `project/${PROJECT_KEY}`, status: projectRes.status });
  }
  const project = projectRes.ok ? projectRes.body : null;
  const projectId = project?.id;

  // 3. issue types — full list, then narrow to ones scoped to AIGO when possible
  const issueTypesRes = await jiraGet("/rest/api/3/issuetype", auth);
  if (!issueTypesRes.ok) {
    failures.push({ endpoint: "issuetype", status: issueTypesRes.status });
  }
  let issueTypes = issueTypesRes.ok ? issueTypesRes.body : [];
  if (Array.isArray(issueTypes) && projectId) {
    const scoped = issueTypes.filter(
      (it) => !it.scope || it.scope?.project?.id === projectId,
    );
    // keep scoped list only if filtering didn't drop everything
    if (scoped.length > 0) issueTypes = scoped;
  }
  const issueTypesSlim = (Array.isArray(issueTypes) ? issueTypes : []).map((it) => ({
    id: it.id,
    name: it.name,
    subtask: it.subtask,
    hierarchyLevel: it.hierarchyLevel,
    scope: it.scope ?? null,
  }));

  // 4. custom fields (customfield_ prefix only)
  const fieldsRes = await jiraGet("/rest/api/3/field", auth);
  if (!fieldsRes.ok) {
    failures.push({ endpoint: "field", status: fieldsRes.status });
  }
  const allFields = Array.isArray(fieldsRes.body) ? fieldsRes.body : [];
  const customFields = allFields
    .filter((f) => typeof f.id === "string" && f.id.startsWith("customfield_"))
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.schema?.type ?? null,
      custom: f.schema?.custom ?? null,
    }));

  // 5. saved filters for AIGO
  const filtersRes = await jiraGet(
    `/rest/api/3/filter/search?filterName=&projectKeys=${PROJECT_KEY}&maxResults=100`,
    auth,
  );
  if (!filtersRes.ok) {
    failures.push({ endpoint: "filter/search", status: filtersRes.status });
  }
  const filterValues = filtersRes.ok ? filtersRes.body?.values ?? [] : [];
  const filters = filterValues.map((f) => ({
    id: f.id,
    name: f.name,
    jql: f.jql ?? null,
    owner: f.owner?.accountId ?? null,
  }));

  // 6. automation rules — may be unavailable (401/403)
  let automation;
  const autoRes = await jiraGet(
    `/rest/cb-automation/latest/project/${PROJECT_KEY}/rule`,
    auth,
  );
  let automationOnlyFailure = false;
  if (autoRes.ok) {
    const rules = Array.isArray(autoRes.body?.rules)
      ? autoRes.body.rules
      : Array.isArray(autoRes.body)
        ? autoRes.body
        : [];
    automation = {
      status: "ok",
      count: rules.length,
      rules: rules.map((r) => ({ id: r.id, name: r.name, state: r.state ?? null })),
    };
  } else if (autoRes.status === 401 || autoRes.status === 403) {
    automation = { status: "api_unavailable", http_status: autoRes.status };
    automationOnlyFailure = failures.length === 0;
  } else {
    automation = { status: "error", http_status: autoRes.status };
    failures.push({ endpoint: "cb-automation/rule", status: autoRes.status });
  }

  const exitCode = failures.length > 0 ? 2 : automationOnlyFailure ? 5 : 0;

  const summary =
    `Jira staging snapshot: project ${PROJECT_KEY}, ` +
    `${issueTypesSlim.length} issue types, ` +
    `${customFields.length} custom fields, ` +
    `${filters.length} filters, automation=${automation.status}`;

  const envelope = {
    generated_by: "scripts/audit/jira-snapshot.mjs",
    generated_at: new Date().toISOString(),
    git_sha: gitSha(),
    instance: "staging",
    exit_code: exitCode,
    summary,
    data: {
      myself: { accountId: myself.body?.accountId, displayName: myself.body?.displayName },
      project: project
        ? {
            id: project.id,
            key: project.key,
            name: project.name,
            projectTypeKey: project.projectTypeKey,
            lead: project.lead?.accountId ?? null,
          }
        : null,
      issue_types: issueTypesSlim,
      custom_fields: customFields,
      filters,
      automation,
      failures,
    },
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(envelope, null, 2) + "\n");

  process.stderr.write(summary + "\n");
  if (failures.length > 0) {
    process.stderr.write(`WARNING: ${failures.length} endpoint failure(s): ` +
      JSON.stringify(failures) + "\n");
  }
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`FATAL: ${err?.stack || err}\n`);
    process.exit(2);
  });
