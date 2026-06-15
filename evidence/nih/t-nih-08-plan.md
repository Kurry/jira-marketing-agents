# T-NIH-08 Implementation Plan — Purge internal/private endpoints + keychain auth

Date: 2026-06-15
Status: **PROPOSAL — GATED. No code written.** Awaiting lead-approved plan +
safety-reviewer sign-off before implementation (per
[_CONVENTIONS.md](../../specs/v2/_CONVENTIONS.md) §5).
Author: native-architect.
Supersedes: (new)

Reads: [nih-roadmap.md](../../specs/v2/nih-roadmap.md) (T-NIH-08 entry, evidence
index), [refactor-plan.md](../../specs/v2/refactor-plan.md) (§A.1, §A.3),
[_CONVENTIONS.md](../../specs/v2/_CONVENTIONS.md) (§5 safety, §7 tooling).

## Objective

Remove every internal/private Atlassian endpoint
(`gateway/api/automation/internal-api`, `rest/cb-automation`) and the
reverse-engineered macOS-keychain auth (`security find-generic-password` →
`go-keyring-base64` → gunzip → JSON `access_token`) from **all supported code
paths**. Replace with the two documented auth modes and native Automation
import/export. Residual internal usage is permitted only if it is non-default,
`--experimental`-guarded, blocker-tagged, and never reachable by the supported
reconcile loop.

## Tooling provenance (per §7)

- Skills: `skills/jira-cloud-rest`, `skills/jira-acli`,
  `skills/rovo-studio-agents`, `skills/jira-automation-rovo-setup`.
- ctx7 verified (this session): `ctx7 library "jira.js"` →
  `/mrrefactoring/jira.js`; `ctx7 docs /mrrefactoring/jira.js "authentication
  options"`. Confirmed jira.js exposes exactly two auth configs used here:
  - `authentication.basic = { email, apiToken }` (API token from
    id.atlassian.com), host `https://<site>.atlassian.net`.
  - `authentication.oauth2 = { accessToken }` (Bearer), host
    `https://api.atlassian.com/ex/jira/<cloudId>`.
  - There is **no documented keychain credential surface**; the keychain blob is
    ACLI-internal and out of scope for jira.js. This validates the new auth
    contract below.

---

## 1. Scope table — banned patterns found

Every line below was read from the live file, not guessed.

