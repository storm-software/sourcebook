<!-- START header -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->


<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-dark.gif">
  <source media="(prefers-color-scheme: light)" srcset="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-light.gif">
<img src="https://public.storm-cdn.com/sourcebook/media/banner-1280x427-dark.gif" width="100%" alt="Sourcebook" />
</picture>
</div>
<br />

<div align="center">
<b>
<a href="https://stormsoftware.com/projects/sourcebook" target="_blank">Website</a>  •
<a href="https://github.com/storm-software/sourcebook" target="_blank">GitHub</a>  •
<a href="https://discord.gg/MQ6YVzakM5">Discord</a>  •  <a href="https://docs.stormsoftware.com/projects/sourcebook" target="_blank">Docs</a>  •  <a href="https://stormsoftware.com/contact" target="_blank">Contact</a>  •
<a href="https://github.com/storm-software/sourcebook/issues/new?assignees=&labels=bug&template=bug-report.yml&title=Bug Report%3A+">Report a Bug</a>
</b>
</div>
<br />

📓 **Sourcebook** helps you automate your technical docs and blog content.

<h3 align="center">💻 Visit <a href="https://stormsoftware.com" target="_blank">stormsoftware.com</a> to stay up to date with this developer</h3>
<br />

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge&logo=commitlint&color=1fb2a6)](http://commitizen.github.io/cz-cli/)&nbsp;![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=for-the-badge&color=1fb2a6)&nbsp;![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/storm-software/sourcebook/release.yml?style=for-the-badge&logo=github-actions&color=1fb2a6)

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

> [!IMPORTANT] 
> This repository, and the apps, libraries, and tools contained within, is still in it's initial development phase. As a result, bugs and issues are expected with it's usage. When the main development phase completes, a proper release will be performed, the packages will be available through NPM (and other distributions), and this message will be removed. However, in the meantime, please feel free to report any issues you may come across.

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<div align="center">
<b><a href="https://github.com/storm-software/sourcebook" target="_blank">Be sure to ⭐ this repository on GitHub so you can keep up to date on any daily progress!</a></b>
</div>

<br />

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- END header -->

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
