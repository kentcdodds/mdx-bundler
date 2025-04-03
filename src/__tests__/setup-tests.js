import jsdomPkg from 'jsdom'
import jsdomGlobal from 'jsdom-global';
jsdomGlobal();
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

global.requestAnimationFrame = callback => setTimeout(callback, 0)
global.cancelAnimationFrame = id => clearTimeout(id)
copyProps(window, global)