| # | File | Banned pattern (quoted) | Line(s) | Replacement | Risk |
|---|------|-------------------------|---------|-------------|------|
| 1 | `scripts/lib/jira.mjs` | `security find-generic-password -l "acli" -w … \| sed 's/^go-keyring-base64://' \| base64 -d \| gunzip \| python3 …` inside `if (process.platform === "darwin")` block | 64–79 | Delete the entire keychain block (resolution path #2). `resolveAuth()` keeps only ATLASSIAN_TOKEN (bearer) and JIRA_API_TOKEN+JIRA_USER_EMAIL (basic). | **High** — every verify/audit script imports `resolveAuth`/`createClient` from here. |
| 2 | `scripts/provision-jira.cjs` | `security find-generic-password … go-keyring-base64 … gunzip … access_token` inside `resolveToken()` `darwin` block | 140–156 | Delete the keychain fallback; `resolveToken()` returns `process.env.ATLASSIAN_TOKEN` or `null`. Update the no-token error message (line ~705–708) to drop "or store credentials via acli on macOS". | **High** — provisioning auth path. |
| 3 | `scripts/provision-automation.cjs` | `resolveToken()` keychain block (108–118); `gateway/api/automation/internal-api/jira/${cloudId}/pro/rest/GLOBAL/rules/import` in `ENDPOINTS[1]` (`"experimental private gateway fallback"`, line 401) | 108–118, 394–403 | Remove keychain from `resolveToken()`. Remove the internal-api endpoint from `ENDPOINTS` so the experimental path keeps only the documented REST candidate (`/rest/api/3/automation/service/1.0/rules/imports`). Keep the manual-import stop as the supported path (already exits 2). | **High** — supported provisioning script. |
| 4 | `scripts/fix-automation-triggers.cjs` | `const API_BASE = \`https://${SITE}/gateway/api/automation/internal-api/jira/${CLOUD_ID}/pro/rest/GLOBAL\`` (line 56); keychain block in `resolveToken()` (303–313) | 56, 303–313 | Retire from supported path. Wrap with an `--experimental`/`AIGO_EXPERIMENTAL_AUTOMATION_IMPORT` hard guard at top of `main()` that exits non-zero before any internal call unless explicitly opted in; remove the keychain fallback (Bearer via ATLASSIAN_TOKEN only). Add an `EXPERIMENTAL` header. (Deletion is the cleaner option — see §2.4 recommendation.) | **Med** — already non-default; the goal is to make it unreachable by default and keychain-free. |
| 5 | `scripts/verify/automation-audit.mjs` | `const url = \`${host}/rest/cb-automation/latest/project/${PROJECT_ID}/rule\`` | 104 | Stop calling the internal endpoint on the supported path. Row returns `unsupported` + writes `evidence/blockers/automation-api.json` (the existing blocker) without an HTTP call, citing the platform gap. Native audit-log export is the proof surface. | **Med** — read-only verify row; already degrades to `unsupported`. |
| 6 | `scripts/audit/jira-snapshot.mjs` | `const autoRes = await rawGet(\`/rest/cb-automation/latest/project/${PROJECT_KEY}/rule\`)` | 131 | Drop the cb-automation read. `automation` field becomes `{ status: "api_unavailable", reason: "no documented public read API", blocker: "evidence/blockers/automation-api.json" }`. Documented GETs (`/rest/api/3/field`, `/rest/api/3/filter/search`, project/issue-type) stay — they are native wrappers and not in scope. | **Med** — read-only audit; cb-automation already best-effort. |

No banned patterns exist in any other `scripts/**` file (verified by grep across
the listed files). `scripts/lib/jira.mjs` is the single chokepoint for auth, so
fixing it once removes the keychain path from every consumer that imports
`resolveAuth`.

---

## 2. Replacement strategy

### 2.1 New auth contract (the canonical statement)

After the purge, **two and only two** documented auth modes are supported
everywhere; document this verbatim in the header of `scripts/lib/jira.mjs` and
reference it from `docs/PORTABILITY.md`:

```
Auth resolution order (documented surfaces only):
  1. ATLASSIAN_TOKEN env var → OAuth2 Bearer → https://api.atlassian.com/ex/jira/<cloudId>
  2. JIRA_API_TOKEN + JIRA_USER_EMAIL env vars → Basic auth → https://<site>.atlassian.net
No other source is read. ACLI may be used to *obtain* a token, but its keychain
storage is never read by repo scripts. Exit code 3 if neither is resolvable.
```

`resolveAuth()` (jira.mjs) and `resolveToken()` (provision-jira.cjs,
provision-automation.cjs) drop their `darwin`/keychain branch; the bearer/basic
branches and exit-3 behavior are unchanged. ctx7 confirms both modes are exactly
what jira.js `Version3Client` accepts, so no client wiring changes.

### 2.2 Internal automation API in provision/verify/audit → documented gap

The cb-automation / internal-api reads have **no documented public replacement**
(confirmed: `evidence/blockers/automation-api.json` already records the 401
"scope does not match"). Strategy:

- **`verify/automation-audit.mjs`**: do not issue the HTTP call. The row emits
  `status: "unsupported"`, writes/refreshes `evidence/blockers/automation-api.json`
  with `candidate_resolution` pointing at native audit-log export, and exits 5
  (its documented `unsupported(api)` code). This is informative, not a silent
  pass — the verify summary shows the blocker. Native Jira Automation audit-log
  export is the supported proof surface (matrix row "Automation import").
- **`audit/jira-snapshot.mjs`**: remove the cb-automation `rawGet`. The
  `automation` object reports `api_unavailable` with a blocker pointer. Exit-code
  logic loses the `automationOnlyFailure → 5` branch (no internal call to fail);
  documented GET failures still drive exit 2.
- **`provision-automation.cjs`**: the supported path already stops at "manual
  import required" (exit 2). Only the experimental escape hatch touched the
  internal endpoint; removing `ENDPOINTS[1]` leaves the experimental path with a
  single documented REST candidate that 401s cleanly into the manual-import
  message. The native owner is Jira Automation UI export/import; rules stay
  DISABLED-first.

### 2.3 `evidence/blockers/automation-api.json`

Already exists and is correct in shape. Update its `generated_by` to also list
`scripts/audit/jira-snapshot.mjs` (now a second writer) or keep per-writer; the
key fields stay: `reason`, `http_status` (or `null` when no call is made),
`candidate_resolution` = "native Jira Automation audit-log export; no documented
public read API". This is the declarative stub the §1-banned-pattern policy
requires for a capability with no REST/CLI surface.

### 2.4 `fix-automation-triggers.cjs` — recommendation: DELETE

Per refactor-plan §A.3 this script is "RETIRE from supported path." It is a
private-endpoint brute-force trigger editor (5 trigger-shape candidates × an
internal PUT loop) for two specific hard-coded rule IDs on one site. Two options:

- **(Recommended) Delete the file.** Its entire reason for existing is the
  internal API; the native fix is the Jira Automation UI (already printed in its
  `uiInstructions`). Deleting removes the largest internal-API surface in the
  repo and the second keychain copy. Update `tests/safety/contract.test.ts` (see
  §3) and remove any package.json/doc references.
- **(Fallback) Quarantine.** If the lead wants to keep it as a labeled
  experiment: move under a clearly experimental name, prepend an `EXPERIMENTAL`
  header, hard-guard `main()` to exit non-zero unless `--experimental` AND
  `AIGO_EXPERIMENTAL_AUTOMATION_IMPORT=1`, remove the keychain fallback, and add
  it to `evidence/blockers/automation-api.json` as the gap it works around.

**Recommendation: delete.** Quarantine keeps a private endpoint string in the
tree that the verify grep (§3) must then special-case, which weakens the gate.
The lead decides at the gate.

---

## 3. Tests needed (the purge must be provable by CI)

The current tests **assert the banned patterns are PRESENT** — they must be
inverted, and a repo-wide grep guard added.

| Test | Current state | Required change |
|------|---------------|-----------------|
| `tests/provision-automation.test.ts:43` | `expect(source).toMatch(/gateway\/api\/automation\/internal-api/i)` (asserts present) | **Invert** to `.not.toMatch(...)`. Keep the `AIGO_EXPERIMENTAL_AUTOMATION_IMPORT` + manual-import assertions. |
| `tests/safety/contract.test.ts:108` | `expect(source).toContain("gateway/api/automation/internal-api")` for both provisioner and triggerFixer | **Invert** to `.not.toContain(...)`. If `fix-automation-triggers.cjs` is deleted, drop its read; otherwise assert the experimental hard-guard. |
| `tests/importAutomation.test.ts:29–30` | already asserts `index.ts` has no internal-api | Keep; extend coverage (below). |
| **NEW** `tests/nih/endpoint-purge.test.ts` | — | Grep guard: read every file under `scripts/**` (and `src/**`, `index.ts`) and assert **none** of `gateway/api/automation/internal-api`, `rest/cb-automation`, `security find-generic-password`, `go-keyring-base64` appear — except files explicitly listed in an `EXPERIMENTAL_ALLOWLIST` (empty if fix-triggers is deleted). This is the CI gate that fails if any banned pattern returns. |
| **NEW** `tests/lib-jira-auth.test.ts` | — | Assert `resolveAuth()`: returns bearer for `ATLASSIAN_TOKEN`, basic for `JIRA_API_TOKEN`+`JIRA_USER_EMAIL`, `null` otherwise; and that the source contains no `darwin`/`find-generic-password`. |
| `tests/safety/vm-safety.test.ts`, `tests/integration/provision-mock.test.ts` | consumers of these scripts | Re-run to confirm no regression from auth-path removal. |

The grep guard test is the durable proof for the acceptance criterion and the
TaskCompleted gate.

---

## 4. Evidence artifact — `evidence/nih/endpoint-purge.json`

Produced by a repo script (not hand-written), deterministic on re-run,
machine-readable. Proposed producer: a small node script
`scripts/verify/endpoint-purge.mjs` (or fold into the new test's fixture) that
greps the tree and emits:

```json
{
  "generated_by": "scripts/verify/endpoint-purge.mjs",
  "generated_at": "<ISO>",
  "git_sha": "<sha>",
  "banned_patterns": [
    "gateway/api/automation/internal-api",
    "rest/cb-automation",
    "security find-generic-password",
    "go-keyring-base64"
  ],
  "scanned_globs": ["scripts/**", "src/**", "index.ts"],
  "experimental_allowlist": [],
  "matches": [],
  "auth_contract": {
    "supported": ["ATLASSIAN_TOKEN (bearer)", "JIRA_API_TOKEN + JIRA_USER_EMAIL (basic)"],
    "removed": ["macOS keychain go-keyring blob"]
  },
  "status": "green",
  "exit_code": 0
}
```

`status: green` and empty `matches` (modulo allowlist) is the pass condition.
Markdown summaries, if any, are generated from this JSON.

---

## 5. Rollback plan

The risk is the ATLASSIAN_TOKEN/basic path breaking after keychain removal,
leaving operators unable to authenticate.

- **Low blast radius:** the keychain path was already non-default (env vars
  checked first); operators with `ATLASSIAN_TOKEN` or `JIRA_API_TOKEN`+email set
  see no behavior change. Verified: `evidence/blockers/automation-api.json` shows
  the live token already uses a non-keychain credential.
- **If auth breaks:** the fix is operational, not a code revert — operators set
  `ATLASSIAN_TOKEN` (PAT from id.atlassian.com) or `JIRA_API_TOKEN` +
  `JIRA_USER_EMAIL`. Document this in the no-auth exit-3 message and
  `docs/PORTABILITY.md`.
- **Code rollback:** the change is a localized git revert (delete-only diffs in
  6 files + test inversions). `git revert <sha>` restores the keychain path.
  Because the supported reconcile loop (`infra:plan/apply/verify`) does not
  depend on the keychain path, a revert is safe and isolated.
- **No data risk:** all touched code is auth/read/validate; the only mutating
  Forge action (`addAnalysisComment`) is untouched, so the safety invariant
  cannot regress.

---

## 6. Gate checklist (lead + safety-reviewer sign-off before implementation)

**Lead:**

- [ ] Decision on `fix-automation-triggers.cjs`: **delete** (recommended) vs
      quarantine-as-experimental.
- [ ] Confirm the new auth contract (§2.1) is the canonical supported-auth
      statement and may be added to `docs/PORTABILITY.md`.
- [ ] Confirm `verify/automation-audit.mjs` returning `unsupported`/exit-5
      without an HTTP call is acceptable for the verify matrix (no row flips to
      green falsely; blocker is surfaced).
- [ ] Approve the new grep-guard test + `endpoint-purge.mjs` producer as the
      acceptance evidence.
- [ ] Confirm scope is auth/endpoint purge only — **no** provisioning-behavior or
      manifest changes ride along (those are T-NIH-09/10, separately gated).

**Safety-reviewer:**

- [ ] Confirm `addAnalysisComment` remains the only mutating Forge action; this
      change adds no write surface (`policies/safe-mutations.md` untouched).
- [ ] Confirm no safety-contract prompt language is altered.
- [ ] Confirm automation rules remain imported **DISABLED-first**; removing the
      internal import endpoint does not enable any rule.
- [ ] Confirm no PHI/credential leakage: the keychain blob (which decoded a real
      access token through a shell pipe) is removed from all paths; the exit-3
      message names env vars only, never echoes a token.
- [ ] Confirm the experimental allowlist (if fix-triggers is quarantined) is
      explicit, non-default, and blocker-tagged.

**Both — IaC contract:**

- [ ] `npm run infra:plan/verify` still exit 0 after the change (read-only rows
      degrade to documented `unsupported`, not red).
- [ ] All evidence is script-produced and deterministic; no `.png`/manual step
      introduced.

---

## Summary of findings

- **Keychain auth appears in 3 files** (`lib/jira.mjs:64–79`,
  `provision-jira.cjs:140–156`, `provision-automation.cjs:108–118`) plus a 4th in
  `fix-automation-triggers.cjs:303–313`. All four are the identical
  `find-generic-password → go-keyring-base64 → gunzip → access_token` pipe and
  are already labeled non-default. `lib/jira.mjs` is the shared chokepoint.
- **Internal endpoints appear in 4 files**: `gateway/api/automation/internal-api`
  in `provision-automation.cjs:401` (experimental `ENDPOINTS[1]`) and as the
  hard-coded `API_BASE` in `fix-automation-triggers.cjs:56`; `rest/cb-automation`
  in `verify/automation-audit.mjs:104` and `audit/jira-snapshot.mjs:131`.
- **Two existing tests assert the banned pattern is PRESENT**
  (`provision-automation.test.ts:43`, `safety/contract.test.ts:108`) and must be
  inverted — without this, CI would block the purge.
- **No documented replacement exists** for the automation read; the correct
  outcome is a documented gap (`evidence/blockers/automation-api.json` already
  present) + native audit-log export, not a different endpoint.
- **The new auth contract is exactly the two jira.js-documented modes**
  (verified via ctx7): bearer (ATLASSIAN_TOKEN) and basic (JIRA_API_TOKEN +
  JIRA_USER_EMAIL). Removing keychain requires no client-wiring change.
- **Recommendation:** delete `fix-automation-triggers.cjs` rather than
  quarantine it — it is the largest internal-API surface and exists solely for
  that endpoint; the native UI fix is already documented in its own output.
