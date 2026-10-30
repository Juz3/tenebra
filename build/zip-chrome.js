#!/usr/bin/env node
/**
 * Zips dist/chrome into web-ext-artifacts/tenebra-chrome-<version>.zip.
 * Firefox packaging uses `web-ext build` instead (see package.json), which
 * handles the Firefox-specific manifest validation/signing metadata; the
 * Chrome package just needs a plain zip of the built directory.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "dist", "chrome");
const OUT_DIR = path.join(ROOT, "web-ext-artifacts");

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(
      `${SOURCE_DIR} does not exist. Run "npm run build:chrome" first.`
    );
    process.exit(1);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, "manifest.json"), "utf8")
  );
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const outFile = path.join(OUT_DIR, `tenebra-chrome-${manifest.version}.zip`);
  const output = fs.createWriteStream(outFile);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`Wrote ${outFile} (${archive.pointer()} bytes)`);
  });
  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(SOURCE_DIR, false);
  archive.finalize();
}

main();
