module.exports = {
  // The root of your source code, typically where your package.json lives
  rootDir: ".",
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/test/**/*.test.js",
    "**/__tests__/**/*.js"
  ],
  
  // An array of file extensions your modules use
  moduleFileExtensions: ["js", "json", "jsx", "node"],
  
  // The test environment that will be used for testing
  testEnvironment: "node",
  
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/test/"
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // An array of regexp pattern strings that are matched against all test paths before executing the test
  testPathIgnorePatterns: ["/node_modules/"],
  
  // An array of regexp pattern strings that are matched against all source file paths before re-running tests
  watchPathIgnorePatterns: ["/node_modules/"],
  
  // The directory where Jest should store its cached dependency information
  cacheDirectory: "./node_modules/.cache/jest",
  
  // Setup files to run before each test file
  setupFiles: [],
  
  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {},
  
  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  automock: false,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  
  // An array of regexp pattern strings that are matched against all file paths before executing the test
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/test/"
  ],
  
  // An array of regexp pattern strings that are matched against all source file paths to decide which files should be included in the coverage report
  collectCoverageFrom: [
    "**/*.{js,jsx}",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/test/**"
  ],
  
  // This will be used to configure minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};