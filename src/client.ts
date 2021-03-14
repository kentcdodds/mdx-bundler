import * as React from 'react'

function getMDXComponent(
  code: string,
  globals?: Record<string, unknown>,
): React.FunctionComponent<{
  components?: Record<
    string,
    React.FunctionComponent | React.Component | string
  >
}> {
  const scope = {React, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
