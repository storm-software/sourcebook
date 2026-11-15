<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-dark.gif">
  <source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-light.gif">
<img src="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-dark.gif" width="100%" alt="Sourcebook" />
</picture>
</div>
<br />

# Sourcebook - UI

Render pages compiled by [`@sourcebook/core`](../core) with [Cyclone UI](https://github.com/storm-software/cyclone-ui) components. The API follows [Fumadocs UI](https://www.fumadocs.dev/docs/ui): `DocsLayout` takes a page tree, `DocsPage` takes a page and shows its table of contents, and `DocsBody` renders the page HTML.

```tsx
import { loadDocumentationPages } from "@sourcebook/core"
import { createPageTree, DocsLayout, DocsPage } from "@sourcebook/ui"

const pages = await loadDocumentationPages("docs")
const tree = createPageTree(pages, "/docs")
const page = pages.find(entry => entry.slug === "getting-started")!

export default function Page() {
  return (
    <DocsLayout
      tree={tree}
      title="Sourcebook"
      activeUrl="/docs/getting-started">
      <DocsPage page={page} />
    </DocsLayout>
  )
}
```

Render it inside the Cyclone UI theme provider. For Next.js or Vite, use `@cyclone-ui/nextjs` or `@cyclone-ui/vite`, which also alias `react-native` to `react-native-web` and `react-native-svg` to `@tamagui/react-native-svg`.

`DocsBody` maps the elements that `@sourcebook/core` emits to Cyclone UI components: headings to `HeadingText`, paragraphs to `BodyText`, links to `Link`, inline code to `InlineCodeText`, code blocks to `CodeBlock`, admonitions to `Callout`, and `hr` to `Divider`. Other elements render as plain HTML. Pass `components` to override or add an element:

```tsx
<DocsPage page={page} components={{ table: MyTable }} />
```

The page HTML is rendered as is, including raw HTML from the Markdown, so render only trusted pages.

## Cyclone UI components

The Cyclone UI components in `src/components` were copied from the registry with the `cyclone-ui` CLI (see `components.json`). Do not edit them here. To update them, run:

```sh
pnpm exec cyclone-ui update-components
```
