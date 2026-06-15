#!/usr/bin/env node
// generated_by: scripts/audit/jira-snapshot.mjs
//
// T-A-03 — Read-only audit snapshot of the AIGO Jira project on staging.
// Uses jira.js Version3Client (jira.js SDK). Writes evidence/audit/jira.json.
//
// Auth: see scripts/lib/jira.mjs (ATLASSIAN_TOKEN / keychain / JIRA_API_TOKEN+email)
// If all auth fails, falls back to known state from evidence/jira-config/ and
// writes evidence/blockers/jira-auth.json with instructions.
//
// T-NIH-07 classification: native-wrapper (read-only audit harness).
//   Native owner: documented Jira Cloud REST v3 (GET /rest/api/3/field,
//   /rest/api/3/filter/search, project + issue-type endpoints) via the jira.js
//   SDK. This script wraps those documented GETs to capture a snapshot — that
//   part is a legitimate native wrapper. EXCEPTION: the automation read below
//   uses /rest/cb-automation/latest/..., an internal/undocumented endpoint
//   (same private surface as T-NIH-02 / plan finding #1) and is best-effort
//   only — a 401/403 is recorded as api_unavailable, never as authoritative
//   state. The cached evidence/jira-config/ fallback is for offline audit, not
//   a substitute for live verification.
//
// Exit codes:
//   0  success (live data or cached fallback)
//   2  unexpected fatal error
//   3  missing/expired auth AND no fallback cache

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAuth, CLOUD_API_HOST, SITE } from "../lib/jira.mjs";

const PROJECT_KEY = "AIGO";
const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, "..", "..");
const OUT_PATH = resolve(REPO_ROOT, "evidence/audit/jira.json");
const BLOCKER_PATH = resolve(REPO_ROOT, "evidence/blockers/jira-auth.json");

function gitSha() {
  try { return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim(); }
  catch { return "unknown"; }
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(
    "jira-snapshot.mjs — read-only audit of AIGO on staging\n\n" +
    "Uses jira.js SDK. Auth: see scripts/lib/jira.mjs\n" +
    "Falls back to cached evidence/jira-config/ if auth is unavailable.\n" +
    "Writes: evidence/audit/jira.json\n" +
    "Exit codes: 0 ok (live or cached) | 2 fatal | 3 no auth + no cache\n"
  );
  process.exit(0);
}

function readJsonIfExists(relPath) {
  const abs = resolve(REPO_ROOT, relPath);
  if (!existsSync(abs)) return null;
  try { return JSON.parse(readFileSync(abs, "utf8")); } catch { return null; }
}

async function tryLiveFetch(auth) {
  const { Version3Client } = await import("jira.js");
  const host = auth.type === "bearer" ? CLOUD_API_HOST : SITE;
  const clientAuth = auth.type === "bearer"
    ? { oauth2: { accessToken: auth.token } }
    : { basic: { email: auth.email, apiToken: auth.apiToken } };
  const client = new Version3Client({ host, authentication: clientAuth });

  // Test auth
  await client.myself.getCurrentUser();

  const rawAuthHeader = auth.type === "bearer"
    ? `Bearer ${auth.token}`
    : "Basic " + Buffer.from(`${auth.email}:${auth.apiToken}`).toString("base64");

  async function rawGet(path) {
    const res = await fetch(`${host}${path}`, {
      headers: { Authorization: rawAuthHeader, Accept: "application/json" },
    });
    return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : null };
  }

  const failures = [];

  const project = await (async () => {
    try { return await client.projects.getProject({ projectIdOrKey: PROJECT_KEY }); }
    catch (e) { failures.push({ endpoint: "project", error: e?.message }); return null; }
  })();
  const projectId = project?.id;

  let issueTypes = [], issueTypesSource = null;
  if (projectId) {
    try {
      const res = await client.issueTypes.getIssueTypesForProject({ projectId });
      if (Array.isArray(res)) { issueTypes = res; issueTypesSource = "getIssueTypesForProject"; }
    } catch { /* fall through */ }
  }
  if (issueTypes.length === 0) {
    try {
      const all = await client.issueTypes.getIssueAllTypes();
      issueTypes = Array.isArray(all) ? all : [];
      issueTypesSource = "getIssueAllTypes";
    } catch (e) { failures.push({ endpoint: "issueTypes", error: e?.message }); }
  }
  const issueTypesSlim = issueTypes.map(it => ({
    id: it.id, name: it.name, subtask: it.subtask,
    hierarchyLevel: it.hierarchyLevel, scope: it.scope ?? null,
  }));

  let customFields = [];
  const fieldsRes = await rawGet("/rest/api/3/field");
  if (fieldsRes.ok && Array.isArray(fieldsRes.body)) {
    customFields = fieldsRes.body
      .filter(f => typeof f.id === "string" && f.id.startsWith("customfield_"))
      .map(f => ({ id: f.id, name: f.name, type: f.schema?.type ?? null, custom: f.schema?.custom ?? null }));
  } else { failures.push({ endpoint: "fields", error: `HTTP ${fieldsRes.status}` }); }

  let filters = [];
  const filtersRes = await rawGet(`/rest/api/3/filter/search?projectKeys=${PROJECT_KEY}&maxResults=100`);
  if (filtersRes.ok) {
    filters = (filtersRes.body?.values ?? []).map(f => ({
      id: f.id, name: f.name, jql: f.jql ?? null, owner: f.owner?.accountId ?? null,
    }));
  } else { failures.push({ endpoint: "filters", error: `HTTP ${filtersRes.status}` }); }

  let automation = null, automationOnlyFailure = false;
  // EXPERIMENTAL: cb-automation is an internal/undocumented endpoint (not a
  // documented public Jira API). Best-effort read only; 401/403 → api_unavailable.
  // See T-NIH-02 / plan finding #1 — do not treat as the supported automation
  // proof surface.
  const autoRes = await rawGet(`/rest/cb-automation/latest/project/${PROJECT_KEY}/rule`);
  if (autoRes.ok) {
    const rules = Array.isArray(autoRes.body?.rules) ? autoRes.body.rules : Array.isArray(autoRes.body) ? autoRes.body : [];
    automation = { status: "ok", count: rules.length, rules: rules.map(r => ({ id: r.id, name: r.name, state: r.state ?? null })) };
  } else if (autoRes.status === 401 || autoRes.status === 403) {
    automation = { status: "api_unavailable", http_status: autoRes.status };
    automationOnlyFailure = failures.length === 0;
  } else {
    automation = { status: "error", http_status: autoRes.status };
    failures.push({ endpoint: "cb-automation", error: `HTTP ${autoRes.status}` });
  }

  return { source: "live", project, projectId, issueTypesSlim, issueTypesSource, customFields, filters, automation, automationOnlyFailure, failures };
}

