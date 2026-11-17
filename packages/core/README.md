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

# Sourcebook

Compile Markdown from Sourcebook skills and hand-written files into documentation pages.

Core also reads source documentation with `parseTSDocComment(comment)` and renders custom callouts and acknowledgements with `renderTSDocFeatures(parsed)`. The latter returns Markdown to include in a page passed to `compileDocumentationPage`.

`parseComponentStory` and `generateComponentStoryPage` include `@remarks`, callout tags (`@note`, `@info`, `@tip`, `@important`, `@warning`, `@caution`, `@danger`), and repeatable `@credit` and `@acknowledgements` blocks alongside anatomy, usage, and examples. Existing stories without these tags keep their output.

Use [`@sourcebook/tsdoc`](../tsdoc/README.md) to configure these tags for TSDoc tooling.

## TypeScript API references

Generate API pages directly from TypeScript entry points or source directories:

```ts
import { generateApiReference, writeApiReference } from "@sourcebook/core";

const reference = await generateApiReference("src/index.ts", {
  tsconfig: "tsconfig.json"
});

// Each declaration page has a relative path, Markdown, and a compiled page.
for (const page of reference.pages) {
  console.log(page.path, page.page.html);
}
console.log(reference.diagnostics);

await writeApiReference("src/index.ts", "docs/api", {
  tsconfig: "tsconfig.json",
  title: "API Reference"
});
```

TypeDoc analyzes the public export graph without executing application code or loading plugins. Core produces one Markdown page per top-level export, member sections, and `index.md`. Functions, overloads, classes, interfaces, namespaces, type aliases, enums, variables, generic constraints, defaults, and parameter documentation are included. Private and `@internal` declarations are excluded. Use a barrel entry point to define the public surface; directories expand recursively and skip hidden entries, `node_modules`, `dist`, `out-tsc`, `coverage`, tests and stories.

Core locates a tsconfig above the common source directory unless one is supplied. Without a tsconfig it uses strict ES2022/NodeNext compiler settings without automatically including ambient `@types` packages. Supply a tsconfig when the source relies on ambient types, path aliases, JSX, or project references. TypeScript errors reject generation.

Inline `{@link Entity}`, `{@link Entity.id | its key}`, `{@linkcode Entity}`, and external URL references become Markdown links to generated pages, member anchors, or URLs. Inline code and fenced examples remain literal. Explicit `{@inheritDoc Entity}` and TypeDoc's normal inherited-member documentation use the analyzed symbol graph; standard inherited summaries, remarks, parameters, and return documentation are rendered. Declaration references use public exported names: if `format` is re-exported as `formatItem`, use `{@inheritDoc formatItem}`. The raw `parseTSDocComment` utility remains context-free; reference resolution occurs during API generation.

Missing or ambiguous link targets and invalid or cyclic inheritance appear in `reference.diagnostics`; unresolved references are rendered as readable text rather than guessed links. `generateApiReference` returns warnings by default; set `strict: true` to reject them. The writer defaults to strict mode so unresolved documentation cannot be silently written. Set `strict: false` explicitly to permit warnings, and inspect diagnostics with `generateApiReference` before writing.

The writer checks ownership of every planned `.md` file and its `.mdx` counterpart before writing. Hand-written pages are preserved; pages bearing `Generated API reference by @sourcebook/core` may be replaced. Obsolete pages are not deleted, and filesystem failures after writing begins can leave partial output. Compile only trusted source comments, since Core's Markdown compiler preserves raw HTML.
