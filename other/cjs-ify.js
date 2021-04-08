import fs from 'fs'
import url from 'url'
import path from 'path'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const pkgPath = path.join(__dirname, '../dist/package.json')

const cjsPkgInfo = {
  type: 'commonjs',
  main: './index.js',
  types: './index.d.ts',
}
fs.writeFileSync(pkgPath, JSON.stringify(cjsPkgInfo))
