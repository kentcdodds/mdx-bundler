<div align="center">
<h1>mdx-bundler 🦤</h1>

<p>Give me MDX/TSX strings and I'll give you back a string of JS you can eval.</p>
</div>

---

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmtrends]
[![MIT License][license-badge]][license]
[![All Contributors][all-contributors-badge]](#contributors-)
[![PRs Welcome][prs-badge]][prs]
[![Code of Conduct][coc-badge]][coc]
<!-- prettier-ignore-end -->

## The problem

You have a string of MDX and various TS/JS files that it uses and you want to
get a bundled version of these files to eval in the browser.

## This solution

Give your MDX and JS strings to this function, and it will give you back a
single string of the bundled code.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Usage](#usage)
- [Compilation target](#compilation-target)
- [Rollup options](#rollup-options)
- [Inspiration](#inspiration)
- [Other Solutions](#other-solutions)
- [Issues](#issues)
  - [🐛 Bugs](#-bugs)
  - [💡 Feature Requests](#-feature-requests)
- [Contributors ✨](#contributors-)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `dependencies`:

```
npm install --save mdx-bundler
```

## Usage

```typescript
import {bundleMDX} from 'mdx-bundler'

const mdxSource = `
---
title: Example Post
published: 2021-02-13
description: This is some description
---

# Wahoo

import Demo from './demo'

Here's a **neat** demo:

<Demo />
`.trim()

const result = await bundleMDX(mdxSource, {
  files: {
    './demo.tsx': `
import * as React from 'react'

function Demo() {
  return <div>Neat demo!</div>
}

export default Demo
    `,
  },
})

const {code, frontmatter} = result
```

From there, you send the `code` to your client, and then:

```jsx
import * as React from 'react'
import {MDXProvider} from '@mdx-js/react'
import {getMDXComponent} from 'mdx-bundler/client'

function Post({code, frontmatter}) {
  // it's generally a good idea to memoize this function call to
  // avoid re-creating the component every render.
  const Component = React.useMemo(() => getMDXComponent(code), [code])
  return (
    <MDXProvider>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </MDXProvider>
  )
}
```

Ultimately, this gets rendered (basically):

```html
<header>
  <h1>This is the title</h1>
  <p>This is some description</p>
</header>
<main>
  <div>
    <h1>Wahoo</h1>

    <p>Here's a <strong>neat</strong> demo:</p>

    <div>Neat demo!</div>
  </div>
</main>
```

## Files

The `files` config is an object of all the files you're bundling. The key is the
path to the file (relative to the MDX source) and the value is the string of the
file source code. You could get these from the filesystem or from a remote
database. If your MDX doesn't reference other files (or only imports things from
`node_modules`), then you can omit this entirely.

## Compilation target

We use rollup to bundle your MDX and its dependencies and babel to compile
things. We're using `@babel/preset-env` and you can configure this using the
standard browserlist configuration.
[learn more](https://babeljs.io/docs/en/babel-preset-env#browserslist-integration).

## Rollup options

You can customize the rollup configuration used with the rollup options:

```typescript
const result = await bundleMDX(mdxSource, {
  files: {
    /* ... */
  },
  rollup: {
    getInputOptions,
    getOutputOptions,
  },
})
```

Each of these is a function that receives the default options and should return
the options you want used.

This should allow you to customize the `external` and `global` configuration for
rollup. For example, if your MDX file uses the d3 library and your app exposes
`window.d3` you could configure rollup to externalize that and replace all
references with the global `d3` to avoid double-bundling d3. When you call
`getMDXComponent`, you'll pass `d3` as a second argument:
`getMDXComponent(code, {d3: window.d3})`. Here's an example:

```tsx
// server-side or build-time code that runs in Node:
import {bundleMDX} from 'mdx-bundler'

const mdxSource = `
# This is the title

import leftPad from 'left-pad'

<div>{leftPad("Neat demo!", 12, '!')}</div>
`.trim()

const result = await bundleMDX(mdxSource, {
  // NOTE: this is *only* necessary if you want to share deps between your MDX
  // file bundle and the host app. Otherwise, all deps will just be bundled.
  // So it'll work either way, this is just an optimization to avoid sending
  // multiple copies of the same library to your users.
  rollup: {
    getInputOptions(options) {
      // Tell rollup that `left-pad` should *not* be bundled.
      // By default `options.external` is: ['react', 'react-dom']
      // so we'll add 'left-pad' to tell rollup to not bundle it with our MDX code
      options.external = [...(options.external as Array<string>), 'left-pad']
      return options
    },
    getOutputOptions(options) {
      // Tell rollup that it should replace the left-pad import with a global variable.
      // By default `options.globals` is: {react: 'React', 'react-dom': 'ReactDOM'}
      // so we'll add 'left-pad': 'myLeftPad' to tell it what the global variable name is
      options.globals = {...options.globals, 'left-pad': 'myLeftPad'}
      return options
    },
  },
})
```

```tsx
// server-rendered and/or client-side code that can run in the browser or Node:
import * as React from 'react'
import leftPad from 'left-pad'
import {MDXProvider} from '@mdx-js/react'
import {getMDXComponent} from 'mdx-bundler/client'

function MDXPage({code}: {code: string}) {
  const Component = React.useMemo(
    () => getMDXComponent(result.code, {myLeftPad: leftPad}),
    [result.code, leftPad],
  )
  return (
    <main>
      <MDXProvider>
        <Component />
      </MDXProvider>
    </main>
  )
}
```

## Inspiration

As I was rewriting [kentcdodds.com](https://kentcdodds.com) to
[remix](https://remix.run), I decided I wanted to keep my blog posts as MDX, but
I didn't want to have to compile them all at build time or be required to
redeploy every time I fix a typo. So I made this which allows my server to
compile on demand.

## Other Solutions

There's [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) but it's
more of an mdx-compiler than a bundler (can't bundle your mdx for dependencies).
Also it's focused on Next.js whereas this is meta-framework agnostic.

## Issues

_Looking to contribute? Look for the [Good First Issue][good-first-issue]
label._

### 🐛 Bugs

Please file an issue for bugs, missing documentation, or unexpected behavior.

[**See Bugs**][bugs]

### 💡 Feature Requests

Please file an issue to suggest new features. Vote on feature requests by adding
a 👍. This helps maintainers prioritize what to work on.

[**See Feature Requests**][requests]

## Contributors ✨

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://kentcdodds.com"><img src="https://avatars.githubusercontent.com/u/1500684?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Kent C. Dodds</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Documentation">📖</a> <a href="#infra-kentcdodds" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/benwis"><img src="https://avatars.githubusercontent.com/u/6953353?v=4?s=100" width="100px;" alt=""/><br /><sub><b>benwis</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/issues?q=author%3Abenwis" title="Bug reports">🐛</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification.
Contributions of any kind welcome!

## LICENSE

MIT

<!-- prettier-ignore-start -->
[npm]: https://www.npmjs.com
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/github/workflow/status/kentcdodds/mdx-bundler/validate?logo=github&style=flat-square
[build]: https://github.com/kentcdodds/mdx-bundler/actions?query=workflow%3Avalidate
[coverage-badge]: https://img.shields.io/codecov/c/github/kentcdodds/mdx-bundler.svg?style=flat-square
[coverage]: https://codecov.io/github/kentcdodds/mdx-bundler
[version-badge]: https://img.shields.io/npm/v/mdx-bundler.svg?style=flat-square
[package]: https://www.npmjs.com/package/mdx-bundler
[downloads-badge]: https://img.shields.io/npm/dm/mdx-bundler.svg?style=flat-square
[npmtrends]: https://www.npmtrends.com/mdx-bundler
[license-badge]: https://img.shields.io/npm/l/mdx-bundler.svg?style=flat-square
[license]: https://github.com/kentcdodds/mdx-bundler/blob/main/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: https://makeapullrequest.com
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/mdx-bundler/blob/main/CODE_OF_CONDUCT.md
[emojis]: https://github.com/all-contributors/all-contributors#emoji-key
[all-contributors]: https://github.com/all-contributors/all-contributors
[all-contributors-badge]: https://img.shields.io/github/all-contributors/kentcdodds/mdx-bundler?color=orange&style=flat-square
[bugs]: https://github.com/kentcdodds/mdx-bundler/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Acreated-desc+label%3Abug
[requests]: https://github.com/kentcdodds/mdx-bundler/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc+label%3Aenhancement
[good-first-issue]: https://github.com/kentcdodds/mdx-bundler/issues?utf8=%E2%9C%93&q=is%3Aissue+is%3Aopen+sort%3Areactions-%2B1-desc+label%3Aenhancement+label%3A%22good+first+issue%22
<!-- prettier-ignore-end -->
