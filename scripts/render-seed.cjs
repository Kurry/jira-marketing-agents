#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadInstanceConfig } = require("./instance-config.cjs");

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function quoteCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function stringifyCsv(rows) {
  return `${rows.map((row) => row.map(quoteCsv).join(",")).join("\n")}\n`;
}

function renderSeed(config) {
  const sourcePath = path.resolve(config.seedTemplate);
  const targetPath = path.resolve(config.renderedSeedFile);
  const rows = parseCsv(fs.readFileSync(sourcePath, "utf8"));

  if (rows.length < 2) {
    throw new Error(`Seed template has no issue rows: ${config.seedTemplate}`);
  }

  const headers = rows[0];
  const projectIndex = headers.indexOf("projectKey");
  const labelIndex = headers.indexOf("label");

  if (projectIndex === -1) {
    throw new Error(`Seed template is missing projectKey column: ${config.seedTemplate}`);
  }

  const rendered = rows.map((row, index) => {
    if (index === 0) {
      return row;
    }
    const next = [...row];
    next[projectIndex] = config.projectKey;
    if (labelIndex !== -1) {
      next[labelIndex] = config.seedLabel;
    }
    return next;
  });

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, stringifyCsv(rendered));
  return { targetPath, count: rendered.length - 1 };
}

if (require.main === module) {
  const config = loadInstanceConfig();
  const result = renderSeed(config);
  console.log(
    `Rendered ${result.count} seed issues for ${config.projectKey}: ${path.relative(process.cwd(), result.targetPath)}`,
  );
}

module.exports = {
  parseCsv,
  renderSeed,
  stringifyCsv,
};
