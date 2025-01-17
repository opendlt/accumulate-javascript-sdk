module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true, // Allows for module, require, etc.
    browser: true, // Allows for window, document, etc.
    es6: true, // Allows for ES6 globals
  },
  ignorePatterns: [
    "dist/", // Ignore built files
    "lib/", // Ignore compiled files
    "*.config.js", // Ignore config files
    "node_modules/",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
};
