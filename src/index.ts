import path from 'path'
import {StringDecoder} from 'string_decoder'
import {compile as compileMDX} from 'xdm'
import xdm from 'xdm/esbuild.js'
import matter from 'gray-matter'
import {build as bundle, Plugin, BuildOptions} from 'esbuild'
import nodeResolve from '@esbuild-plugins/node-resolve'
import {globalExternals} from '@fal-works/esbuild-plugin-global-externals'
import type {ModuleInfo} from '@fal-works/esbuild-plugin-global-externals'

type ESBuildOptions = BuildOptions & {write: false}

async function bundleMDX(
  mdxSource: string,
  {
    files = {},
    esbuildOptions = (options: ESBuildOptions) => options,
    globals = {},
  }: {
    files?: Record<string, string>
    esbuildOptions?: (options: ESBuildOptions) => ESBuildOptions
    globals?: Record<string, string | ModuleInfo>
  } = {},
) {
  // extract the frontmatter
  const {data: frontmatter, content: entryCode} = matter(mdxSource)

  const dir = path.join(process.cwd(), `__mdx_bundler_fake_dir__`)
  const entryPath = path.join(dir, './index.mdx')

  const absoluteFiles: Record<string, string> = {[entryPath]: entryCode}

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
          const fileType = path.extname(filePath)
          const contents = absoluteFiles[filePath]

          switch (fileType) {
            case '.json':
              return {contents, loader: 'json'}
            case '.ts':
            case '.tsx':
              return {contents, loader: 'tsx'}
            case '.jsx':
            case '.js':
              return {contents, loader: 'jsx'}
            case '.mdx': {
              const vfile = await compileMDX({path: filePath, contents})
              return {contents: vfile.contents.toString(), loader: 'jsx'}
            }
            default:
              throw new Error(`Unsupported file type: ${filePath}`)
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
