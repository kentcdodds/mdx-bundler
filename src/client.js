import * as React from 'react'
import * as _jsx_runtime from 'react/jsx-runtime.js'
import * as ReactDOM from 'react-dom'

/**
 * @typedef {import('mdx/types').MDXComponents} ComponentMap
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
  const scope = {React, ReactDOM, _jsx_runtime, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
