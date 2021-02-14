import * as React from 'react'
import {mdx} from '@mdx-js/react'

function getMDXComponent(code: string, globals?: Record<string, unknown>) {
  const scope = {React, mdx, ...globals}
  // eslint-disable-next-line
  const fn = new Function(...Object.keys(scope), code)
  return fn(...Object.values(scope))
}

export {getMDXComponent}
