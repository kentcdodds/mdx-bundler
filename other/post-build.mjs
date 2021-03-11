import fs from 'fs'
import glob from 'glob'

const jsFiles = glob.sync('dist/**/*.js')
for (const file of jsFiles) {
  fs.renameSync(file, file.replace(/\.js$/, '.mjs'))
}

const typeDefFiles = glob.sync('dist/**/*.d.ts')
for (const file of typeDefFiles) {
  fs.renameSync(file, file.replace(/\.d\.ts$/, '.mjs.d.ts'))
}
