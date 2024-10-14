module.exports = {
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**"],
  modulePathIgnorePatterns: ["<rootDir>/accumulate/"],
  testTimeout: 120000,
};
