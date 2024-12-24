import './setup-tests.js'
import * as Preact from "preact";
import * as PreactDOM from "preact/compat";
import * as _jsx_runtime from 'preact/jsx-runtime';
import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import { render } from '@testing-library/preact'
import {bundleMDX} from '../index.js'
import {getMDXComponent} from '../client/jsx.js'

const test = suite("preact");

const jsxBundlerConfig = {
  jsxLib: {
    varName: 'Preact',
    package: 'preact',
  },
  jsxDom: {
    varName: 'PreactDom',
    package: 'preact/compat',
  },
  jsxRuntime: {
    varName: '_jsx_runtime',
    package: 'preact/jsx-runtime',
  },
}
const jsxComponentConfig = { Preact, PreactDOM, _jsx_runtime  }

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
`.trim();

const demoTsx = `
export default function Demo() {
  return <div>mdx-bundler with Preact's runtime!</div>
}
`.trim();


test('smoke test for preact', async () => {

  const result = await bundleMDX({
    source: mdxSource,
    jsxConfig: jsxBundlerConfig,
    files: {
      './demo.tsx': demoTsx
    }
  });

  const Component = getMDXComponent(result.code, jsxComponentConfig)

  /** @param {Preact.JSX.HTMLAttributes<HTMLSpanElement>} props */
  const SpanBold = ({children}) => {
    return Preact.createElement('span', { className: "strong" }, children)
  }

  assert.equal(result.frontmatter, {
    title: 'Example Post',
    published: new Date('2021-02-13'),
    description: 'This is some meta-data',
  })

  const {container} = render(
    Preact.h(Component, {components: {strong: SpanBold}})
  )

  assert.equal(
    container.innerHTML,
    `<h1>This is the title</h1>
<p>Here's a <span class="strong">neat</span> demo:</p>
<div>mdx-bundler with Preact's runtime!</div>`,
  )
})

test.run()