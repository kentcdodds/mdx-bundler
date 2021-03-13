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
import data from './data.json'
import jsInfo from './js-info.js'
import JsxComp from './jsx-comp.jsx'
import MdxComp from './mdx-comp.mdx'

function Demo() {
  return (
    <div>
      {leftPad("Neat demo!", 12, '!')}
      <SubDir>Sub dir!</SubDir>
      <p>JSON: {data.package}</p>
      <div>{jsInfo}</div>
      <JsxComp />
      <MdxComp />
    </div>
  )
}

export default Demo
      `.trim(),
      './sub/dir.tsx': `
import * as React from 'react'

export default ({children}) => <div className="sub-dir">{children}</div>
      `.trim(),
      './js-info.js': 'export default "this is js info"',
      './jsx-comp.jsx': 'export default () => <div>jsx comp</div>',
      './mdx-comp.mdx': `
---
title: This is frontmatter
---

# Frontmatter title: {frontmatter.title}
      `.trim(),
      './data.json': `{"package": "mdx-bundler"}`,
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
          $$Neat demo!
          <div
            class="sub-dir"
          >
            Sub dir!
          </div>
          <p>
            JSON: 
            mdx-bundler
          </p>
          <div>
            this is js info
          </div>
          <div>
            jsx comp
          </div>
          <h1>
            Frontmatter title: 
            This is frontmatter
          </h1>
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

  expect(error.message).toMatchInlineSnapshot(`
    "Build failed with 1 error:
    __mdx_bundler_fake_dir__/index.mdx:2:17: error: [inMemory] Could not resolve \\"./demo\\" in the entry MDX file."
  `)
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

  expect(error.message).toMatchInlineSnapshot(`
    "Build failed with 1 error:
    __mdx_bundler_fake_dir__/demo.tsx:1:7: error: [inMemory] Could not resolve \\"./blah-blah\\" in \\"./demo.tsx\\""
  `)
})

test('gives a handy error when a file of an unsupported type is provided', async () => {
  const mdxSource = `
import Demo from './demo.blah'

<Demo />
  `.trim()

  const error = (await bundleMDX(mdxSource, {
    files: {
      './demo.blah': `what even is this?`,
    },
  }).catch(e => e)) as Error

  expect(error.message).toMatchInlineSnapshot(`
    "Build failed with 1 error:
    __mdx_bundler_fake_dir__/index.mdx:2:17: error: [JavaScript plugins] Invalid loader: \\"blah\\" (valid: js, jsx, ts, tsx, css, json, text, base64, dataurl, file, binary)"
  `)
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
      <p>
        !!Typescript
      </p>
    </div>
  `)
})

test('can specify "node_modules" in the files', async () => {
  const mdxSource = `
import LeftPad from 'left-pad-js'

<LeftPad padding={4} string="^">Hi</LeftPad>
  `.trim()

  const {code} = await bundleMDX(mdxSource, {
    files: {
      'left-pad-js': `export default () => <div>this is left pad</div>`,
    },
  })

  const Component = getMDXComponent(code)

  const {container} = render(<Component />)

  expect(container).toMatchInlineSnapshot(`
    <div>
      <div>
        this is left pad
      </div>
    </div>
  `)
})
