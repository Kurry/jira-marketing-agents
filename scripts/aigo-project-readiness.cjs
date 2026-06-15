#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const { loadInstanceConfig } = require("./instance-config.cjs");

const config = loadInstanceConfig();
const projectKey = config.projectKey;
const seedLabel = config.seedLabel;
const minSeedCount = config.minSeedCount;
const warnOnly = process.env.AIGO_READINESS_WARN_ONLY === "1";

const expectedIssueTypes = [
  "Growth Task",
  "Experiment",
  "Creative Request",
  "Claims Review",
  "Dashboard Request",
  "Automation Request",
  "Employer Launch",
  "Segmentation Request",
  "Signup Funnel Issue",
  "Insight / Research Brief",
  "Bug / Tracking Issue",
  "Decision Memo",
];

const expectedStatuses = [
  "To Do",
  "AI Triage",
  "Needs Info",
  "Needs Human Review",
  "Ready",
  "Claims Review",
  "In Progress",
  "Blocked",
  "Experiment Running",
  "Readout Needed",
  "Decision Needed",
  "Done",
];

function runAcli(args) {
  const result = spawnSync("acli", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`Failed to run acli: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(`acli ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }

  return result.stdout;
}

function parseJson(label, raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${label} JSON: ${error.message}`);
  }
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function issueFieldName(issue, fieldName) {
  const value = issue.fields?.[fieldName] ?? issue[fieldName];
  if (value && typeof value === "object" && "name" in value) {
    return value.name;
  }
  return typeof value === "string" ? value : undefined;
}

function formatList(values) {
  return values.length ? values.join(", ") : "none";
}

const failures = [];
const warnings = [];

console.log(`Checking Jira readiness for project ${projectKey}...`);

const project = parseJson(
  "project",
  runAcli(["jira", "project", "view", "--key", projectKey, "--json"]),
);

const projectIssueTypes = new Set((project.issueTypes || []).map((type) => type.name));
const missingIssueTypes = expectedIssueTypes.filter((type) => !projectIssueTypes.has(type));

if (missingIssueTypes.length) {
  failures.push(`Missing expected issue types: ${formatList(missingIssueTypes)}`);
}

console.log(`Project: ${project.name} (${project.key}), style=${project.style}, simplified=${project.simplified}`);
console.log(`Issue types present: ${formatList(sorted(projectIssueTypes))}`);

const seedIssues = parseJson(
  "seed issues",
  runAcli([
    "jira",
    "workitem",
    "search",
    "--jql",
    `project = ${projectKey} AND labels = ${seedLabel} ORDER BY key ASC`,
    "--fields",
    "key,summary,status,issuetype,labels",
    "--limit",
    "100",
    "--json",
  ]),
);

if (!Array.isArray(seedIssues)) {
  failures.push("Unexpected ACLI seed issue response shape; expected a JSON array.");
}

const issues = Array.isArray(seedIssues) ? seedIssues : [];
if (issues.length < minSeedCount) {
  failures.push(`Expected at least ${minSeedCount} seeded issues with label ${seedLabel}; found ${issues.length}.`);
}

const observedStatuses = new Set();
const observedSeedIssueTypes = new Set();

for (const issue of issues) {
  const statusName = issueFieldName(issue, "status");
  const issueTypeName = issueFieldName(issue, "issuetype");
  if (statusName) observedStatuses.add(statusName);
  if (issueTypeName) observedSeedIssueTypes.add(issueTypeName);
}

const unobservedStatuses = expectedStatuses.filter((status) => !observedStatuses.has(status));
if (unobservedStatuses.length) {
  warnings.push(
    `Statuses not observed on seeded issues: ${formatList(unobservedStatuses)}. ` +
      "ACLI cannot prove whether unobserved team-managed workflow statuses exist; verify in Jira project settings.",
  );
}

if (observedSeedIssueTypes.size === 1 && observedSeedIssueTypes.has("Task") && missingIssueTypes.length) {
  warnings.push(
    "Seed issues are still imported as Task, which is expected before custom issue types are configured.",
  );
}

console.log(`Seed issues found: ${issues.length}`);
console.log(`Seed issue types observed: ${formatList(sorted(observedSeedIssueTypes))}`);
console.log(`Seed statuses observed: ${formatList(sorted(observedStatuses))}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length) {
  console.log("\nReadiness failures:");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }

  if (!warnOnly) {
    console.log("\nSet AIGO_READINESS_WARN_ONLY=1 to collect this report without failing.");
    process.exit(1);
  }
}

console.log("\nManual checks still required:");
console.log("- Confirm all 19 Rovo agents appear in Jira/Rovo.");
console.log(`- Confirm project ${projectKey} includes every MVP workflow status and transition path.`);
console.log("- Import or rebuild Jira Automation rules and validate each audit log.");
console.log("- Run the six manual Rovo agent checks from specs/tasks.md.");

console.log("\nJira readiness check complete.");
