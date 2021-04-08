import path from 'path'
import {StringDecoder} from 'string_decoder'
import remarkFrontmatter from 'remark-frontmatter'
import {remarkMdxFrontmatter} from 'remark-mdx-frontmatter'
import matter from 'gray-matter'
import * as esbuild from 'esbuild'
import {NodeResolvePlugin} from '@esbuild-plugins/node-resolve'
import {globalExternals} from '@fal-works/esbuild-plugin-global-externals'

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
  } = {},
) {
  // xdm is a native ESM, and we're running in a CJS context. This is the
  // only way to import ESM within CJS
  const [{compile: compileMDX}, {default: xdmESBuild}] = await Promise.all([
    await import('xdm'),
    await import('xdm/esbuild.js'),
  ])
  // extract the frontmatter
  const {data: frontmatter} = matter(mdxSource)

  const dir = path.join(process.cwd(), `__mdx_bundler_fake_dir__`)
  const entryPath = path.join(dir, './index.mdx')

  /** @type Record<string, string> */
  const absoluteFiles = {[entryPath]: mdxSource}

  for (const [filepath, fileCode] of Object.entries(files)) {
    absoluteFiles[path.join(dir, filepath)] = fileCode
  }

  /** @type import('esbuild').Plugin */
  const inMemoryPlugin = {
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
              text: `Could not resolve "${filePath}" from ${
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
              return {
                contents,
                loader: /** @type import('esbuild').Loader */ (fileType),
              }
            }
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

  const decoder = new StringDecoder('utf8')

  const code = decoder.write(Buffer.from(bundled.outputFiles[0].contents))

  return {
    code: `${code};return Component.default;`,
    frontmatter,
  }
}

export {bundleMDX}
