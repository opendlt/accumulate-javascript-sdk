export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true
    }],
    "^.+\\.js$": "babel-jest", // Use Babel for ES Modules in JS files
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@noble/secp256k1)/)", // Allow Jest to transform @noble/secp256k1
  ],
  moduleNameMapping: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
};
