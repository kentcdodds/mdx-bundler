import path from 'path'
import {createCompiler} from '@mdx-js/mdx'
import matter from 'gray-matter'
import type {OutputOptions, RollupOptions} from 'rollup'
import {build, Plugin} from 'esbuild'

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

  const inMemoryPlugin: Plugin = {
    name: 'inMemory',
    setup(build){
      build.onResolve({filter: /__mdx_bundler_fake_dir__/}, (args) => {
        if(absoluteFiles[args.path]){
          return {
            path: args.path,
            namespace: 'mdx-bundler',
            pluginData: {
              contents: absoluteFiles[args.path]
            }
          }
        }

        throw new Error(`Could not resolve ${args.path}`)
      })

      build.onLoad({filter: /.*/, namespace: 'mdx-bundler'}, (args) => {
        return {
          contents: args.pluginData.contents,
          loader: 'js'
        }
      })
    }
  }

  const bundle = await build({
    entryPoints: [entryPath],
    write: false,
    plugins: [inMemoryPlugin]
  })

  return {
    code: bundle.outputFiles[0],
    frontmatter,
  }
}

export {bundleMDX}
