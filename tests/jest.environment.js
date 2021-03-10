const JSDOMEnvironment = require('jest-environment-jsdom')

// Modifies the JS DOM Environment so it uses Node's `Uint8Array` and `ArrayBuffer`
class MDXEnvironment extends JSDOMEnvironment {
  constructor(config) {
    super({...config, globals: {...config.globals, Uint8Array, ArrayBuffer}})
  }
}

module.exports = MDXEnvironment
