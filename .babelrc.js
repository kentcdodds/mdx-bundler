// a bit of a hack, but this prevents compiling modules
process.env.BUILD_TREESHAKE = 'true'
module.exports = {
  presets: ['kcd-scripts/babel'],
}
