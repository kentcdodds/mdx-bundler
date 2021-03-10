const path = require('path')
const {transformSync} = require('esbuild')

const extnameToLoader = {
  mjs: 'js',
  cjs: 'js',
}

module.exports = {
  process(src, filename) {
    const ext = path.extname(filename).slice(1)
    return transformSync(src, {
      loader: extnameToLoader[ext] ?? ext,
      sourcemap: true,
      format: 'cjs',
    })
  },
}
