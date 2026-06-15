"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SEED_TEMPLATE = "automation/seed/aigo-seed-issues.csv";
const DEFAULT_AUTOMATION_RULES_FILE = "automation/rules/aigo-automation-ruleset.json";

function defaultsFromEnv() {
  return {
    site: process.env.JIRA_SITE || process.env.AIGO_JIRA_SITE || "",
    cloudId: process.env.AIGO_CLOUD_ID || "",
    projectId: process.env.AIGO_PROJECT_ID || "",
    forgeEnvironment: process.env.FORGE_ENV || process.env.AIGO_FORGE_ENV || "development",
    projectKey: process.env.AIGO_PROJECT_KEY || "AIGO",
    projectName: process.env.AIGO_PROJECT_NAME || "AI Growth Ops",
    projectDescription:
      process.env.AIGO_PROJECT_DESCRIPTION || "AI Growth Ops workspace provisioned from jira-marketing-agents.",
    seedLabel: process.env.AIGO_SEED_LABEL || "aigo-seed",
    minSeedCount: Number.parseInt(process.env.AIGO_MIN_SEED_COUNT || "15", 10),
    templateProjectKey: process.env.AIGO_TEMPLATE_PROJECT_KEY || "",
    seedTemplate: process.env.AIGO_SEED_TEMPLATE || DEFAULT_SEED_TEMPLATE,
    renderedSeedFile: process.env.AIGO_SEED_FILE || "",
    automationRulesFile: process.env.AIGO_AUTOMATION_RULES_FILE || DEFAULT_AUTOMATION_RULES_FILE,
  };
}

function readJson(file) {
  const absolute = path.resolve(file);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function readYamlInstance(yamlPath) {
  // Minimal YAML extraction for optional instance YAML files. Reads only simple
  // `key: value` scalars under the `instance:` section.
  const abs = path.resolve(yamlPath);
  if (!fs.existsSync(abs)) return {};
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  let inInstance = false;
  const result = {};
  for (const line of lines) {
    if (/^instance:/.test(line)) { inInstance = true; continue; }
    if (inInstance) {
      if (/^\S/.test(line) && !/^\s*#/.test(line)) break; // new top-level key
      const m = line.match(/^\s+(\w+):\s+"?([^"#\n]+?)"?\s*$/);
      if (m) result[m[1]] = m[2].trim();
    }
  }
  return result;
}

function loadInstanceConfig(file = process.env.AIGO_INSTANCE_CONFIG) {
  const fromFile = file ? readJson(file) : {};
  const defaults = defaultsFromEnv();
  const infraYaml = process.env.AIGO_INSTANCE_YAML_CONFIG
    ? readYamlInstance(process.env.AIGO_INSTANCE_YAML_CONFIG)
    : {};
  const yamlOverrides = {
    site: infraYaml.site || "",
    cloudId: infraYaml.cloudId || "",
    projectId: infraYaml.projectId || "",
    projectKey: infraYaml.projectKey || "",
    forgeEnvironment: infraYaml.forgeEnvironment || infraYaml.forgeEnv || "",
  };
  // Priority: explicit file > env vars > optional YAML instance file.
  const config = { ...defaults, ...fromFile };
  // Fill in blank fields from YAML. Env vars and JSON config take precedence.
  if (!config.cloudId) config.cloudId = yamlOverrides.cloudId || "";
  if (!config.site) config.site = yamlOverrides.site || "";
  if (!config.projectId) config.projectId = yamlOverrides.projectId || "";
  if (!config.projectKey || config.projectKey === "AIGO") config.projectKey = yamlOverrides.projectKey || config.projectKey;
  if (!config.forgeEnvironment || config.forgeEnvironment === "development") {
    config.forgeEnvironment = yamlOverrides.forgeEnvironment || config.forgeEnvironment;
  }
  config.projectKey = String(config.projectKey || "AIGO").trim().toUpperCase();
  config.seedLabel = String(config.seedLabel || "aigo-seed").trim();
  config.forgeEnvironment = String(config.forgeEnvironment || "development").trim();
  config.projectName = String(config.projectName || config.projectKey).trim();
  config.projectDescription = String(config.projectDescription || "").trim();
  config.seedTemplate = String(config.seedTemplate || defaults.seedTemplate).trim();
  config.renderedSeedFile =
    String(config.renderedSeedFile || `automation/seed/generated/${config.projectKey}-seed-issues.csv`).trim();
  config.minSeedCount = Number.parseInt(String(config.minSeedCount || 15), 10);
  config.site = String(config.site || "").trim();
  config.cloudId = String(config.cloudId || "").trim();
  config.projectId = String(config.projectId || "").trim();
  config.templateProjectKey = String(config.templateProjectKey || "").trim().toUpperCase();
  config.automationRulesFile = String(config.automationRulesFile || defaults.automationRulesFile).trim();
  return config;
}

function envForConfig(config) {
  const value = (key) => (config[key] === undefined || config[key] === null ? "" : String(config[key]));
  return {
    ...process.env,
    JIRA_SITE: value("site"),
    AIGO_JIRA_SITE: value("site"),
    AIGO_CLOUD_ID: value("cloudId"),
    AIGO_PROJECT_ID: value("projectId"),
    AIGO_PROJECT_KEY: value("projectKey"),
    AIGO_PROJECT_NAME: value("projectName"),
    AIGO_PROJECT_DESCRIPTION: value("projectDescription"),
    AIGO_TEMPLATE_PROJECT_KEY: value("templateProjectKey"),
    AIGO_SEED_LABEL: value("seedLabel"),
    AIGO_MIN_SEED_COUNT: value("minSeedCount"),
    AIGO_SEED_TEMPLATE: value("seedTemplate"),
    AIGO_SEED_FILE: value("renderedSeedFile"),
    AIGO_AUTOMATION_RULES_FILE: value("automationRulesFile"),
    AIGO_FORGE_ENV: value("forgeEnvironment"),
    FORGE_ENV: value("forgeEnvironment"),
  };
}

module.exports = {
  loadInstanceConfig,
  envForConfig,
};
