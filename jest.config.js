const {jest: jestConfig} = require('kcd-scripts/config')

const esModules = [
  'xdm',
  'unist-util-position-from-estree',
  'estree-walker',
  'periscopic',
].join('|')

module.exports = Object.assign(jestConfig, {
  // Required to allow esbuild to run under jest
  testEnvironment: './jest.environment.js',
  // ESModules are here and Jest isn't ready...
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+/`],
  moduleFileExtensions: [...jestConfig.moduleFileExtensions, 'cjs'],
  resolver: 'jest-module-field-resolver',
})
