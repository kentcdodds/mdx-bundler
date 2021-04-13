// __dirname isn't supported in ESM files
// we could use import.meta, but that may not be supported by whatever bundler
// folks may be using, so we'll just go with this...
module.exports = !__dirname.includes('mdx-bundler')
