import './setup-tests.js'
import { Hono } from "hono";
import * as HonoJSX from "hono/jsx";
import * as HonoDOM from "hono/jsx/dom";
import * as _jsx_runtime from "hono/jsx/jsx-runtime";
import {test} from 'uvu'
import * as assert from 'uvu/assert'
import {bundleMDX} from '../index.js'
import {getMDXComponent} from '../client/jsx.js'



const jsxBundlerConfig = {
  jsxLib: {
    varName: 'HonoJSX',
    package: 'hono/jsx',
  },
  jsxDom: {
    varName: 'HonoDOM',
    package: 'hono/jsx/dom',
  },
  jsxRuntime: {
    varName: '_jsx_runtime',
    package: 'hono/jsx/jsx-runtime',
  },
}
const jsxComponentConfig = { HonoJSX, HonoDOM, _jsx_runtime  }

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
  return <div>mdx-bundler with hono's runtime!</div>
}
`.trim();


test('smoke test for hono', async () => {

  const result = await bundleMDX({
    source: mdxSource,
    jsxConfig: jsxBundlerConfig,
    files: {
      './demo.tsx': demoTsx
    }
  });

  const SpanBold = ({ children }) => {
    return HonoJSX.createElement('span', { className: "strong" }, children)
  }

  const app = new Hono()
    .get("/", (c) => {
      const Component = getMDXComponent(result.code, jsxComponentConfig);
      return c.html(HonoJSX.jsx(Component, { components: { strong: SpanBold } }).toString());
    });
 
    const req = new Request("http://localhost/");
    const res = await app.fetch(req);
    assert.equal(await res.text(), `<h1>This is the title</h1>
<p>Here&#39;s a <span class="strong">neat</span> demo:</p>
<div>mdx-bundler with hono&#39;s runtime!</div>`);
})

test.run()