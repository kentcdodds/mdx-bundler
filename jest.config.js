const configs = require('kcd-scripts/config')

module.exports = Object.assign(configs.jest, {
  testEnvironment: './tests/jest.environment.js',
})
