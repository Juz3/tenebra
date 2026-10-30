"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isDarkColor,
  parseRgb,
  contrastRatio,
  hasReadableContrast,
} = require("../src/content/heuristics.js");

test("isDarkColor: near-black background is dark", () => {
  assert.equal(isDarkColor("rgb(18, 18, 18)"), true);
});

test("isDarkColor: white background is not dark", () => {
  assert.equal(isDarkColor("rgb(255, 255, 255)"), false);
});

test("isDarkColor: mid-gray with rgba alpha channel", () => {
  assert.equal(isDarkColor("rgba(30, 30, 30, 1)"), true);
  assert.equal(isDarkColor("rgba(240, 240, 240, 0.5)"), false);
});

test("isDarkColor: transparent/empty input is treated as not dark", () => {
  assert.equal(isDarkColor(""), false);
  assert.equal(isDarkColor("transparent"), false);
  assert.equal(isDarkColor(undefined), false);
});

test("isDarkColor: rgba(0, 0, 0, 0) - getComputedStyle's initial value for an element with no background rule at all - is not dark", () => {
  // This is the real string browsers return (not the literal word
  // "transparent") when html/body never had a background-color set -
  // extremely common on plain light sites. Previously this was
  // misparsed as opaque black (luminance 0) and wrongly reported as a
  // dark background.
  assert.equal(isDarkColor("rgba(0, 0, 0, 0)"), false);
});

test("isDarkColor: threshold boundary around luminance 64", () => {
  // 0.299*50 + 0.587*50 + 0.114*50 = 50 -> dark
  assert.equal(isDarkColor("rgb(50, 50, 50)"), true);
  // 0.299*200 + 0.587*200 + 0.114*200 = 200 -> not dark
  assert.equal(isDarkColor("rgb(200, 200, 200)"), false);
});

test("parseRgb: parses rgb() and rgba() with/without alpha", () => {
  assert.deepEqual(parseRgb("rgb(1, 2, 3)"), { r: 1, g: 2, b: 3, a: 1 });
  assert.deepEqual(parseRgb("rgba(1, 2, 3, 0.5)"), {
    r: 1,
    g: 2,
    b: 3,
    a: 0.5,
  });
  assert.equal(parseRgb("transparent"), null);
  assert.equal(parseRgb(""), null);
});

test("contrastRatio: black on white is the maximum (21)", () => {
  const ratio = contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)");
  assert.ok(Math.abs(ratio - 21) < 0.01);
});

test("contrastRatio: identical colors have a ratio of 1", () => {
  assert.equal(contrastRatio("rgb(50, 50, 50)", "rgb(50, 50, 50)"), 1);
});

test("contrastRatio: returns null when a color can't be parsed", () => {
  assert.equal(contrastRatio("transparent", "rgb(0, 0, 0)"), null);
});

test("contrastRatio: returns null for rgba(0, 0, 0, 0) instead of treating it as opaque black", () => {
  // Same real-world string as above - must not be treated as a valid
  // black background for contrast purposes either.
  assert.equal(contrastRatio("rgba(0, 0, 0, 0)", "rgb(51, 51, 51)"), null);
});

test("hasReadableContrast: near-black text on near-black background fails", () => {
  // rgb(42, 43, 45) text on a rgb(16, 17, 20)-ish dark background -
  // this is the exact failure mode.
  assert.equal(
    hasReadableContrast("rgb(16, 17, 20)", "rgb(42, 43, 45)"),
    false
  );
});

test("hasReadableContrast: light text on a dark background passes", () => {
  assert.equal(
    hasReadableContrast("rgb(16, 17, 20)", "rgb(230, 230, 230)"),
    true
  );
});

test("hasReadableContrast: unparseable color is treated as readable (don't flag on uncertainty)", () => {
  assert.equal(hasReadableContrast("transparent", "rgb(0, 0, 0)"), true);
});

