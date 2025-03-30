/* eslint-disable react/no-unknown-property */
/* eslint-disable react/react-in-jsx-scope */
/** @jsxImportSource @builder.io/qwik */

import * as Qwik from "@builder.io/qwik";
import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import { render } from '@noma.to/qwik-testing-library'
import {bundleMDX} from '../index.js'
import {getMDXComponent} from '../client/jsx.js';

const test = suite("qwik");

const jsxBundlerConfig = {
  jsxLib: {
    varName: 'Qwik',
    package: '@builder.io/qwik',
  },
  jsxRuntime: {
    varName: '_jsx_runtime',
    package: '@builder.io/qwik/jsx-runtime',
  },
}

const jsxComponentConfig = { 
  Qwik,
  _jsx_runtime: {
    jsx: Qwik.jsx,
    jsxs: Qwik.jsx,
    Fragment: Qwik.Fragment
  }
}

const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some meta-data
---
import { Demo } from './demo'

# This is the title

Here's a **neat** demo:
<Demo />
`.trim();

const demoTsx = `
import { component$ } from '@builder.io/qwik'

export const Demo = component$(() => {
  return <div>mdx-bundler with Qwik's runtime!</div>
})
`.trim();

test('smoke test for qwik', async () => {
  const result = await bundleMDX({
    source: mdxSource,
    jsxConfig: jsxBundlerConfig,
    files: {
      './demo.tsx': demoTsx
    }
  });

  /** 
   * @type {any}
   */
  const Component = getMDXComponent(result.code, jsxComponentConfig)

  /** @type {Qwik.Component<{}>} */
  const SpanBold = Qwik.component$(() => {
    return Qwik.jsx('span', { class: "strong", children: Qwik.jsx(Qwik.Slot, { name: "" }) })
  })

  assert.equal(result.frontmatter, {
    title: 'Example Post',
    published: new Date('2021-02-13'),
    description: 'This is some meta-data',
  })

  const {container} = await render(
    Qwik.jsx(Component, { components: { strong: SpanBold } })
  )

  assert.equal(
    container.innerHTML,
    `<h1>This is the title</h1>
<p>Here's a <!--qv --><span class="strong"><!--qv q:key q:sref=0 q:s-->neat<!--/qv--></span><!--/qv--> demo:</p>
<!--qv --><div>mdx-bundler with Qwik's runtime!</div><!--/qv-->`
  )
})

test.run()