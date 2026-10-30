#!/usr/bin/env node
/**
 * Generates placeholder PNG icons (16/32/48/96/128px) from a simple
 * crescent-glyph rasterization matching src/icons/icon.svg, using only
 * Node's built-in zlib (no image-processing dependency).
 *
 * These are intentionally simple placeholders for local development and
 * `web-ext lint`/build validation. Milestone 6 (PLAN.md, Section 7)
 * replaces them with a properly designed, exported icon set.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZES = [16, 32, 48, 96, 128];
const OUT_DIR = path.join(__dirname, "..", "src", "icons");

const LIGHT = [0xe6, 0xe6, 0xe6];
const DARK = [0x12, 0x12, 0x12];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = makeCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Renders the crescent glyph (outer light disc minus an offset dark disc). */
function renderPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.34;
  const innerCx = cx + size * 0.14;

  const dOuter = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  if (dOuter > outerR) return null; // transparent
  const dInner = Math.hypot(x + 0.5 - innerCx, y + 0.5 - cy);
  return dInner <= innerR ? DARK : LIGHT;
}

function buildPng(size) {
  const rowBytes = size * 4 + 1; // +1 filter byte per row
  const raw = Buffer.alloc(rowBytes * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const color = renderPixel(x, y, size);
      if (color) {
        raw[px] = color[0];
        raw[px + 1] = color[1];
        raw[px + 2] = color[2];
        raw[px + 3] = 255;
      } else {
        raw[px] = raw[px + 1] = raw[px + 2] = raw[px + 3] = 0;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const png = buildPng(size);
    const outFile = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(outFile, png);
    console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
  }
}

main();
