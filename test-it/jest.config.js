module.exports = {
  roots: ['<rootDir>'],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  testTimeout: 120000,
  globals: {
    'ts-jest': {
      tsConfig: {
        types: ["jest", "node"]
      }
    }
  }
}
