"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Minimal in-memory mock of the chrome.storage.local callback API, set up
// as a global before requiring storage.js so its `typeof chrome` check
// resolves to this mock (mirrors a Chrome MV3 environment).
function installChromeMock() {
  const store = {};
  const listeners = [];

  global.chrome = {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get(keys, cb) {
          let result;
          if (keys === null || keys === undefined) {
            result = { ...store };
          } else {
            const keyList = Array.isArray(keys) ? keys : [keys];
            result = {};
            for (const k of keyList) {
              if (k in store) result[k] = store[k];
            }
          }
          cb(result);
        },
        set(items, cb) {
          Object.assign(store, items);
          for (const l of listeners) l(items, "local");
          cb();
        },
        remove(keys, cb) {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) delete store[k];
          cb();
        },
      },
      onChanged: {
        addListener(fn) {
          listeners.push(fn);
        },
      },
    },
  };

  return store;
}

installChromeMock();
delete require.cache[require.resolve("../src/shared/storage.js")];
const TenebraStorage = require("../src/shared/storage.js").TenebraStorage;

test("getGlobalDefault defaults to true when unset", async () => {
  assert.equal(await TenebraStorage.getGlobalDefault(), true);
});

test("setGlobalDefault persists the value", async () => {
  await TenebraStorage.setGlobalDefault(false);
  assert.equal(await TenebraStorage.getGlobalDefault(), false);
  await TenebraStorage.setGlobalDefault(true);
});

test("site mode defaults to 'default' when unset", async () => {
  assert.equal(
    await TenebraStorage.getSiteMode("example.com"),
    TenebraStorage.SITE_MODE.DEFAULT
  );
});

test("resolveDarkModeEnabled: site 'always' wins over global off", async () => {
  await TenebraStorage.setGlobalDefault(false);
  await TenebraStorage.setSiteMode("always.example", TenebraStorage.SITE_MODE.ALWAYS);
  assert.equal(await TenebraStorage.resolveDarkModeEnabled("always.example"), true);
  await TenebraStorage.setGlobalDefault(true);
});

test("resolveDarkModeEnabled: site 'never' wins over global on", async () => {
  await TenebraStorage.setGlobalDefault(true);
  await TenebraStorage.setSiteMode("never.example", TenebraStorage.SITE_MODE.NEVER);
  assert.equal(await TenebraStorage.resolveDarkModeEnabled("never.example"), false);
});

test("resolveDarkModeEnabled: 'default' mode falls back to global default", async () => {
  await TenebraStorage.setSiteMode("neutral.example", TenebraStorage.SITE_MODE.DEFAULT);
  await TenebraStorage.setGlobalDefault(false);
  assert.equal(await TenebraStorage.resolveDarkModeEnabled("neutral.example"), false);
  await TenebraStorage.setGlobalDefault(true);
  assert.equal(await TenebraStorage.resolveDarkModeEnabled("neutral.example"), true);
});

test("setSiteMode('default') clears the stored override", async () => {
  await TenebraStorage.setSiteMode("reset.example", TenebraStorage.SITE_MODE.ALWAYS);
  const modesBefore = await TenebraStorage.getAllSiteModes();
  assert.equal(modesBefore["reset.example"], TenebraStorage.SITE_MODE.ALWAYS);

  await TenebraStorage.setSiteMode("reset.example", TenebraStorage.SITE_MODE.DEFAULT);
  const modesAfter = await TenebraStorage.getAllSiteModes();
  assert.equal("reset.example" in modesAfter, false);
});
