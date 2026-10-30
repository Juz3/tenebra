// Flat ESLint config (ESLint 9+). Kept intentionally small: this project
// has no framework/JSX/TypeScript to configure for.
"use strict";

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "web-ext-artifacts/**"],
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        browser: "readonly",
        chrome: "readonly",
        self: "readonly",
        window: "readonly",
        document: "readonly",
        location: "readonly",
        getComputedStyle: "readonly",
        importScripts: "readonly",
        URL: "readonly",
        module: "readonly",
        requestIdleCallback: "readonly",
        setTimeout: "readonly",
        NodeFilter: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["build/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
