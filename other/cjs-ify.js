// This file exists because we want to develop our package with Native ESM
// but distribute our package as CommonJS. We need to use native ESM because
// several deps use ESM and it's just easier to integrate with them using native
// ESM. But we want to expose CommonJS because our package consumers aren't ready
// to consume native ESM packages yet...

// This is hopefully temporary...
import fs from 'fs'
import url from 'url'
import path from 'path'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '../dist')
const pkgPath = path.join(distPath, 'package.json')

const cjsPkgInfo = {
  type: 'commonjs',
  main: './index.js',
  types: './index.d.ts',
}
fs.writeFileSync(pkgPath, JSON.stringify(cjsPkgInfo))

// when babel compiles this file, it renames it from `.cjs` to `.js` but our
// code imports it with the extension (becuase during dev we're native ESM so we
// have to) and it's easier to update the extension than it would be to update
// the import in the code during the build.
fs.renameSync(
  path.join(distPath, 'dirname-messed-up.js'),
  path.join(distPath, 'dirname-messed-up.cjs'),
)
