// Type declaration override for remark-mdx-images to fix type compatibility issues
declare module 'remark-mdx-images' {
  import type {Plugin} from 'unified'
  const remarkMdxImages: Plugin
  export default remarkMdxImages
}
