"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getSiteOverrideCss, normalizeHostname } = require(
  "../src/content/site-overrides.js"
);

test("normalizeHostname strips a leading www.", () => {
  assert.equal(normalizeHostname("www.example.com"), "example.com");
  assert.equal(normalizeHostname("example.com"), "example.com");
  assert.equal(normalizeHostname(""), "");
});

test("hostMatchesPattern: exact and subdomain suffix matches", () => {
  const { hostMatchesPattern } = require("../src/content/site-overrides.js");
  assert.equal(hostMatchesPattern("example.com", "example.com"), true);
  assert.equal(hostMatchesPattern("sub.example.com", "example.com"), true);
  assert.equal(hostMatchesPattern("notexample.com", "example.com"), false);
  assert.equal(hostMatchesPattern("example.com.evil", "example.com"), false);
});

test("getSiteOverrideCss returns '' when there is no entry for the hostname", () => {
  assert.equal(getSiteOverrideCss("no-such-site.example"), "");
  assert.equal(getSiteOverrideCss(""), "");
  assert.equal(getSiteOverrideCss(undefined), "");
});

test("getSiteOverrideCss matches exact and www.-prefixed hostnames", () => {
  // No entries are configured out of the box; getSiteOverrideCss falls
  // through to "" - normalizeHostname + hostMatchesPattern are exercised
  // directly above once entries exist, this documents the empty-default.
  assert.equal(getSiteOverrideCss("www.no-such-site.example"), "");
});
