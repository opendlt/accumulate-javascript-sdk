module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.js$": "babel-jest", // Use Babel for ES Modules in JS files
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@noble/secp256k1)/)", // Allow Jest to transform @noble/secp256k1
  ],
};
