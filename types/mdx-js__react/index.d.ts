declare module '@mdx-js/react' {
  import * as React from 'react'
  type ComponentType =
    | 'a'
    | 'blockquote'
    | 'code'
    | 'del'
    | 'em'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'hr'
    | 'img'
    | 'inlineCode'
    | 'li'
    | 'ol'
    | 'p'
    | 'pre'
    | 'strong'
    | 'sup'
    | 'table'
    | 'td'
    | 'thematicBreak'
    | 'tr'
    | 'ul'
  export type Components = {
    [key in ComponentType]?: React.ComponentType<unknown>
  }
  export interface MDXProviderProps {
    children: React.ReactNode
    components?: Components
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  export class MDXProvider extends React.Component<MDXProviderProps> {}
  // eslint-disable-next-line
  export const mdx = React.createElement
}
