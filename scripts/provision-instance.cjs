#!/usr/bin/env node
"use strict";

// scripts/provision-instance.cjs
// NIH classification (T-NIH-07): native-wrapper.
// Per-instance provisioner that wraps Atlassian-native commands: ACLI
// (`jira project view`, `jira project create`, including `--from-project`
// golden-template cloning) and the Forge CLI (lint/deploy/install). Seed and
// readiness steps delegate to repo scripts. This wraps native primitives and
// must not grow into a parallel project model. See specs/atlassian-native-tools.md.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { loadInstanceConfig, envForConfig } = require("./instance-config.cjs");
const { renderSeed } = require("./render-seed.cjs");

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(command, args, options = {}) {
  const rendered = [command, ...args].join(" ");
  if (options.dryRun) {
    console.log(`[dry-run] ${rendered}`);
    return { stdout: "" };
  }

  console.log(`$ ${rendered}`);
  const result = spawnSync(command, args, {
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    env: options.env || process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${rendered} failed with exit code ${result.status}${stderr}`);
  }

  return { stdout: result.stdout || "" };
}

function projectExists(config) {
  const result = spawnSync("acli", ["jira", "project", "view", "--key", config.projectKey, "--json"], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  return result.status === 0;
}

function requireSite(config, flag) {
  if (!config.site) {
    throw new Error(`${flag} requires "site" in the instance config or JIRA_SITE/AIGO_JIRA_SITE.`);
  }
}

function usage() {
  console.log(`Usage:
  AIGO_INSTANCE_CONFIG=instances/acme.json npm run provision:instance -- --all

Flags:
  --all             Run install, project, seed, smoke, and readiness steps.
  --install-forge   Deploy and install the Forge app to config.site.
  --project         Create the Jira project if it does not exist.
  --seed            Render and import seed issues if below minSeedCount.
  --smoke           Run live Jira smoke test with this instance config.
  --readiness       Run Jira readiness check with this instance config.
  --dry-run         Print commands without mutating Jira/Forge.

Project creation:
  If templateProjectKey is set, ACLI clones that project.
  Otherwise, ACLI creates a basic project from key/name/description.`);
}

if (hasFlag("--help") || hasFlag("-h")) {
  usage();
  process.exit(0);
}

const config = loadInstanceConfig();
const env = envForConfig(config);
const dryRun = hasFlag("--dry-run");
const runAll = hasFlag("--all");

const doInstall = runAll || hasFlag("--install-forge");
const doProject = runAll || hasFlag("--project");
const doSeed = runAll || hasFlag("--seed");
const doSmoke = hasFlag("--smoke") || (runAll && !doSeed);
const doReadiness = runAll || hasFlag("--readiness");

if (!doInstall && !doProject && !doSeed && !doSmoke && !doReadiness) {
  usage();
  process.exit(0);
}

console.log(`Instance: ${config.projectKey} (${config.projectName})`);
console.log(`Site: ${config.site || "(not set)"}`);
console.log(`Forge environment: ${config.forgeEnvironment}`);

if (doInstall) {
  requireSite(config, "--install-forge");
  run("forge", ["lint"], { dryRun, env });
  run("forge", ["deploy", "-e", config.forgeEnvironment], { dryRun, env });
  run(
    "forge",
    [
      "install",
      "-e",
      config.forgeEnvironment,
      "-p",
      "jira",
      "--site",
      config.site,
      "--confirm-scopes",
      "--non-interactive",
    ],
    { dryRun, env },
  );
}

if (doProject) {
  if (dryRun) {
    if (config.templateProjectKey) {
      run(
        "acli",
        [
          "jira",
          "project",
          "create",
          "--from-project",
          config.templateProjectKey,
          "--key",
          config.projectKey,
          "--name",
          config.projectName,
          "--description",
          config.projectDescription,
        ],
        { dryRun, env },
      );
    } else {
      run(
        "acli",
        ["jira", "project", "create", "--key", config.projectKey, "--name", config.projectName, "--description", config.projectDescription],
        { dryRun, env },
      );
    }
  } else if (projectExists(config)) {
    console.log(`Project ${config.projectKey} already exists; skipping create.`);
  } else if (config.templateProjectKey) {
    run(
      "acli",
      [
        "jira",
        "project",
        "create",
        "--from-project",
        config.templateProjectKey,
        "--key",
        config.projectKey,
        "--name",
        config.projectName,
        "--description",
        config.projectDescription,
      ],
      { env },
    );
  } else {
    run(
      "acli",
      ["jira", "project", "create", "--key", config.projectKey, "--name", config.projectName, "--description", config.projectDescription],
      { env },
    );
  }
}

if (doSeed) {
  const rendered = dryRun
    ? { targetPath: path.resolve(config.renderedSeedFile), count: 0 }
    : renderSeed(config);
  if (dryRun) {
    console.log(`[dry-run] render seed ${config.seedTemplate} -> ${config.renderedSeedFile}`);
  }
  const seedFile = path.relative(process.cwd(), rendered.targetPath);
  if (!dryRun && !fs.existsSync(rendered.targetPath)) {
    throw new Error(`Rendered seed file is missing: ${seedFile}`);
  }
  run("bash", ["scripts/live-jira-smoke.sh"], {
    dryRun,
    env: { ...env, AIGO_IMPORT_SEED: "1", AIGO_CHECK_FORGE_INSTALL: doInstall ? "1" : "0" },
  });
}

if (doSmoke) {
  run("bash", ["scripts/live-jira-smoke.sh"], {
    dryRun,
    env: { ...env, AIGO_REQUIRE_FORGE_INSTALL: "1" },
  });
}

if (doReadiness) {
  run("node", ["scripts/aigo-project-readiness.cjs"], { dryRun, env });
}
