import * as React from 'react'
import * as _jsx_runtime from 'react/jsx-runtime.js'

/**
 * @typedef {{[name: string]: React.ComponentType | string | ComponentMap}} ComponentMap
 */

/**
 * @typedef {{[props: string]: unknown, components?: ComponentMap}} MDXContentProps
 */

/**
 *
 * @param {string} code - The string of code you got from bundleMDX
 * @param {Record<string, unknown>} [globals] - Any variables your MDX needs to have accessible when it runs
 * @return {React.FunctionComponent<MDXContentProps>}
 */
function getMDXComponent(code, globals) {
  const scope = {React, _jsx_runtime, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
