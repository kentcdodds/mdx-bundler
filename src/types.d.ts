// This file is for defining types that are annoying to define with jsdoc syntax
// It has to be at the root so when the src directory is compiled into the dist
// directory they both reference the same thing (because babel compiles away the
// types from the .d.ts files and typescript doesn't copy the .d.ts file).
// kcd-scripts could/should be updated to copy all .d.ts files to the dist directory.

import type {Plugin, BuildOptions, Loader} from 'esbuild'
import type {ModuleInfo} from '@fal-works/esbuild-plugin-global-externals'
import type {ProcessorOptions} from '@mdx-js/esbuild/lib'
import type {GrayMatterOption, Input, GrayMatterFile} from 'gray-matter'
import type {MDXComponents} from 'mdx/types'
import type {VFile,VFileOptions} from 'vfile'

type ESBuildOptions = BuildOptions

export type MDXContentProps = {
  [props: string]: unknown
  components?: MDXComponents
}

export type BundleMDX<Frontmatter extends {[key: string]: any}> =
  | BundleMDXSource<Frontmatter>
  | BundleMDXFile<Frontmatter>

export type BundleMDXSource<Frontmatter> = {
  /**
   * Your MDX source.
   */
  source: string | VFile | VFileOptions
  file?: undefined
} & BundleMDXOptions<Frontmatter>

export type BundleMDXFile<Frontmatter> = {
  /**
   * The path to the mdx file on disk.
   */
  file: string
  source?: undefined
} & BundleMDXOptions<Frontmatter>

type BundleMDXOptions<Frontmatter> = {
  /**
   * The dependencies of the MDX code to be bundled
   *
   * @example
   * ```
   * bundleMDX({
   *   source: mdxString,
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
   * This allows you to modify the built-in MDX configuration (passed to @mdx-js/mdx compile).
   * This can be helpful for specifying your own remarkPlugins/rehypePlugins.
   *
   * @param vfileCompatible the path and contents of the mdx file being compiled
   * @param options the default options which you are expected to modify and return
   * @returns the options to be passed to @mdx-js/mdx compile
   *
   * @example
   * ```
   * bundleMDX({
   *   source: mdxString,
   *   mdxOptions(options) {
   *     // this is the recommended way to add custom remark/rehype plugins:
   *     // The syntax might look weird, but it protects you in case we add/remove
   *     // plugins in the future.
   *     options.remarkPlugins = [...(options.remarkPlugins ?? []), myRemarkPlugin]
   *     options.rehypePlugins = [...(options.rehypePlugins ?? []), myRehypePlugin]
   *
   *     return options
   *   }
   * })
   * ```
   */
  mdxOptions?: (
    options: ProcessorOptions,
    frontmatter: Frontmatter,
  ) => ProcessorOptions
  /**
   * This allows you to modify the built-in esbuild configuration. This can be
   * especially helpful for specifying the compilation target.
   *
   * @example
   * ```
   * bundleMDX({
   *   source: mdxString,
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
  esbuildOptions?: (
    options: ESBuildOptions,
    frontmatter: Frontmatter,
  ) => ESBuildOptions
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
   * bundlMDX({
   *   source: mdxString,
   *   globals: {'left-pad': 'myLeftPad'},
   * })
   *
   * // on the client side
   *
   * import leftPad from 'left-pad'
   *
   * const Component = getMDXComponent(result.code, {myLeftPad: leftPad})
   * ```
   */
  globals?: Record<string, string | ModuleInfo>
  /**
   * The current working directory for the mdx bundle. Supplying this allows
   * esbuild to resolve paths itself instead of using `files`.
   *
   * This could be the directory the mdx content was read from or in the case
   * of off-disk content a common root directory.
   *
   * @example
   * ```
   * bundleMDX({
   *  source: mdxString
   *  cwd: '/users/you/site/mdx_root'
   * })
   * ```
   */
  cwd?: string
  /**
   * This allows you to configure the gray matter options.
   *
   * @example
   * ```
   * bundleMDX({
   *   source: mdxString,
   *   grayMatterOptions: (options) => {
   *     options.excerpt = true
   *
   *     return options
   *   }
   * })
   * ```
   */
  grayMatterOptions?: <I extends Input>(
    options: GrayMatterOption<I, any>,
  ) => GrayMatterOption<I, any>
  /**
   * This allows you to set the output directory of the bundle. You will need
   * to set `bundlePath` as well to give esbuild the public url to the folder.
   *
   * *Note, the javascrpt bundle will not be placed here, only assets
   * that can't be part of the main bundle.*
   *
   * @example
   * ```
   * bundleMDX({
   *   file: '/path/to/file.mdx',
   *   bundleDirectory: '/path/to/bundle'
   *   bundlePath: '/path/to/public/bundle'
   * })
   * ```
   */
  bundleDirectory?: string
  /**
   * @see bundleDirectory
   */
  bundlePath?: string
}

type MDXExport<
  ExportObject extends {},
  Frontmatter = {[key: string]: unknown},
> = {
  default: React.FunctionComponent<MDXContentProps>
  frontmatter: Frontmatter
} & ExportObject

type MDXExportFunction<
  ExportedObject extends {},
  Frontmatter extends Record<string, unknown>,
> = (
  code: string,
  globals?: Record<string, unknown>,
) => ReturnType<MDXExport<ExportedObject, Frontmatter>>
