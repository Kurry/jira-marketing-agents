"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULTS = {
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
  seedTemplate: process.env.AIGO_SEED_TEMPLATE || "automation/seed/aigo-seed-issues.csv",
  renderedSeedFile: process.env.AIGO_SEED_FILE || "",
  automationRulesFile: process.env.AIGO_AUTOMATION_RULES_FILE || "automation/rules/aigo-automation-ruleset.json",
};

function readJson(file) {
  const absolute = path.resolve(file);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function loadInstanceConfig(file = process.env.AIGO_INSTANCE_CONFIG) {
  const fromFile = file ? readJson(file) : {};
  const config = { ...DEFAULTS, ...fromFile };
  config.projectKey = String(config.projectKey || "AIGO").trim().toUpperCase();
  config.seedLabel = String(config.seedLabel || "aigo-seed").trim();
  config.forgeEnvironment = String(config.forgeEnvironment || "development").trim();
  config.projectName = String(config.projectName || config.projectKey).trim();
  config.seedTemplate = String(config.seedTemplate || DEFAULTS.seedTemplate).trim();
  config.renderedSeedFile =
    String(config.renderedSeedFile || `automation/seed/generated/${config.projectKey}-seed-issues.csv`).trim();
  config.minSeedCount = Number.parseInt(String(config.minSeedCount || 15), 10);
  config.site = String(config.site || "").trim();
  config.templateProjectKey = String(config.templateProjectKey || "").trim().toUpperCase();
  config.automationRulesFile = String(config.automationRulesFile || DEFAULTS.automationRulesFile).trim();
  return config;
}

function envForConfig(config) {
  return {
    ...process.env,
    JIRA_SITE: config.site,
    AIGO_JIRA_SITE: config.site,
    AIGO_PROJECT_KEY: config.projectKey,
    AIGO_PROJECT_NAME: config.projectName,
    AIGO_SEED_LABEL: config.seedLabel,
    AIGO_MIN_SEED_COUNT: String(config.minSeedCount),
    AIGO_SEED_FILE: config.renderedSeedFile,
    AIGO_FORGE_ENV: config.forgeEnvironment,
    FORGE_ENV: config.forgeEnvironment,
  };
}

module.exports = {
  loadInstanceConfig,
  envForConfig,
};
