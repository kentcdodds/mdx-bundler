import path from 'path'
import {StringDecoder} from 'string_decoder'
import {compile as compileMDX} from 'xdm'
import xdm from 'xdm/esbuild.js'
import remarkFrontmatter from 'remark-frontmatter'
import {remarkMdxFrontmatter} from 'remark-mdx-frontmatter'
import matter from 'gray-matter'
import {build as bundle} from 'esbuild'
import type {Plugin, BuildOptions, Loader} from 'esbuild'
import nodeResolve from '@esbuild-plugins/node-resolve'
import {globalExternals} from '@fal-works/esbuild-plugin-global-externals'
import type {ModuleInfo} from '@fal-works/esbuild-plugin-global-externals'
import {PluggableList} from 'xdm/lib/core'

type ESBuildOptions = BuildOptions & {write: false}

type BundleMDXOptions = {
  /**
   * The dependencies of the MDX code to be bundled
   *
   * @example
   * ```
   * bundleMDX(mdxString, {
   *   files: {
   *     './components.tsx': `
   *       import * as React from 'react'
   *
   *      type CounterProps = {initialCount: number, step: number}
   *
   *       function Counter({initialCount = 0, step = 1}: CounterProps) {
   *         const [count, setCount] = React.useState(initialCount)
   *         const increment = () => setCount(c => c + step)
   *         return <button onClick={increment}>{count}</button>
   *       }
   *     `
   *   },
   * })
   * ```
   */
  files?: Record<string, string>
  /**
   * The remark plugins you want applied when compiling the MDX
   *
   * NOTE: Specifying this will override the default value for frontmatter support
   * so if you want to keep that, you'll need to include remark-frontmatter
   * and remark-mdx-frontmatter yourself
   */
  remarkPlugins?: PluggableList
  /**
   * This allows you to modify the built-in esbuild configuration. This can be
   * especially helpful for specifying the compilation target.
   *
   * @example
   * ```
   * bundleMDX(mdxString, {
   *   esbuildOptions(options) {
   *     options.target = [
   *       'es2020',
   *       'chrome58',
   *       'firefox57',
   *       'safari11',
   *       'edge16',
   *       'node12',
   *     ]
   *     return options
   *   }
   * })
   * ```
   */
  esbuildOptions?: (options: ESBuildOptions) => ESBuildOptions
  /**
   * Any variables you want treated as global variables in the bundling.
   *
   * NOTE: These do not have to be technically global as you will be providing
   * their values when you use getMDXComponent, but as far as esbuild is concerned
   * it will treat these values as global variables so they will not be included
   * in the bundle.
   *
   * @example
   * ```
   * bundlMDX(mdxString, {
   *   globals: {'left-pad': 'myLeftPad'},
   * })
   *
   * // then later
   *
   * import leftPad from 'left-pad'
   *
   * const Component = getMDXComponent(result.code, {myLeftPad: leftPad})
   * ```
   */
  globals?: Record<string, string | ModuleInfo>
}

async function bundleMDX(
  mdxSource: string,
  {
    files = {},
    esbuildOptions = (options: ESBuildOptions) => options,
    remarkPlugins = [
      remarkFrontmatter,
      [remarkMdxFrontmatter, {name: 'frontmatter'}],
    ],
    globals = {},
  }: BundleMDXOptions = {},
) {
  // extract the frontmatter
  const {data: frontmatter} = matter(mdxSource)

  const dir = path.join(process.cwd(), `__mdx_bundler_fake_dir__`)
  const entryPath = path.join(dir, './index.mdx')

  const absoluteFiles: Record<string, string> = {[entryPath]: mdxSource}

  for (const [filepath, fileCode] of Object.entries(files)) {
    absoluteFiles[path.join(dir, filepath)] = fileCode
  }

  const inMemoryPlugin: Plugin = {
    name: 'inMemory',
    setup(build) {
      build.onResolve({filter: /.*/}, ({path: filePath, importer}) => {
        if (filePath === entryPath) return {path: filePath}

        const modulePath = path.resolve(path.dirname(importer), filePath)

        if (modulePath in absoluteFiles) return {path: modulePath}

        for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.json', '.mdx']) {
          const fullModulePath = `${modulePath}${ext}`
          if (fullModulePath in absoluteFiles) return {path: fullModulePath}
        }

        return {
          errors: [
            {
              text: `Could not resolve "${filePath}" in ${
                importer === entryPath
                  ? 'the entry MDX file.'
                  : `"${importer.replace(dir, '.')}"`
              }`,
              location: null,
            },
          ],
        }
      })

      build.onLoad(
        {filter: /__mdx_bundler_fake_dir__/},
        async ({path: filePath}) => {
          // the || .js allows people to exclude a file extension
          const fileType = (path.extname(filePath) || '.jsx').slice(1)
          const contents = absoluteFiles[filePath]

          switch (fileType) {
            case 'mdx': {
              const vfile = await compileMDX(
                {path: filePath, contents},
                {jsx: false, remarkPlugins},
              )
              return {contents: vfile.contents.toString(), loader: 'jsx'}
            }
            default:
              return {contents, loader: fileType as Loader}
          }
        },
      )
    },
  }

  const buildOptions = esbuildOptions({
    entryPoints: [entryPath],
    write: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    plugins: [
      globalExternals({
        ...globals,
        react: {
          varName: 'React',
          type: 'cjs',
        },
        'react-dom': {
          varName: 'ReactDOM',
          type: 'cjs',
        },
      }),
      nodeResolve({extensions: ['.js', '.ts', '.jsx', '.tsx']}),
      inMemoryPlugin,
      xdm(),
    ],
    bundle: true,
    format: 'iife',
    globalName: 'Component',
    minify: true,
  })

  const bundled = await bundle(buildOptions)

  const decoder = new StringDecoder('utf8')

  const code = decoder.write(Buffer.from(bundled.outputFiles[0].contents))

  return {
    code: `${code};return Component.default;`,
    frontmatter,
  }
}

export {bundleMDX}
