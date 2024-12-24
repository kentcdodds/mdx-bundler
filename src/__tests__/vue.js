import './setup-tests.js'
import * as Vue from "vue";
import * as _jsx_runtime from 'vue/jsx-runtime';
import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { render } from '@testing-library/vue'
import { bundleMDX } from '../index.js'
import { getMDXComponent } from '../client/jsx.js'


const test = suite("vue");

const jsxBundlerConfig = {
  jsxLib: {
    varName: 'Vue',
    package: 'vue',
  },
  jsxRuntime: {
    varName: '_jsx_runtime',
    package: 'vue/jsx-runtime',
  },
}
const jsxComponentConfig = { Vue, _jsx_runtime }

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
  return <div>mdx-bundler with Vue's runtime!</div>
}
`.trim();


test('smoke test for vue', async () => {

  const result = await bundleMDX({
    source: mdxSource,
    jsxConfig: jsxBundlerConfig,
    files: {
      './demo.tsx': demoTsx
    }
  });
  const Component = getMDXComponent(result.code, jsxComponentConfig)


  const SpanBold = Vue.defineComponent({
    setup(_, { slots }) {
      return () => Vue.h('span', { "class": "strong" }, slots.default?.())
    }
  })

  assert.equal(result.frontmatter, {
    title: 'Example Post',
    published: new Date('2021-02-13'),
    description: 'This is some meta-data',
  })

  const WrappedComponent = Vue.defineComponent({
    setup() {
      return () => Vue.h(Component, {
        'components': { strong: Sp anBold }
      })
    }
  })


  const { container } = render(WrappedComponent)

  assert.equal(
    container.innerHTML,
    `<h1>This is the title</h1>
<p>Here's a <span class="strong">neat</span> demo:</p>
<div>mdx-bundler with Vue's runtime!</div>`,
  )
})

test.run()