/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  // chroma-js is ESM-only; allow babel-jest to transform it
  transformIgnorePatterns: ['/node_modules/(?!(chroma-js)/)'],
  testMatch: ['**/js/__tests__/**/*.test.js'],
};
