import * as React from 'react'

function getMDXComponent(
  code: string,
  globals?: Record<string, unknown>,
): React.FunctionComponent {
  const scope = {React, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
