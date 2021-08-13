import fs from 'fs'
import path from 'path'
import {StringDecoder} from 'string_decoder'
import remarkFrontmatter from 'remark-frontmatter'
import {remarkMdxFrontmatter} from 'remark-mdx-frontmatter'
import grayMatter from 'gray-matter'
import * as esbuild from 'esbuild'
import {NodeResolvePlugin} from '@esbuild-plugins/node-resolve'
import {globalExternals} from '@fal-works/esbuild-plugin-global-externals'
import {v4 as uuid} from 'uuid'
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
    xdmOptions = options => options,
    esbuildOptions = options => options,
    globals = {},
    cwd = path.join(process.cwd(), `__mdx_bundler_fake_dir__`),
    grayMatterOptions = options => options,
  } = {},
) {
  /* c8 ignore start */
  if (dirnameMessedUp && !process.env.ESBUILD_BINARY_PATH) {
    console.warn(
      `mdx-bundler warning: esbuild maybe unable to find its binary, if your build fails you'll need to set ESBUILD_BINARY_PATH. Learn more: https://github.com/kentcdodds/mdx-bundler/blob/main/README.md#nextjs-esbuild-enoent`,
    )
  }
  /* c8 ignore stop */

  // xdm is a native ESM, and we're running in a CJS context. This is the
  // only way to import ESM within CJS
  const [{default: xdmESBuild}] = await Promise.all([
    await import('xdm/esbuild.js'),
  ])

  const entryPath = path.join(cwd, `./_mdx_bundler_entry_point-${uuid()}.mdx`)

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
        if (filePath === entryPath) {
          return {
            path: filePath,
            pluginData: {inMemory: true, contents: absoluteFiles[filePath]},
          }
        }

        const modulePath = path.resolve(path.dirname(importer), filePath)

        if (modulePath in absoluteFiles) {
          return {
            path: modulePath,
            pluginData: {inMemory: true, contents: absoluteFiles[modulePath]},
          }
        }

        for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.json', '.mdx']) {
          const fullModulePath = `${modulePath}${ext}`
          if (fullModulePath in absoluteFiles) {
            return {
              path: fullModulePath,
              pluginData: {
                inMemory: true,
                contents: absoluteFiles[fullModulePath],
              },
            }
          }
        }

        // Return an empty object so that esbuild will handle resolving the file itself.
        return {}
      })

      build.onLoad({filter: /.*/}, async ({path: filePath, pluginData}) => {
        if (pluginData === undefined || !pluginData.inMemory) {
          // Return an empty object so that esbuild will load & parse the file contents itself.
          return null
        }

        // the || .js allows people to exclude a file extension
        const fileType = (path.extname(filePath) || '.jsx').slice(1)
        const contents = absoluteFiles[filePath]

        if (fileType === 'mdx') return null

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
      })
    },
  }

  const buildOptions = esbuildOptions({
    entryPoints: [entryPath],
    write: false,
    absWorkingDir: cwd,
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
        'react/jsx-runtime': {
          varName: '_jsx_runtime',
          type: 'cjs',
        },
      }),
      // eslint-disable-next-line @babel/new-cap
      NodeResolvePlugin({
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
        resolveOptions: {basedir: cwd},
      }),
      inMemoryPlugin,
      xdmESBuild(
        xdmOptions({
          remarkPlugins: [
            remarkFrontmatter,
            [remarkMdxFrontmatter, {name: 'frontmatter'}],
          ],
        }),
      ),
    ],
    bundle: true,
    format: 'iife',
    globalName: 'Component',
    minify: true,
  })

  // Extract the front matter from the source or the entry point

  /** @type grayMatter.GrayMatterFile<any> */
  let matter

  // We have to be a bit specific here to ensure type safety
  if (
    buildOptions.entryPoints &&
    Array.isArray(buildOptions.entryPoints) &&
    buildOptions.entryPoints[0] !== entryPath
  ) {
    //The user has replaced the entrypoint, we can assume this means `mdxSource` is empty

    matter = grayMatter.read(buildOptions.entryPoints[0], grayMatterOptions({}))
  } else {
    matter = grayMatter(mdxSource, grayMatterOptions({}))
  }

  const bundled = await esbuild.build(buildOptions)

  if (bundled.outputFiles) {
    const decoder = new StringDecoder('utf8')

    const code = decoder.write(Buffer.from(bundled.outputFiles[0].contents))

    return {
      code: `${code};return Component.default;`,
      frontmatter: matter.data,
      errors: bundled.errors,
      matter,
    }
  }

  if (buildOptions.outdir && buildOptions.write) {
    // We know that this has to be an array of entry point strings, with a single entry
    const entryFile = /** @type {{entryPoints: string[]}} */ (buildOptions)
      .entryPoints[0]

    const fileName = path.basename(entryFile).replace(/\.[^/.]+$/, '.js')

    const code = await readFile(path.join(buildOptions.outdir, fileName))

    await unlink(path.join(buildOptions.outdir, fileName))

    return {
      code: `${code};return Component.default;`,
      frontmatter: matter.data,
      errors: bundled.errors,
      matter,
    }
  }

  throw new Error(
    "You must either specify `write: false` or `write: true` and `outdir: '/path'` in your esbuild options",
  )
}

/**
 *
 * @param {string} mdxPath - The file path to bundle.
 * @param {import('./types').BundleMDXOptions} options
 * @returns
 */
async function bundleMDXFile(
  mdxPath,
  {
    files = {},
    xdmOptions = options => options,
    esbuildOptions = options => options,
    globals = {},
    cwd,
    grayMatterOptions = options => options,
  } = {},
) {
  return bundleMDX('', {
    files,
    xdmOptions,
    esbuildOptions: options => {
      options.entryPoints = [mdxPath]

      return esbuildOptions(options)
    },
    globals,
    cwd: cwd ? cwd : path.dirname(mdxPath),
    grayMatterOptions,
  })
}

export {bundleMDX, bundleMDXFile}
