const {jest: jestConfig} = require('kcd-scripts/config')

const esModules = ['xdm'].join('|')

module.exports = Object.assign(jestConfig, {
  // Required to allow esbuild to run under jest
  testEnvironment: './jest.environment.js',
  transformIgnorePatterns: [`/node_modules/(?!${esModules})/`],
  transform: {
    '\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
})
