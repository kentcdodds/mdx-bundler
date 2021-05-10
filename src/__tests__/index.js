import './setup-tests.js'
import path from 'path'
import {test} from 'uvu'
import * as assert from 'uvu/assert'
import React from 'react'
import rtl from '@testing-library/react'
import leftPad from 'left-pad'
import {remarkMdxImages} from 'remark-mdx-images'
import {bundleMDX} from '../index.js'
import {getMDXComponent} from '../client.js'

const {render} = rtl

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

  const frontmatter =
    /** @type { title: string, description: string, published: string } */ result.frontmatter

  /**
   * This creates a custom left pad which uses a different filler character to the one supplied.
   * If it is not substituted the original will be used and we will get "!" instead of "$"
   *
   * @param {string} string
   * @param {number} length
   * @returns {string}
   */
  const myLeftPad = (string, length) => {
    return leftPad(string, length, '$')
  }

  const Component = getMDXComponent(result.code, {myLeftPad})

  /** @param {React.HTMLAttributes<HTMLSpanElement>} props */
  const SpanBold = props => React.createElement('span', props)

  assert.equal(frontmatter, {
    title: 'Example Post',
    published: new Date('2021-02-13'),
    description: 'This is some meta-data',
  })

  const {container} = render(
    React.createElement(Component, {components: {strong: SpanBold}}),
  )

  assert.equal(
    container.innerHTML,
    `<h1>This is the title</h1>

<p>Here's a <span>neat</span> demo:</p>
<div>$$Neat demo!<div class="sub-dir">Sub dir!</div><p>JSON: mdx-bundler</p><div>this is js info</div><div>jsx comp</div><h1>Frontmatter title: This is frontmatter</h1></div>`,
  )
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
  render(React.createElement(Component))
})

test('gives a handy error when the entry imports a module that cannot be found', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
  `.trim()

  const error = /** @type Error */ (await bundleMDX(mdxSource, {
    files: {},
  }).catch(e => e))

  assert.equal(
    error.message,
    `Build failed with 1 error:
__mdx_bundler_fake_dir__/_mdx_bundler_entry_point.mdx:3:17: error: Could not resolve "./demo"`,
  )
})

test('gives a handy error when importing a module that cannot be found', async () => {
  const mdxSource = `
import Demo from './demo'

<Demo />
  `.trim()

  const error = /** @type Error */ (await bundleMDX(mdxSource, {
    files: {
      './demo.tsx': `import './blah-blah'`,
    },
  }).catch(e => e))

  assert.equal(
    error.message,
    `Build failed with 1 error:
__mdx_bundler_fake_dir__/demo.tsx:1:7: error: Could not resolve "./blah-blah"`,
  )
})

test('gives a handy error when a file of an unsupported type is provided', async () => {
  const mdxSource = `
import Demo from './demo.blah'

<Demo />
  `.trim()

  const error = /** @type Error */ (await bundleMDX(mdxSource, {
    files: {
      './demo.blah': `what even is this?`,
    },
  }).catch(e => e))

  assert.equal(
    error.message,
    `Build failed with 1 error:
__mdx_bundler_fake_dir__/_mdx_bundler_entry_point.mdx:3:17: error: [plugin: JavaScript plugins] Invalid loader: "blah" (valid: js, jsx, ts, tsx, css, json, text, base64, dataurl, file, binary)`,
  )
})

test('files is optional', async () => {
  await bundleMDX('hello')
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
return <p>{left("TypeScript")}</p>
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

  const {container} = render(React.createElement(Component))
  assert.match(container.innerHTML, '!!TypeScript')
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

  const {container} = render(React.createElement(Component))

  assert.match(container.innerHTML, 'this is left pad')
})

test('should respect the configured loader for files', async () => {
  const mdxSource = `
# Title

import {Demo} from './demo'

<Demo />
  `.trim()

  const files = {
    './demo.ts': `
import React from 'react'

export const Demo: React.FC = () => { 
  return <p>Sample</p>
}
    `.trim(),
  }

  const {code} = await bundleMDX(mdxSource, {
    files,
    esbuildOptions: options => {
      options.loader = {
        ...options.loader,
        '.ts': 'tsx',
      }

      return options
    },
  })

  const Component = getMDXComponent(code)

  const {container} = render(React.createElement(Component))

  assert.match(container.innerHTML, 'Sample')
})

test('require from current directory', async () => {
  const mdxSource = `
# Title

import {Sample} from './other/sample-component'

<Sample />

![A Sample Image](./other/150.png)
`.trim()

  const {code} = await bundleMDX(mdxSource, {
    cwd: process.cwd(),
    xdmOptions: options => {
      options.remarkPlugins = [remarkMdxImages]

      return options
    },
    esbuildOptions: options => {
      options.loader = {
        ...options.loader,
        '.png': 'dataurl',
      }

      return options
    },
  })

  const Component = getMDXComponent(code)

  const {container} = render(React.createElement(Component))

  assert.match(container.innerHTML, 'Sample!')
  // Test that the React components image is imported correctly.
  assert.match(container.innerHTML, 'img src="data:image/png')
  // Test that the markdowns image is imported correctly.
  assert.match(
    container.innerHTML,
    'img alt="A Sample Image" src="data:image/png',
  )
})

test('should output assets', async () => {
  const mdxSource = `
# Sample Post

![Sample Image](./other/150.png)
  `.trim()

  const {code} = await bundleMDX(mdxSource, {
    cwd: process.cwd(),
    xdmOptions: options => {
      options.remarkPlugins = [remarkMdxImages]

      return options
    },
    esbuildOptions: options => {
      options.outdir = path.join(process.cwd(), 'output')
      options.loader = {
        ...options.loader,
        '.png': 'file',
      }
      options.publicPath = '/img/'
      options.write = true

      return options
    },
  })

  const Component = getMDXComponent(code)

  const {container} = render(React.createElement(Component))

  assert.match(container.innerHTML, 'src="/img/150')

  const error = /** @type Error */ (await bundleMDX(mdxSource, {
    cwd: process.cwd(),
    xdmOptions: options => {
      options.remarkPlugins = [remarkMdxImages]

      return options
    },
    esbuildOptions: options => {
      options.loader = {
        ...options.loader,
        // esbuild will throw its own error if we try to use `file` loader without `outdir`
        '.png': 'dataurl',
      }
      options.write = true

      return options
    },
  }).catch(e => e))

  assert.equal(
    error.message,
    "You must either specify `write: false` or `write: true` and `outdir: '/path'` in your esbuild options",
  )
})

test('should support mdx from node_modules', async () => {
  const mdxSource = `
import MdxData from 'mdx-test-data'

Local Content

<MdxData />
  `.trim()

  const {code} = await bundleMDX(mdxSource, {})

  const Component = getMDXComponent(code)

  const {container} = render(React.createElement(Component))

  assert.match(
    container.innerHTML,
    'Mdx file published as an npm package, for testing purposes.',
  )
})

test.run()
