const configs = require('kcd-scripts/config')

const esModules = [
  'xdm',
  'unist-util-position-from-estree',
  'estree-walker',
  'periscopic',
  'remark-mdx-frontmatter',
  'js-yaml',
  'estree-util-is-identifier-name',
].join('|')

module.exports = Object.assign(configs.jest, {
  testEnvironment: './tests/jest.environment.js',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+/`],
  transform: {
    '^.+\\.(js|ts|jsx|tsx|cjs|mjs)$': './tests/transform.js',
  },
  resolver: 'jest-module-field-resolver',
})
