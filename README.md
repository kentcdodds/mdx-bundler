<div align="center">
<h1>mdx-bundler 🦤</h1>

<p>Compile and bundle your MDX files and their dependencies. FAST.</p>
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

This is an async function that will compile and bundle your MDX files and their
dependencies. It uses [MDX v2](https://mdxjs.com/blog/v2/) and
[esbuild](https://esbuild.github.io/), so it's VERY fast and supports TypeScript
files (for the dependencies of your MDX files).

Your source files could be local, in a remote github repo, in a CMS, or wherever
else and it doesn't matter. All `mdx-bundler` cares about is that you pass it
all the files and source code necessary and it will take care of bundling
everything for you.

### FAQ:

<details>
  <summary>
    <strong>
      "What's so cool about MDX?"
    </strong>
  </summary>

[MDX](https://mdxjs.com/) enables you to combine terse markdown syntax for your
content with the power of React components. For content-heavy sites, writing the
content with straight-up HTML can be annoyingly verbose. Often people solve this
using a WSYWIG editor, but too often those fall short in mapping the writer's
intent to HTML. Many people prefer using markdown to express their content
source and have that parsed into HTML to be rendered.

The problem with using Markdown for your content is if you want to have some
interactivity embedded into your content, you're pretty limited. You either need
to insert an element that JavaScript targets (which is annoyingly indirect), or
you can use an `iframe` or something.

As previously stated, [MDX](https://mdxjs.com/) enables you to combine terse
markdown syntax for your content with the power of React components. So you can
import a React component and render it within the markdown itself. It's the best
of both worlds.

</details>

<details>
  <summary>
    <strong>
      "How is this different from <a href="https://github.com/hashicorp/next-mdx-remote"><code>next-mdx-remote</code></a>?"
    </strong>
  </summary>

`mdx-bundler` actually bundles dependencies of your MDX files. For example, this
won't work with `next-mdx-remote`, but it will with `mdx-bundler`:

```md
---
title: Example Post
published: 2021-02-13
description: This is some description
---

# Wahoo

import Demo from './demo'

Here's a **neat** demo:

<Demo />
```

`next-mdx-remote` chokes on that import because it's not a bundler, it's just a
compiler. `mdx-bundler` is an MDX compiler and bundler. That's the difference.

</details>

<details>
  <summary>
    <strong>
      "How is this different from the mdx plugins for webpack or rollup?"
    </strong>
  </summary>

Those tools are intended to be run "at build time" and then you deploy the built
version of your files. This means if you have some content in MDX and want to
make a typo change, you have to rebuild and redeploy the whole site. This also
means that every MDX page you add to your site will increase your build-times,
so it doesn't scale all that well.

`mdx-bundler` can definitely be used at build-time, but it's more powerfully
used as a runtime bundler. A common use case is to have a route for your MDX
content and when that request comes in, you load the MDX content and hand that
off to `mdx-bundler` for bundling. This means that `mdx-bundler` is infinitely
scalable. Your build won't be any longer regardless of how much MDX content you
have. Also, `mdx-bundler` is quite fast, but to make this on-demand bundling
even faster, you can use appropriate cache headers to avoid unnecessary
re-bundling.

Webpack/rollup/etc also require that all your MDX files are on the local
filesystem to work. If you want to store your MDX content in a separate repo or
CMS, you're kinda out of luck or have to do some build-time gymnastics to get
the files in place for the build.

With `mdx-bundler`, it doesn't matter where your MDX content comes from, you can
bundle files from anywhere, you're just responsible for getting the content into
memory and then you hand that off to `mdx-bundler` for bundling.

</details>

<details>
  <summary>
    <strong>
      "Does this work with Remix/Gatsby/Next/CRA/etc?"
    </strong>
  </summary>

Totally. It works with any of those tools. Depending on whether your
meta-framework supports server-side rendering, you'll implement it differently.
You might decide to go with a built-time approach (for Gatsby/CRA), but as
mentioned, the true power of `mdx-bundler` comes in the form of on-demand
bundling. So it's best suited for SSR frameworks like Remix/Next.

</details>

<details>
  <summary>
    <strong>
      "Why the dodo bird emoji? 🦤"
    </strong>
  </summary>

Why not?

</details>

<details>
  <summary>
    <strong>
      "Why is esbuild a peer dependency?"
    </strong>
  </summary>

esbuild provides a service written in GO that it interacts with. Only one
instance of this service can run at a time and it must have an identical version
to the npm package. If it was a hard dependency you would only be able to use
the esbuild version mdx-bundler uses.

</details>

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Usage](#usage)
  - [Options](#options)
  - [Returns](#returns)
  - [Types](#types)
  - [Component Substitution](#component-substitution)
  - [Frontmatter and const](#frontmatter-and-const)
  - [Accessing named exports](#accessing-named-exports)
  - [Image Bundling](#image-bundling)
  - [Bundling a file.](#bundling-a-file)
  - [Known Issues](#known-issues)
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
npm install --save mdx-bundler esbuild
```

One of mdx-bundler's dependencies requires a working [node-gyp][node-gyp] setup
to be able to install correctly.

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

const result = await bundleMDX({
  source: mdxSource,
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
import {getMDXComponent} from 'mdx-bundler/client'

function Post({code, frontmatter}) {
  // it's generally a good idea to memoize this function call to
  // avoid re-creating the component every render.
  const Component = React.useMemo(() => getMDXComponent(code), [code])
  return (
    <>
      <header>
        <h1>{frontmatter.title}</h1>
        <p>{frontmatter.description}</p>
      </header>
      <main>
        <Component />
      </main>
    </>
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

### Options

#### source

The `string` source of your MDX.

_Can not be set if `file` is set_

#### file

The path to the file on your disk with the MDX in. You will probably want to
set [cwd](#cwd) as well.

_Can not be set if `source` is set_

#### files

The `files` config is an object of all the files you're bundling. The key is the
path to the file (relative to the MDX source) and the value is the string of the
file source code. You could get these from the filesystem or from a remote
database. If your MDX doesn't reference other files (or only imports things from
`node_modules`), then you can omit this entirely.

#### mdxOptions

This allows you to modify the built-in MDX configuration (passed to
`@mdx-js/esbuild`). This can be helpful for specifying your own
remarkPlugins/rehypePlugins.

The function is passed the default mdxOptions and the frontmatter.

```ts
bundleMDX({
  source: mdxSource,
  mdxOptions(options, frontmatter) {
    // this is the recommended way to add custom remark/rehype plugins:
    // The syntax might look weird, but it protects you in case we add/remove
    // plugins in the future.
    options.remarkPlugins = [...(options.remarkPlugins ?? []), myRemarkPlugin]
    options.rehypePlugins = [...(options.rehypePlugins ?? []), myRehypePlugin]

    return options
  },
})
```

#### esbuildOptions

You can customize any of esbuild options with the option `esbuildOptions`. This
takes a function which is passed the default esbuild options and the frontmatter
and expects an options object to be returned.

```typescript
bundleMDX({
  source: mdxSource,
  esbuildOptions(options, frontmatter) {
    options.minify = false
    options.target = [
      'es2020',
      'chrome58',
      'firefox57',
      'safari11',
      'edge16',
      'node12',
    ]

    return options
  },
})
```

More information on the available options can be found in the
[esbuild documentation](https://esbuild.github.io/api/#build-api).

It's recommended to use this feature to configure the `target` to your desired
output, otherwise, esbuild defaults to `esnext` which is to say that it doesn't
compile any standardized features so it's possible users of older browsers will
experience errors.

#### globals

This tells esbuild that a given module is externally available. For example, if
your MDX file uses the d3 library and you're already using the d3 library in
your app then you'll end up shipping `d3` to the user twice (once for your app
and once for this MDX component). This is wasteful and you'd be better off just
telling esbuild to _not_ bundle `d3` and you can pass it to the component
yourself when you call `getMDXComponent`.

Global external configuration options:
https://www.npmjs.com/package/@fal-works/esbuild-plugin-global-externals

Here's an example:

```tsx
// server-side or build-time code that runs in Node:
import {bundleMDX} from 'mdx-bundler'

const mdxSource = `
# This is the title

import leftPad from 'left-pad'

<div>{leftPad("Neat demo!", 12, '!')}</div>
`.trim()

const result = await bundleMDX({
  source: mdxSource,
  // NOTE: this is *only* necessary if you want to share deps between your MDX
  // file bundle and the host app. Otherwise, all deps will just be bundled.
  // So it'll work either way, this is just an optimization to avoid sending
  // multiple copies of the same library to your users.
  globals: {'left-pad': 'myLeftPad'},
})
```

```tsx
// server-rendered and/or client-side code that can run in the browser or Node:
import * as React from 'react'
import leftPad from 'left-pad'
import {getMDXComponent} from 'mdx-bundler/client'

function MDXPage({code}: {code: string}) {
  const Component = React.useMemo(
    () => getMDXComponent(result.code, {myLeftPad: leftPad}),
    [result.code, leftPad],
  )
  return (
    <main>
      <Component />
    </main>
  )
}
```

#### cwd

Setting `cwd` (_current working directory_) to a directory will allow esbuild to
resolve imports. This directory could be the directory the mdx content was read
from or a directory that off-disk mdx should be _run_ in.

_content/pages/demo.tsx_

```typescript
import * as React from 'react'

function Demo() {
  return <div>Neat demo!</div>
}

export default Demo
```

_src/build.ts_

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

const result = await bundleMDX({
  source: mdxSource,
  cwd: '/users/you/site/_content/pages',
})

const {code, frontmatter} = result
```

#### grayMatterOptions

This allows you to configure the
[gray-matter options](https://github.com/jonschlinkert/gray-matter#options).

Your function is passed the current gray-matter configuration for you to modify.
Return your modified configuration object for gray matter.

```js
bundleMDX({
  grayMatterOptions: options => {
    options.excerpt = true

    return options
  },
})
```

#### bundleDirectory & bundlePath

This allows you to set the output directory for the bundle and the public URL to
the directory. If one option is set the other must be as well.

_The Javascript bundle is not written to this directory and is still returned as
a string from `bundleMDX`._

This feature is best used with tweaks to `mdxOptions` and `esbuildOptions`. In
the example below `.png` files are written to the disk and then served from
`/file/`.

This allows you to store assets with your MDX and then have esbuild process them
like anything else.

_It is recommended that each bundle has its own `bundleDirectory` so that
multiple bundles don't overwrite each others assets._

```ts
const {code} = await bundleMDX({
  file: '/path/to/site/content/file.mdx',
  cwd: '/path/to/site/content',
  bundleDirectory: '/path/to/site/public/file',
  bundlePath: '/file/',
  mdxOptions: options => {
    options.remarkPlugins = [remarkMdxImages]

    return options
  },
  esbuildOptions: options => {
    options.loader = {
      ...options.loader,
      '.png': 'file',
    }

    return options
  },
})
```

### Returns

`bundleMDX` returns a promise for an object with the following properties.

- `code` - The bundle of your mdx as a `string`.
- `frontmatter` - The frontmatter `object` from gray-matter.
- `matter` - The whole
  [object returned by gray-matter](https://github.com/jonschlinkert/gray-matter#returned-object)

### Types

`mdx-bundler` supplies complete typings within its own package.

`bundleMDX` has a single type parameter which is the type of your frontmatter.
It defaults to `{[key: string]: any}` and must be an object. This is then used
to type the returned `frontmatter` and the frontmatter passed to
`esbuildOptions` and `mdxOptions`.

```ts
const {frontmatter} = bundleMDX<{title: string}>({source})

frontmatter.title // has type string
```

### Component Substitution

MDX Bundler passes on
[MDX's ability to substitute components](https://mdxjs.com/docs/using-mdx/#components)
through the `components` prop on the component returned by `getMDXComponent`.

Here's an example that removes _p_ tags from around images.

```tsx
import * as React from 'react'
import {getMDXComponent} from 'mdx-bundler/client'

const Paragraph: React.FC = props => {
  if (typeof props.children !== 'string' && props.children.type === 'img') {
    return <>{props.children}</>
  }

  return <p {...props} />
}

function MDXPage({code}: {code: string}) {
  const Component = React.useMemo(() => getMDXComponent(code), [code])

  return (
    <main>
      <Component components={{p: Paragraph}} />
    </main>
  )
}
```

### Frontmatter and const

You can reference frontmatter meta or consts in the mdx content.

```mdx
---
title: Example Post
---

export const exampleImage = 'https://example.com/image.jpg'

# {frontmatter.title}

<img src={exampleImage} alt="Image alt text" />
```

### Accessing named exports

You can use `getMDXExport` instead of `getMDXComponent` to treat the mdx file as
a module instead of just a component. It takes the same arguments that
`getMDXComponent` does.

```mdx
---
title: Example Post
---

export const toc = [{depth: 1, value: 'The title'}]

# The title
```

```js
import * as React from 'react'
import {getMDXExport} from 'mdx-bundler/client'

function MDXPage({code}: {code: string}) {
  const mdxExport = getMDXExport(code)
  console.log(mdxExport.toc) // [ { depth: 1, value: 'The title' } ]

  const Component = React.useMemo(() => mdxExport.default, [code])

  return <Component />
}
```

### Image Bundling

With the [cwd](#cwd) and the remark plugin
[remark-mdx-images](https://www.npmjs.com/package/remark-mdx-images) you can
bundle images in your mdx!

There are two loaders in esbuild that can be used here. The easiest is `dataurl`
which outputs the images as inline data urls in the returned code.

```js
import {remarkMdxImages} from 'remark-mdx-images'

const {code} = await bundleMDX({
  source: mdxSource,
  cwd: '/users/you/site/_content/pages',
  mdxOptions: options => {
    options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkMdxImages]

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
```

The `file` loader requires a little more configuration to get working. With the
`file` loader your images are copied to the output directory so esbuild needs to
be set to write files and needs to know where to put them plus the url of the
folder to be used in image sources.

> Each call to `bundleMDX` is isolated from the others. If you set the directory
> the same for everything `bundleMDX` will overwrite images without warning. As
> a result each _bundle_ needs its own output directory.

```js
// For the file `_content/pages/about.mdx`

const {code} = await bundleMDX({
  source: mdxSource,
  cwd: '/users/you/site/_content/pages',
  mdxOptions: options => {
    options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkMdxImages]

    return options
  },
  esbuildOptions: options => {
    // Set the `outdir` to a public location for this bundle.
    options.outdir = '/users/you/site/public/img/about'
    options.loader = {
      ...options.loader,
      // Tell esbuild to use the `file` loader for pngs
      '.png': 'file',
    }
    // Set the public path to /img/about
    options.publicPath = '/img/about'

    // Set write to true so that esbuild will output the files.
    options.write = true

    return options
  },
})
```

### Bundling a file.

If your MDX file is on your disk you can save some time and code by having
`mdx-bundler` read the file for you. Instead of supplying a `source` string you
can set `file` to the path of the MDX on disk. Set `cwd` to its folder so that
relative imports work.

```js
import {bundleMDX} from 'mdx-bundler'

const {code, frontmatter} = await bundleMDX({
  file: '/users/you/site/content/file.mdx',
  cwd: '/users/you/site/content/',
})
```

### Known Issues

#### Cloudflare Workers

We'd _love_ for this to work in cloudflare workers. Unfortunately cloudflares
have two limitations that prevent `mdx-bundler` from working in that
environment:

1. Workers can't run binaries. `bundleMDX` uses `esbuild` (a binary) to bundle
   your MDX code.
2. Workers can't run `eval` or similar. `getMDXComponent` evaluates the bundled
   code using `new Function`.

One workaround to this is to put your mdx-bundler related code in a different
environment and call that environment from within the Cloudflare worker. IMO,
this defeats the purpose of using Cloudflare workers. Another potential
workaround is to use WASM from within the worker. There is
[`esbuild-wasm`](https://esbuild.github.io/getting-started/#install-the-wasm-version)
but there are some issues with that package explained at that link. Then there's
[`wasm-jseval`](https://github.com/maple3142/wasm-jseval), but I couldn't get
that to run code that was output from `mdx-bundler` without error.

If someone would like to dig into this, that would be stellar, but unfortunately
it's unlikely I'll ever work on it.

#### Next.JS esbuild ENOENT

esbuild relies on `__dirname` to work out where is executable is, Next.JS and
Webpack can sometimes break this and esbuild needs to be told manually where to
look.

Adding the following code before your `bundleMDX` will point esbuild directly at
the correct executable for your platform.

```js
import path from 'path'

if (process.platform === 'win32') {
  process.env.ESBUILD_BINARY_PATH = path.join(
    process.cwd(),
    'node_modules',
    'esbuild',
    'esbuild.exe',
  )
} else {
  process.env.ESBUILD_BINARY_PATH = path.join(
    process.cwd(),
    'node_modules',
    'esbuild',
    'bin',
    'esbuild',
  )
}
```

More information on this issue can be found
[in this article](https://www.arcath.net/2021/03/mdx-bundler#esbuild-executable).

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
  <tbody>
    <tr>
      <td align="center"><a href="https://kentcdodds.com"><img src="https://avatars.githubusercontent.com/u/1500684?v=3?s=100" width="100px;" alt="Kent C. Dodds"/><br /><sub><b>Kent C. Dodds</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Documentation">📖</a> <a href="#infra-kentcdodds" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=kentcdodds" title="Tests">⚠️</a></td>
      <td align="center"><a href="https://github.com/benwis"><img src="https://avatars.githubusercontent.com/u/6953353?v=4?s=100" width="100px;" alt="benwis"/><br /><sub><b>benwis</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/issues?q=author%3Abenwis" title="Bug reports">🐛</a> <a href="https://github.com/kentcdodds/mdx-bundler/pulls?q=is%3Apr+reviewed-by%3Abenwis" title="Reviewed Pull Requests">👀</a></td>
      <td align="center"><a href="https://www.arcath.net"><img src="https://avatars.githubusercontent.com/u/19609?v=4?s=100" width="100px;" alt="Adam Laycock"/><br /><sub><b>Adam Laycock</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=Arcath" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=Arcath" title="Tests">⚠️</a> <a href="#ideas-Arcath" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/kentcdodds/mdx-bundler/pulls?q=is%3Apr+reviewed-by%3AArcath" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=Arcath" title="Documentation">📖</a></td>
      <td align="center"><a href="http://wooorm.com"><img src="https://avatars.githubusercontent.com/u/944406?v=4?s=100" width="100px;" alt="Titus"/><br /><sub><b>Titus</b></sub></a><br /><a href="#ideas-wooorm" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/kentcdodds/mdx-bundler/pulls?q=is%3Apr+reviewed-by%3Awooorm" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=wooorm" title="Code">💻</a></td>
      <td align="center"><a href="https://github.com/ChristianMurphy"><img src="https://avatars.githubusercontent.com/u/3107513?v=4?s=100" width="100px;" alt="Christian Murphy"/><br /><sub><b>Christian Murphy</b></sub></a><br /><a href="#ideas-ChristianMurphy" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center"><a href="https://ped.ro"><img src="https://avatars.githubusercontent.com/u/372831?v=4?s=100" width="100px;" alt="Pedro Duarte"/><br /><sub><b>Pedro Duarte</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=peduarte" title="Documentation">📖</a></td>
      <td align="center"><a href="https://keybase.io/erikras"><img src="https://avatars.githubusercontent.com/u/4396759?v=4?s=100" width="100px;" alt="Erik Rasmussen"/><br /><sub><b>Erik Rasmussen</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=erikras" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://github.com/ozyxdev"><img src="https://avatars.githubusercontent.com/u/83309085?v=4?s=100" width="100px;" alt="Omar Syx"/><br /><sub><b>Omar Syx</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/issues?q=author%3Aozyxdev" title="Bug reports">🐛</a></td>
      <td align="center"><a href="https://github.com/gaelhameon"><img src="https://avatars.githubusercontent.com/u/17253950?v=4?s=100" width="100px;" alt="Gaël Haméon"/><br /><sub><b>Gaël Haméon</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=gaelhameon" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/loiacon"><img src="https://avatars.githubusercontent.com/u/32134586?v=4?s=100" width="100px;" alt="Gabriel Loiácono"/><br /><sub><b>Gabriel Loiácono</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=loiacon" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=loiacon" title="Tests">⚠️</a></td>
      <td align="center"><a href="https://skovy.dev"><img src="https://avatars.githubusercontent.com/u/5247455?v=4?s=100" width="100px;" alt="Spencer Miskoviak"/><br /><sub><b>Spencer Miskoviak</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=skovy" title="Documentation">📖</a></td>
      <td align="center"><a href="https://caspertheghost.me"><img src="https://avatars.githubusercontent.com/u/53900565?v=4?s=100" width="100px;" alt="Casper"/><br /><sub><b>Casper</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=Dev-CasperTheGhost" title="Code">💻</a></td>
      <td align="center"><a href="http://a7sc11u.dev"><img src="https://avatars.githubusercontent.com/u/803868?v=4?s=100" width="100px;" alt="Apostolos Christodoulou"/><br /><sub><b>Apostolos Christodoulou</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=a7sc11u" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/yordis"><img src="https://avatars.githubusercontent.com/u/4237280?v=4?s=100" width="100px;" alt="Yordis Prieto"/><br /><sub><b>Yordis Prieto</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=yordis" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://github.com/xoumi"><img src="https://avatars.githubusercontent.com/u/24864287?v=4?s=100" width="100px;" alt="xoumi"/><br /><sub><b>xoumi</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=xoumi" title="Code">💻</a></td>
      <td align="center"><a href="http://yasint.dev"><img src="https://avatars.githubusercontent.com/u/25561152?v=4?s=100" width="100px;" alt="Yasin"/><br /><sub><b>Yasin</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=yasinmiran" title="Code">💻</a></td>
      <td align="center"><a href="https://moweb.dev"><img src="https://avatars.githubusercontent.com/u/22095656?v=4?s=100" width="100px;" alt="Mohammed 'Mo' Mulazada"/><br /><sub><b>Mohammed 'Mo' Mulazada</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=moniac" title="Documentation">📖</a></td>
      <td align="center"><a href="https://www.canrau.com"><img src="https://avatars.githubusercontent.com/u/5196971?v=4?s=100" width="100px;" alt="Can Rau"/><br /><sub><b>Can Rau</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=CanRau" title="Documentation">📖</a></td>
      <td align="center"><a href="http://hosenur.dev"><img src="https://avatars.githubusercontent.com/u/50978981?v=4?s=100" width="100px;" alt="Hosenur Rahaman"/><br /><sub><b>Hosenur Rahaman</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=HOSENUR" title="Documentation">📖</a></td>
      <td align="center"><a href="https://macieksitkowski.com"><img src="https://avatars.githubusercontent.com/u/58401630?v=4?s=100" width="100px;" alt="Maciek Sitkowski"/><br /><sub><b>Maciek Sitkowski</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=sitek94" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/priyang12"><img src="https://avatars.githubusercontent.com/u/72823974?v=4?s=100" width="100px;" alt="Priyang"/><br /><sub><b>Priyang</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=priyang12" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=priyang12" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center"><a href="https://github.com/theMosaad"><img src="https://avatars.githubusercontent.com/u/48773133?v=4?s=100" width="100px;" alt="Mosaad"/><br /><sub><b>Mosaad</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=theMosaad" title="Documentation">📖</a></td>
      <td align="center"><a href="https://github.com/stefanprobst"><img src="https://avatars.githubusercontent.com/u/20753323?v=4?s=100" width="100px;" alt="stefanprobst"/><br /><sub><b>stefanprobst</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=stefanprobst" title="Code">💻</a> <a href="https://github.com/kentcdodds/mdx-bundler/commits?author=stefanprobst" title="Tests">⚠️</a></td>
      <td align="center"><a href="https://vladmoroz.com"><img src="https://avatars.githubusercontent.com/u/8441036?v=4?s=100" width="100px;" alt="Vlad Moroz"/><br /><sub><b>Vlad Moroz</b></sub></a><br /><a href="https://github.com/kentcdodds/mdx-bundler/commits?author=vladmoroz" title="Code">💻</a></td>
    </tr>
  </tbody>
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
[node-gyp]: https://github.com/nodejs/node-gyp#installation
<!-- prettier-ignore-end -->
