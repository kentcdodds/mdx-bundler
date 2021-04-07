// we want to author this in ESM, but distribute it in CJS
// It would be simple to put a package.json in the dist directory for this
// with the type as "commonjs" but then the client.js file in the root directory
// would still be ESM so we can't do that either.
// So before we publish, we run this to change all files in this project to CJS
// but it doesn't matter because the only files we actually publish *are* CJS files anyway.
import fs from 'fs'
import url from 'url'
import path from 'path'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const pkgPath = path.join(__dirname, '../package.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath))
pkg.type = 'commonjs'

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
