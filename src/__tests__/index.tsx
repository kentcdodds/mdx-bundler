import * as React from 'react'
import {render} from '@testing-library/react'
import leftPad from 'left-pad'
import {bundleMDX} from '..'
import {getMDXComponent} from '../client'

test('smoke test', async () => {
  const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some meta-data
---

import Demo from './demo'

# This is the title

Here's a **neat** demo:

<Demo />
`.trim()

  const result = await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `
import * as React from 'react'
import leftPad from 'left-pad'
import SubDir from './sub/dir.tsx'
import data from './data.json'

function Demo() {
  return (
    <div>
      {leftPad("Neat demo!", 12, '!')}
      <SubDir>Sub dir!</SubDir>
      <p>JSON: {data.package}</p>
    </div>
  )
}

export default Demo
    `.trim(),
      './sub/dir.tsx': `
import * as React from 'react'

export default ({children}) => <div className="sub-dir">{children}</div>
    `.trim(),
      './data.json': `"package": "mdx-bundler"}`,
    },
    globals: {'left-pad': 'myLeftPad'},
  })

  const frontmatter = result.frontmatter as {
    title: string
    description: string
    published: string
  }

  // This creates a custom left pad which uses a different filler character to the one supplied.
  // If it is not substituted the original will be used and we will get "!" instead of "$"
  const myLeftPad = (string: string, length: number) => {
    return leftPad(string, length, '$')
  }

  const Component = getMDXComponent(result.code, {myLeftPad})

  const {container} = render(
    <>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>,
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
        import Demo from './demo'
        

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
        

        <div />
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
  render(<Component />)
})

test('gives a handy error when the entry imports a module that cannot be found', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
  `.trim()

  const error = (await bundleMDX(mdxSource, {
    files: {},
  }).catch(e => e)) as Error

  expect(error.message).toMatchInlineSnapshot(`undefined`)
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

  expect(error.message).toMatchInlineSnapshot(`undefined`)
})

test('files is optional', async () => {
  await expect(bundleMDX('hello')).resolves.toBeTruthy()
})

test('uses the typescript loader where needed', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
  `.trim()

  const {code} = await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `
import * as React from 'react'
import {left} from './left'

const Demo: React.FC = () => { 
return <p>{left("Typescript")}</p>
}

export default Demo
      `.trim(),
      './left.ts': `
import leftPad from 'left-pad'

export const left = (s: string): string => {
return leftPad(s, 12, '!')
}
      `.trim(),
    },
  })

  const Component = getMDXComponent(code)

  const {container} = render(<Component />)

  expect(container).toMatchInlineSnapshot(`
    <div>
      import Demo from './demo'
      

      <div />
    </div>
  `)
})
