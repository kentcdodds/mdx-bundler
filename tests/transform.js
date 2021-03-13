// because jest + TS + native es modules don't like each other, we have to keep
// native es modules disabled and compile esm to cjs for the packages that are esm
// total bummer...
const path = require('path')
const {transformSync} = require('esbuild')

const extnameToLoader = {
  mjs: 'js',
  cjs: 'js',
}

module.exports = {
  process(src, filename) {
    const ext = path.extname(filename).slice(1)
    const result = transformSync(src, {
      loader: extnameToLoader[ext] || ext,
      sourcemap: true,
      format: 'cjs',
    })
    return result
  },
}