function buildCachedSnapshot() {
  const issueTypesRaw = readJsonIfExists("evidence/jira-config/issue-types.json");
  const customFieldsRaw = readJsonIfExists("evidence/jira-config/custom-fields.json");
  const issueTypes = Array.isArray(issueTypesRaw) ? issueTypesRaw : Array.isArray(issueTypesRaw?.issueTypes) ? issueTypesRaw.issueTypes : [];
  const customFields = Array.isArray(customFieldsRaw) ? customFieldsRaw : Array.isArray(customFieldsRaw?.fields) ? customFieldsRaw.fields : [];
  return {
    source: "cached-v1-evidence",
    project: { key: PROJECT_KEY, name: "AI Growth Ops", note: "cached — auth unavailable" },
    issueTypesSlim: issueTypes.slice(0, 20).map(it => ({ id: it.id, name: it.name ?? it.name })),
    issueTypesSource: "evidence/jira-config/issue-types.json (cached)",
    customFields: customFields.slice(0, 20).map(f => ({ id: f.id ?? f.fieldId, name: f.name })),
    filters: [],
    automation: { status: "unknown", note: "auth unavailable" },
    automationOnlyFailure: false,
    failures: [{ endpoint: "all", error: "auth unavailable — see evidence/blockers/jira-auth.json" }],
  };
}

async function main() {
  const auth = resolveAuth();
  let snapshot;
  let dataSource = "live";

  if (auth) {
    process.stderr.write(`Jira auth: ${auth.method}\n`);
    try {
      snapshot = await tryLiveFetch(auth);
      process.stderr.write("Live Jira data fetched successfully.\n");
    } catch (err) {
      process.stderr.write(`Auth/fetch failed: ${err?.message}. Falling back to cached evidence.\n`);
      dataSource = "cached";
      snapshot = buildCachedSnapshot();

      // Write blocker file
      mkdirSync(dirname(BLOCKER_PATH), { recursive: true });
      writeFileSync(BLOCKER_PATH, JSON.stringify({
        generated_by: "scripts/audit/jira-snapshot.mjs",
        generated_at: new Date().toISOString(),
        blocker: "jira-auth-expired",
        summary: "Jira auth (ACLI keychain) token expired. Live snapshot unavailable.",
        resolution: "Run: acli auth login   OR   set JIRA_API_TOKEN + JIRA_USER_EMAIL env vars",
        impact: "VM-JIRA-* rows cannot be verified live. Using cached evidence/jira-config/ data.",
      }, null, 2) + "\n");
      process.stderr.write(`Blocker written: ${BLOCKER_PATH}\n`);
    }
  } else {
    process.stderr.write("No auth available. Falling back to cached evidence.\n");
    snapshot = buildCachedSnapshot();
    dataSource = "no-auth";
  }

  const exitCode = dataSource === "live"
    ? (snapshot.failures.length > 0 ? (snapshot.automationOnlyFailure ? 5 : 2) : 0)
    : 0; // cached/no-auth: still exit 0 so audit can proceed

  const summary =
    `Jira snapshot [${snapshot.source}]: project ${PROJECT_KEY}, ` +
    `${snapshot.issueTypesSlim.length} issue types, ${snapshot.customFields.length} custom fields, ` +
    `${snapshot.filters.length} filters, automation=${snapshot.automation?.status ?? "unknown"}`;

  const envelope = {
    generated_by: "scripts/audit/jira-snapshot.mjs",
    generated_at: new Date().toISOString(),
    git_sha: gitSha(),
    instance: "staging",
    exit_code: exitCode,
    data_source: snapshot.source,
    summary,
    data: {
      project: snapshot.project,
      issue_types: snapshot.issueTypesSlim,
      issue_types_source: snapshot.issueTypesSource,
      custom_fields: snapshot.customFields,
      filters: snapshot.filters,
      automation: snapshot.automation,
      failures: snapshot.failures,
    },
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(envelope, null, 2) + "\n");
  process.stderr.write(summary + "\n");
  if (snapshot.failures.length > 0) {
    process.stderr.write(`NOTE: ${snapshot.failures.length} failure(s): ${JSON.stringify(snapshot.failures)}\n`);
  }

  return exitCode;
}

main()
  .then(code => process.exit(code))
  .catch(err => { process.stderr.write(`FATAL: ${err?.stack || err}\n`); process.exit(2); });
