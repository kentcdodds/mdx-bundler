import fs from 'fs'
import path from 'path'
import {StringDecoder} from 'string_decoder'
import remarkFrontmatter from 'remark-frontmatter'
import {remarkMdxFrontmatter} from 'remark-mdx-frontmatter'
import matter from 'gray-matter'
import * as esbuild from 'esbuild'
import {NodeResolvePlugin} from '@esbuild-plugins/node-resolve'
import {globalExternals} from '@fal-works/esbuild-plugin-global-externals'
import dirnameMessedUp from './dirname-messed-up.cjs'

const {readFile, unlink} = fs.promises

/**
 *
 * @param {string} mdxSource - A string of mdx source code
 * @param {import('./types').BundleMDXOptions} options
 * @returns
 */
async function bundleMDX(
  mdxSource,
  {
    files = {},
    xdmOptions = (vfileCompatible, options) => options,
    esbuildOptions = options => options,
    globals = {},
    cwd = path.join(process.cwd(), `__mdx_bundler_fake_dir__`),
  } = {},
) {
  if (dirnameMessedUp && !process.env.ESBUILD_BINARY_PATH) {
    console.warn(
      `mdx-bundler warning: esbuild maybe unable to find its binary, if your build fails you'll need to set ESBUILD_BINARY_PATH. Learn more: https://github.com/kentcdodds/mdx-bundler/blob/main/README.md#nextjs-esbuild-enoent`,
    )
  }

  // xdm is a native ESM, and we're running in a CJS context. This is the
  // only way to import ESM within CJS
  const [{compile: compileMDX}, {default: xdmESBuild}] = await Promise.all([
    await import('xdm'),
    await import('xdm/esbuild.js'),
  ])
  // extract the frontmatter
  const {data: frontmatter} = matter(mdxSource)

  const entryPath = path.join(cwd, './_mdx_bundler_entry_point.mdx')

  /** @type Record<string, string> */
  const absoluteFiles = {[entryPath]: mdxSource}

  for (const [filepath, fileCode] of Object.entries(files)) {
    absoluteFiles[path.join(cwd, filepath)] = fileCode
  }

  /** @type import('esbuild').Plugin */
  const inMemoryPlugin = {
    name: 'inMemory',
    setup(build) {
      build.onResolve({filter: /.*/}, ({path: filePath, importer}) => {
        if (filePath === entryPath)
          return {path: filePath, pluginData: {inMemory: true}}

        const modulePath = path.resolve(path.dirname(importer), filePath)

        if (modulePath in absoluteFiles)
          return {path: modulePath, pluginData: {inMemory: true}}

        for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.json', '.mdx']) {
          const fullModulePath = `${modulePath}${ext}`
          if (fullModulePath in absoluteFiles)
            return {path: fullModulePath, pluginData: {inMemory: true}}
        }

        // Return an empty object so that esbuild will handle resolving the file itself.
        return {}
      })

      build.onLoad({filter: /.*/}, async ({path: filePath, pluginData}) => {
        if (pluginData === undefined || !pluginData.inMemory) {
          // Return an empty object so that esbuild will load & parse the file contents itself.
          return {}
        }

        // the || .js allows people to exclude a file extension
        const fileType = (path.extname(filePath) || '.jsx').slice(1)
        const contents = absoluteFiles[filePath]

        switch (fileType) {
          case 'mdx': {
            /** @type import('xdm/lib/compile').VFileCompatible */
            const vFileCompatible = {
              path: filePath,
              contents,
            }
            const vfile = await compileMDX(
              vFileCompatible,
              xdmOptions(vFileCompatible, {
                jsx: true,
                remarkPlugins: [
                  remarkFrontmatter,
                  [remarkMdxFrontmatter, {name: 'frontmatter'}],
                ],
              }),
            )
            return {contents: vfile.toString(), loader: 'jsx'}
          }
          default: {
            /** @type import('esbuild').Loader */
            let loader

            if (
              build.initialOptions.loader &&
              build.initialOptions.loader[`.${fileType}`]
            ) {
              loader = build.initialOptions.loader[`.${fileType}`]
            } else {
              loader = /** @type import('esbuild').Loader */ (fileType)
            }

            return {
              contents,
              loader,
            }
          }
        }
      })
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
      // eslint-disable-next-line babel/new-cap
      NodeResolvePlugin({extensions: ['.js', '.ts', '.jsx', '.tsx']}),
      inMemoryPlugin,
      // NOTE: the only time the xdm esbuild plugin will be used
      // is if it's not processed by our inMemory plugin which will
      // only happen for mdx files imported from node_modules.
      // This is an edge case, but it's easy enough to support so we do.
      // If someone wants to customize *this* particular xdm compilation,
      // they'll need to use the esbuildOptions function to swap this
      // for their own configured version of this plugin.
      xdmESBuild(),
    ],
    bundle: true,
    format: 'iife',
    globalName: 'Component',
    minify: true,
  })

  const bundled = await esbuild.build(buildOptions)

  if (bundled.outputFiles) {
    const decoder = new StringDecoder('utf8')

    const code = decoder.write(Buffer.from(bundled.outputFiles[0].contents))

    return {
      code: `${code};return Component.default;`,
      frontmatter,
    }
  }

  if (buildOptions.outdir && buildOptions.write) {
    const code = await readFile(
      path.join(buildOptions.outdir, '_mdx_bundler_entry_point.js'),
    )

    await unlink(path.join(buildOptions.outdir, '_mdx_bundler_entry_point.js'))

    return {
      code: `${code};return Component.default;`,
      frontmatter,
    }
  }

  throw new Error(
    "You must either specify `write: false` or `write: true` and `outdir: '/path'` in your esbuild options",
  )
}

export {bundleMDX}
