import * as React from 'react'

interface ComponentMap {
  [name: string]: React.ComponentType | string | ComponentMap
}

interface MDXContentProps {
  [props: string]: unknown
  components?: ComponentMap
}

function getMDXComponent(
  code: string,
  globals?: Record<string, unknown>,
): React.FunctionComponent<MDXContentProps> {
  const scope = {React, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
