const { TextEncoder, TextDecoder } = require("util");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!(?:@noble/secp256k1)/)"],
  testMatch: ["**/test/browser-test.ts", "**/test/**/*browser-test.ts"],
  setupFiles: ["./jest.browser.setup.js"],
};
