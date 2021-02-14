import * as React from 'react'
import {render} from '@testing-library/react'
import {MDXProvider} from '@mdx-js/react'
import leftPad from 'left-pad'
import {bundleMDX} from '..'
import {getMDXComponent} from '../client'

// compiling and bundling is slow...
jest.setTimeout(20000)

test('smoke test', async () => {
  const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some meta-data
---

# This is the title

import Demo from './demo'

Here's a **neat** demo:

<Demo />
`.trim()

  const result = await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `
import * as React from 'react'
import leftPad from 'left-pad'
import SubDir from './sub/dir.tsx'

function Demo() {
  return (
    <div>
      {leftPad("Neat demo!", 12, '!')}
      <SubDir>Sub dir!</SubDir>
    </div>
  )
}

export default Demo
    `.trim(),
      './sub/dir.tsx': `
import * as React from 'react'

export default ({children}) => <div className="sub-dir">{children}</div>
    `.trim(),
    },
    rollup: {
      getInputOptions(options) {
        options.external = [...(options.external as Array<string>), 'left-pad']
        return options
      },
      getOutputOptions(options) {
        options.globals = {...options.globals, 'left-pad': 'myLeftPad'}
        return options
      },
    },
  })

  const frontmatter = result.frontmatter as {
    title: string
    description: string
    published: string
  }
  const Component = getMDXComponent(result.code, {myLeftPad: leftPad})
  const {container} = render(
    <MDXProvider>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </MDXProvider>,
  )
  expect(container).toMatchInlineSnapshot(`
    <div>
      <header>
        <h1>
          Example Post
        </h1>
        <p>
          This is some meta-data
        </p>
      </header>
      <main>
        <h1>
          This is the title
        </h1>
        <p>
          Here's a 
          <strong>
            neat
          </strong>
           demo:
        </p>
        <div>
          !!Neat demo!
          <div
            class="sub-dir"
          >
            Sub dir!
          </div>
        </div>
      </main>
    </div>
  `)
})

test('bundles 3rd party deps', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
`.trim()

  const result = await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `
import leftPad from 'left-pad'

export default () => leftPad("Neat demo!", 12, '!')
    `.trim(),
    },
  })

  // this test ensures that *not* passing leftPad as a global here
  // will work because I didn't externalize the left-pad module
  const Component = getMDXComponent(result.code)
  render(
    <MDXProvider>
      <Component />
    </MDXProvider>,
  )
})

test('gives a handy error when the entry imports a module that cannot be found', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
`.trim()

  const error = (await bundleMDX(mdxSource, {
    files: {},
  }).catch(e => e)) as Error

  expect(error.message).toMatchInlineSnapshot(
    `"Could not resolve './demo' from the entry MDX file"`,
  )
})

test('gives a handy error when importing a module that cannot be found', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
`.trim()

  const error = (await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `import './blah-blah'`,
    },
  }).catch(e => e)) as Error

  expect(error.message).toMatchInlineSnapshot(
    `"Could not resolve './blah-blah' from 'demo.tsx'"`,
  )
})
