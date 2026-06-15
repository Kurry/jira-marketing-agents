// scripts/lib/jira.mjs — shared Jira client using jira.js SDK
//
// Auth resolution order:
//   1. ATLASSIAN_TOKEN env var  →  OAuth2 Bearer  →  api.atlassian.com/ex/jira/<cloudId>
//   2. macOS keychain (acli)    →  OAuth2 Bearer  →  api.atlassian.com/ex/jira/<cloudId>
//   3. JIRA_API_TOKEN + JIRA_USER_EMAIL env vars  →  Basic auth  →  <site>.atlassian.net
//
// Bearer tokens (ACLI OAuth2) must use the cloud-ID API endpoint.
// Basic auth (email + API token) uses the site URL directly.
// Exit code 3 if no auth is resolvable.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Version3Client } from "jira.js";

const SITE = "https://myhealthcaresite.atlassian.net";
const CLOUD_ID = "76683cc1-6501-400f-8b59-01eaad4418d2"; // from instances/aigo.example.json
const CLOUD_API_HOST = `https://api.atlassian.com/ex/jira/${CLOUD_ID}`;

/**
 * Resolve Atlassian auth credentials from env vars or macOS keychain.
 * Returns { type: 'bearer', token } or { type: 'basic', email, apiToken }
 * or null if nothing is available.
 */
export function resolveAuth() {
  // 1. Bearer token via env var
  const envToken = process.env.ATLASSIAN_TOKEN;
  if (envToken) return { type: "bearer", token: envToken.trim(), method: "ATLASSIAN_TOKEN" };

  // 2. macOS keychain via acli stored credential
  if (process.platform === "darwin") {
    try {
      const raw = execSync(
        "security find-generic-password -l \"acli\" -w 2>&1 | " +
        "sed 's/^go-keyring-base64://' | base64 -d | gunzip | " +
        "python3 -c \"import sys,json; d=json.load(sys.stdin); print(d['access_token'])\"",
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (raw) return { type: "bearer", token: raw, method: "keychain-acli" };
    } catch { /* fall through */ }
  }

  // 3. Basic auth via env vars
  const apiToken = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_USER_EMAIL;
  if (apiToken && email) return { type: "basic", email, apiToken, method: "env-basic" };

  return null;
}

/**
 * Create a jira.js Version3Client for the staging site.
 * Throws with exit code 3 if no auth is available.
 */
export function createClient() {
  const auth = resolveAuth();
  if (!auth) {
    const msg =
      "ERROR: no Jira auth available.\n" +
      "  Set ATLASSIAN_TOKEN (Bearer), or\n" +
      "  JIRA_API_TOKEN + JIRA_USER_EMAIL (Basic auth), or\n" +
      "  log in via `acli` on macOS.\n";
    process.stderr.write(msg);
    process.exit(3);
  }

  process.stderr.write(`Jira auth: ${auth.method}\n`);

  if (auth.type === "bearer") {
    // Bearer (OAuth2/ACLI) tokens must use the cloud-ID API host
    return new Version3Client({
      host: CLOUD_API_HOST,
      authentication: { oauth2: { accessToken: auth.token } },
    });
  }

  // Basic auth works with the site URL directly
  return new Version3Client({
    host: SITE,
    authentication: { basic: { email: auth.email, apiToken: auth.apiToken } },
  });
}

export { SITE, CLOUD_ID, CLOUD_API_HOST };
