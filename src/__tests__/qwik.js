/* eslint-disable react/no-unknown-property */
/* eslint-disable react/react-in-jsx-scope */
/** @jsxImportSource @builder.io/qwik */

import * as Qwik from "@builder.io/qwik";
import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import { render } from '@noma.to/qwik-testing-library'
import {bundleMDX} from '../index.js'
import {getMDXComponent} from '../client/jsx.js';

/**
 * NOTE: Qwik v2 will change the package name from '@builder.io/qwik' to '@qwik.dev/core'.
 * 
 * It's the Qwik team's responsibility to update the package name in the test once v2 has released. (Jack, a core team member has made the initial PR to this package, and will update this test once v2 has released.)
*/

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

  /**
   * Qwik v1 uses HTML comments as markers in its output for component boundaries and resumability.
   * When Qwik v2 is released, the expected output will change to be more similar to other frameworks,
   * but with distinctive dynamic and constant attributes (denoted by the ':' character).
   * This test will need to be updated accordingly when migrating to v2.
   */
  
  assert.equal(
    container.innerHTML,
    `<h1>This is the title</h1>
<p>Here's a <!--qv --><span class="strong"><!--qv q:key q:sref=0 q:s-->neat<!--/qv--></span><!--/qv--> demo:</p>
<!--qv --><div>mdx-bundler with Qwik's runtime!</div><!--/qv-->`
  )
})

test.run()