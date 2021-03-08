import path from 'path'
import {StringDecoder} from 'string_decoder'
import {createCompiler} from '@mdx-js/mdx'
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
    remarkPlugins = [],
    esbuildOptions = (options: ESBuildOptions) => options,
    globals = {},
  }: {
    files?: Record<string, string>
    remarkPlugins?: Array<unknown>
    esbuildOptions?: (options: ESBuildOptions) => ESBuildOptions
    globals?: Record<string, string | ModuleInfo>
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
  const entryPath = path.join(dir, './index.mdx.jsx')
  const absoluteFiles: Record<string, string> = {
    [entryPath]: entryCode,
  }
  for (const [filepath, fileCode] of Object.entries(files)) {
    absoluteFiles[path.join(dir, filepath)] = fileCode
  }

  const inMemoryPlugin: Plugin = {
    name: 'inMemory',
    setup(build) {
      build.onResolve({filter: /.*/}, args => {
        if (args.path === entryPath) return {path: args.path}

        const modulePath = path.resolve(path.dirname(args.importer), args.path)

        if (modulePath in absoluteFiles) return {path: modulePath}

        for (const ext of ['.js', '.ts', '.jsx', '.tsx']) {
          const fullModulePath = `${modulePath}${ext}`
          if (fullModulePath in absoluteFiles) return {path: fullModulePath}
        }

        return {
          errors: [
            {
              text: `Could not resolve "${args.path}" in ${
                args.importer === entryPath
                  ? 'the entry MDX file.'
                  : `"${args.importer.replace(dir, '.')}"`
              }`,
              location: null,
            },
          ],
        }
      })

      build.onLoad({filter: /__mdx_bundler_fake_dir__/}, args => {
        return {
          contents: absoluteFiles[args.path],
          loader: 'jsx',
        }
      })
    },
  }

  const buildOptions = esbuildOptions({
    entryPoints: [entryPath],
    write: false,
    plugins: [
      globalExternals(globals),
      nodeResolve({
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
      }),
      inMemoryPlugin,
    ],
    bundle: true,
    external: ['react', 'react-dom'],
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
