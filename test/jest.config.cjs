module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        module: "ESNext",
        target: "ES2020"
      }
    }],
    "^.+\\.js$": ["babel-jest", {
      configFile: "./test/babel.config.cjs"
    }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@noble/secp256k1)/)",
  ],
  testPathIgnorePatterns: ["browser-test"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
