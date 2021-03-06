const {jest: jestConfig} = require('kcd-scripts/config')

module.exports = Object.assign(jestConfig, {
  // Required to allow esbuild to run under jest
  testEnvironment: './jest.environment.js',
})
