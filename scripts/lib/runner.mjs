// generated_by: scripts/lib/runner.mjs (T-R-INFRA-04)
// Spawn child .mjs scripts and parse their JSON envelope from stdout.
// Used by scripts/verify/run-all.mjs and scripts/audit/run-all.mjs.

import { spawnSync } from 'node:child_process';

/**
 * Run a child node script, capturing stdout/stderr and exit code.
 * Parses the LAST complete JSON object printed on stdout as the envelope.
 *
 * @param {string} scriptPath absolute path to the .mjs script
 * @param {string[]} args extra argv to pass
 * @returns {{ exitCode:number, envelope:object|null, stdout:string, stderr:string }}
 */
export function runScript(scriptPath, args = []) {
  const res = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    env: process.env,
  });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const exitCode = res.status == null ? 1 : res.status;
  return { exitCode, envelope: parseLastJson(stdout), stdout, stderr };
}

/**
 * Extract the last top-level JSON object from a stdout blob. Scripts may print
 * human lines too; we scan for the last line that parses as an object, then
 * fall back to brace-matching the whole buffer.
 */
export function parseLastJson(text) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        return JSON.parse(line);
      } catch {
        /* keep scanning */
      }
    }
  }
  // Fallback: last balanced {...} span in the buffer.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* nothing */
    }
  }
  return null;
}
