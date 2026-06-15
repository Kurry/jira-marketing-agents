#!/usr/bin/env node
// generated_by: scripts/verify/automation-audit.mjs (T-R-P5)
// Row VM-AUTOMATION-AUDIT. Fetches live automation rules for AIGO and asserts
// every rule declared under infra/jira/automation/*.yaml is present, and that
// each is DISABLED until a green audit-log capture flips it on.
//
// The cb-automation REST endpoint is not always reachable with the available
// token (returns 401/403). When the API is unavailable this row reports
// `unsupported` with a blocker file path rather than failing the whole verify
// run — see evidence/blockers/automation-api.json.
//
// T-NIH-07 classification: documented-API-gap.
//   Native owner (matrix row "Automation import"): native Jira Automation
//   UI export/import, or a documented public Automation API if one exists.
//   This row reads native automation state, but does so via
//   /rest/cb-automation/latest/... which is an INTERNAL / undocumented endpoint
//   (the same private surface flagged by plan finding #1 and T-NIH-02). It is
//   therefore EXPERIMENTAL and must not be the long-term portability foundation:
//   if Atlassian exposes no public read API, the supported proof is the native
//   audit-log export, and this row degrades to `unsupported` with the blocker
//   rather than becoming the authoritative check.

import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient, CLOUD_API_HOST, resolveAuth } from '../lib/jira.mjs';
import { loadInfraYaml, finish, guard, repoPath, REPO_ROOT } from '../lib/verify.mjs';
import { wantsHelp } from '../lib/staging.mjs';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED_BY = 'scripts/verify/automation-audit.mjs';
const ROW = 'VM-AUTOMATION-AUDIT';
const EVIDENCE = 'evidence/verify/automation-audit.json';
const BLOCKER = 'evidence/blockers/automation-api.json';
const PROJECT_KEY = 'AIGO';
const PROJECT_ID = '10000';

if (wantsHelp()) {
  console.log(`${GENERATED_BY}: assert every infra/jira/automation/*.yaml rule exists live and ` +
    `is DISABLED until audited. exit 0 green / 2 red / 3 no-auth / 5 unsupported(api)`);
  process.exit(0);
}

function loadDeclaredRules() {
  const dir = repoPath('infra/jira/automation');
  if (!existsSync(dir)) return { error: 'infra/jira/automation/ missing', rules: [] };
  const rules = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.yaml') || n.endsWith('.yml'))) {
    const data = parseYaml(readFileSync(join(dir, f), 'utf8'));
    rules.push({
      key: data.key,
      name: data.name,
      enabledByDefault: Boolean(data.enabledByDefault),
      file: `infra/jira/automation/${f}`,
    });
  }
  return { error: null, rules };
}

function writeBlocker(httpStatus, message) {
  const abs = repoPath(BLOCKER);
  mkdirSync(join(REPO_ROOT, 'evidence/blockers'), { recursive: true });
  writeFileSync(abs, JSON.stringify({
    generated_by: GENERATED_BY,
    generated_at: new Date().toISOString(),
    row: ROW,
    reason: 'cb-automation REST API unavailable with current token',
    http_status: httpStatus,
    message,
    candidate_resolution: 'jira:read:automation scope / PAT, or capture via audit-log UI export script',
  }, null, 2) + '\n');
}

guard(GENERATED_BY, ROW, async () => {
  const declared = loadDeclaredRules();
  if (declared.error) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: declared.error, data: { error: declared.error }, evidencePath: EVIDENCE });
    return;
  }

  // The jira.js client doesn't cover cb-automation; call it directly with the
  // resolved auth, reusing the same host the client would use.
  const auth = resolveAuth();
  if (!auth) {
    process.stderr.write('ERROR: no Jira auth available.\n');
    process.exit(3);
  }
  const headers = { Accept: 'application/json' };
  let host;
  if (auth.type === 'bearer') {
    headers.Authorization = `Bearer ${auth.token}`;
    host = CLOUD_API_HOST;
  } else {
    headers.Authorization = 'Basic ' + Buffer.from(`${auth.email}:${auth.apiToken}`).toString('base64');
    host = 'https://myhealthcaresite.atlassian.net';
  }

  // EXPERIMENTAL: /rest/cb-automation/latest/... is an internal/undocumented
  // Atlassian endpoint, not a documented public API. Treated as a non-default,
  // best-effort read; a 401/403 degrades this row to `unsupported` + blocker
  // rather than asserting drift. Do not promote this path to the supported
  // portability foundation (see T-NIH-02 / plan finding #1).
  const url = `${host}/rest/cb-automation/latest/project/${PROJECT_ID}/rule`;
  const res = await fetch(url, { headers });

  if (res.status === 401 || res.status === 403) {
    writeBlocker(res.status, await res.text().catch(() => ''));
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'unsupported',
      summary: `${ROW}: cb-automation API unavailable (${res.status}) — blocked, not failed`,
      blocker: BLOCKER,
      data: { http_status: res.status, declared_count: declared.rules.length },
      evidencePath: EVIDENCE });
    return;
  }
  if (!res.ok) {
    finish({ generatedBy: GENERATED_BY, row: ROW, status: 'red',
      summary: `${ROW}: cb-automation API error ${res.status}`,
      data: { http_status: res.status }, evidencePath: EVIDENCE });
    return;
  }

  const body = await res.json();
  const liveRules = Array.isArray(body.rules) ? body.rules : Array.isArray(body) ? body : [];
  const liveByName = new Map(liveRules.map((r) => [r.name, r]));

  const missing = declared.rules.filter((r) => !liveByName.has(r.name));
  // Any rule that is live AND enabled but should be disabled-until-audited.
  const wronglyEnabled = declared.rules
    .filter((r) => !r.enabledByDefault && liveByName.get(r.name))
    .filter((r) => {
      const live = liveByName.get(r.name);
      return live.state === 'ENABLED' || live.enabled === true;
    })
    .map((r) => r.name);

  const status = missing.length === 0 && wronglyEnabled.length === 0 ? 'green' : 'red';
  const summary =
    `${ROW}: ${declared.rules.length} declared, ${liveRules.length} live; ` +
    `${missing.length} missing, ${wronglyEnabled.length} wrongly-enabled`;

  finish({ generatedBy: GENERATED_BY, row: ROW, status, summary,
    data: {
      declared: declared.rules.map((r) => r.name),
      live: liveRules.map((r) => r.name),
      missing: missing.map((r) => r.name),
      wrongly_enabled: wronglyEnabled,
    },
    evidencePath: EVIDENCE });
});
