// generated_by: scripts/lib/staging.mjs (T-B-02)
// Shared guards/helpers for IaC scripts. Staging-only enforcement.

export const STAGING_SITE = 'myhealthcaresite.atlassian.net';
export const FORGE_ENV = 'development';

/**
 * Resolve the Jira site/instance this run targets. Reads, in order:
 *   JIRA_SITE, ATLASSIAN_SITE, AIGO_SITE.
 * Falls back to the known staging site so local runs default to safe.
 */
export function resolveSite() {
  return (
    process.env.JIRA_SITE ||
    process.env.ATLASSIAN_SITE ||
    process.env.AIGO_SITE ||
    STAGING_SITE
  );
}

/**
 * Exit 4 with a message unless the resolved site is the staging site.
 * Call this in any script that could mutate a Jira/Forge instance.
 */
export function assertStagingOnly() {
  const site = resolveSite();
  if (site !== STAGING_SITE) {
    process.stderr.write(
      `refusing to run: target site "${site}" is not the staging site "${STAGING_SITE}"\n`
    );
    process.exit(4);
  }
  return site;
}

/** True when argv contains -h or --help. */
export function wantsHelp(argv = process.argv.slice(2)) {
  return argv.includes('-h') || argv.includes('--help');
}
