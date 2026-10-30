#!/usr/bin/env node
/**
 * Tenebra build script.
 *
 * Intentionally simple (no bundler): merges `src/manifest.base.json` with
 * the per-browser override, then copies `src/` into `dist/<browser>/`,
 * excluding the manifest fragments that only exist as build inputs.
 *
 * Usage:
 *   node build/build.js            # builds both firefox and chrome
 *   node build/build.js firefox    # builds a single target
 *   node build/build.js chrome
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const TARGETS = ["firefox", "chrome"];

// Manifest fragments live at the top of src/ but are build inputs, not
// runtime files, so they're excluded from the copy step.
const MANIFEST_FRAGMENT_NAMES = new Set(
  ["base", ...TARGETS].map((name) => `manifest.${name}.json`)
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/** Shallow-plus-one-level merge: override wins, nested objects are merged
 * one level deep (enough for our manifest shape: background/*, browser_specific_settings/*). */
function mergeManifest(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = { ...result[key], ...value };
    } else {
      result[key] = value;
    }
  }
  return result;
}

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (MANIFEST_FRAGMENT_NAMES.has(entry.name) && srcDir === SRC) {
      continue;
    }
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function buildTarget(target) {
  const base = readJson(path.join(SRC, "manifest.base.json"));
  const override = readJson(path.join(SRC, `manifest.${target}.json`));
  const merged = mergeManifest(base, override);

  const outDir = path.join(DIST, target);
  fs.rmSync(outDir, { recursive: true, force: true });
  copyRecursive(SRC, outDir);
  writeJson(path.join(outDir, "manifest.json"), merged);

  console.log(`Built dist/${target} (manifest v${merged.manifest_version})`);
}

function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length > 0 ? requested : TARGETS;

  for (const target of targets) {
    if (!TARGETS.includes(target)) {
      console.error(`Unknown build target: ${target}`);
      process.exit(1);
    }
    buildTarget(target);
  }
}

main();
