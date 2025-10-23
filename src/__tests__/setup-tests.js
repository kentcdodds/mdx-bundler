import jsdomPkg from 'jsdom'
process.env.NODE_ENV = 'test'

const {JSDOM} = jsdomPkg
const jsdom = new JSDOM('<!doctype html><html><body></body></html>')
const {window} = jsdom

/**
 * @param {Object} src
 * @param {Object} target
 */
function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  })
}

// @ts-expect-error TS2322 🤷‍♂️
global.window = window
global.document = window.document
// Use Object.defineProperty to set navigator because in Node 21+ it's read-only
Object.defineProperty(global, 'navigator', {
  value: {userAgent: 'node.js'},
  writable: true,
  configurable: true,
})
global.requestAnimationFrame = callback => setTimeout(callback, 0)
global.cancelAnimationFrame = id => clearTimeout(id)
copyProps(window, global)
