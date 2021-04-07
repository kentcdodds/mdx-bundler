import configs from 'kcd-scripts/config.js'

export default Object.assign(configs.jest, {
  testEnvironment: './tests/jest.environment.cjs',
  transform: {},
  resolver: 'jest-module-field-resolver',
})
