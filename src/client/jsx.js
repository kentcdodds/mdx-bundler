/**
 * @typedef {import('../types').MDXContentProps} MDXContentProps
 */

/**
 *
 * @param {string} code - The string of code you got from bundleMDX
 * @param {Record<string, unknown>} jsxGlobals - JSX globals
 * @param {Record<string, unknown>} [globals] - Any variables your MDX needs to have accessible when it runs
 * @return {(props: MDXContentProps) => JSX.Element}
 */
function getMDXComponent(code, jsxGlobals, globals) {
  const mdxExport = getMDXExport(code, jsxGlobals, globals)
  return mdxExport.default
}

/**
 * @template {{}} ExportedObject
 * @template {{}} Frontmatter
 * @type {import('../types').MDXJsxExportFunction<ExportedObject, Frontmatter>}
 * @param {string} code - The string of code you got from bundleMDX
 * @param {Record<string, unknown>} jsxGlobals - JSX globals 
 * @param {Record<string, unknown>} [globals] - Any variables your MDX needs to have accessible when it runs
 *
 */
function getMDXExport(code, jsxGlobals, globals) {
  const scope = {...jsxGlobals, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent, getMDXExport}
