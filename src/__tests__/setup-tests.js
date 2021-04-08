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
// @ts-expect-error TS2740 🤷‍♂️
global.navigator = { userAgent: 'node.js', }
global.requestAnimationFrame = callback => setTimeout(callback, 0)
global.cancelAnimationFrame = id => clearTimeout(id)
copyProps(window, global)
