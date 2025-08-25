/* eslint-env node */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    // Cloud Functions source uses CommonJS (require/exports)
    sourceType: "script",
  },
  extends: ["eslint:recommended", "google"],
  ignorePatterns: [
    ".eslintrc.js",   // don't lint this config file
    "node_modules/",
    "coverage/",
    "lib/",
  ],
  rules: {
    // keep your preferences, relax a couple noisy ones
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "require-jsdoc": "off",
    "new-cap": "off",
    // optional: turn these back on later if you want
    "no-restricted-globals": "off",
    "prefer-arrow-callback": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: { mocha: true },
      rules: {},
    },
  ],
  globals: {},
};