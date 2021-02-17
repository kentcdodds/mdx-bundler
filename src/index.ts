import path from 'path'
import {createCompiler} from '@mdx-js/mdx'
import {babel as rollupBabel} from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import matter from 'gray-matter'
import type {OutputOptions, RollupOptions} from 'rollup'
import {rollup} from 'rollup'
import {terser} from 'rollup-plugin-terser'

async function bundleMDX(
  mdxSource: string,
  {
    files = {},
    remarkPlugins = [],
    rollup: {
      getInputOptions = (options: RollupOptions) => options,
      getOutputOptions = (options: OutputOptions) => options,
    } = {},
  }: {
    files?: Record<string, string>
    remarkPlugins?: Array<unknown>
    rollup?: {
      getInputOptions?: (options: RollupOptions) => RollupOptions
      getOutputOptions?: (options: OutputOptions) => OutputOptions
    }
  } = {},
) {
  // extract the frontmatter
  const {data: frontmatter, content: mdx} = matter(mdxSource)

  // I do not want to take the time to type mdx...
  // eslint-disable-next-line
  const {contents: entryCode} = (await createCompiler({
    remarkPlugins,
  }).process(mdx)) as {contents: string}

  const dir = path.join(process.cwd(), `__mdx_bundler_fake_dir__`)
  const entryPath = path.join(dir, './index.mdx.js')
  const absoluteFiles: Record<string, string> = {
    [entryPath]: entryCode,
  }
  for (const [filepath, fileCode] of Object.entries(files)) {
    absoluteFiles[path.join(dir, filepath)] = fileCode
  }
  const inMemoryModulePlugin = {
    name: 'in-memory-module',
    resolveId(importee: string, importer?: string) {
      if (!importer || importee === entryPath) return importee
      if (!importee[0].startsWith('.')) return null

      const resolved = path.resolve(path.dirname(importer), importee)

      if (resolved in absoluteFiles) return resolved
      for (const ext of ['.js', '.tsx', '.jsx', '.ts']) {
        const resolvedWithExt = `${resolved}${ext}`
        if (resolvedWithExt in absoluteFiles) return resolvedWithExt
      }
      throw new Error(
        `Could not resolve '${importee}' from ${
          importer === entryPath
            ? 'the entry MDX file'
            : `'${importer.replace(`${dir}/`, '')}'`
        }`,
      )
    },
    load(id: string) {
      if (absoluteFiles[id]) return absoluteFiles[id]
      return null
    },
  }

  const inputOptions = getInputOptions({
    external: ['react', 'react-dom'],
    input: entryPath,
    plugins: [
      inMemoryModulePlugin,
      nodeResolve(),
      commonjs({include: 'node_modules/**', sourceMap: false}),
      json(),
      rollupBabel({
        babelHelpers: 'inline',
        configFile: false,
        exclude: /node_modules/,
        extensions: ['.js', '.ts', '.tsx', '.md', '.mdx', '.jsx', '.json'],
        presets: [
          ['@babel/preset-react', {pragma: 'mdx'}],
          '@babel/preset-env',
          ['@babel/preset-typescript', {allExtensions: true, isTSX: true}],
        ],
        sourceMaps: false,
      }),
      terser(),
    ],
  })

  const outputOptions = getOutputOptions({
    name: 'Component',
    format: 'iife',
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
  })

  const bundle = await rollup(inputOptions)
  const result = await bundle.generate(outputOptions)

  return {
    code: `${result.output[0].code};return Component;`,
    frontmatter,
  }
}

export {bundleMDX}
