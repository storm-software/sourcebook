---
name: sourcebook-story
description: Use when writing or updating Fumadocs Story files (`*.story.tsx`) that show how to use a component, its anatomy, and its variants, and when generating the component catalog's MDX pages from those files with `@sourcebook/core`. Use when the user asks for component stories, live component docs, or a component catalog. Not for Storybook `*.stories.tsx` files, hand-written Markdown component pages, or design tokens, fonts, and icons.
argument-hint: "[component file or directory]"
license: Apache-2.0
metadata:
  author: storm-software
  version: "1.0.0"
---

# Sourcebook Story

Write one [Fumadocs Story](https://www.fumadocs.dev/docs/next/integrations/story) file per component. The story renders the component with live controls. Its TSDoc block holds the documentation. `@sourcebook/core` reads the stories and writes one MDX page per component, plus a catalog index. This skill owns `*.story.{js,jsx,ts,tsx}` files and the generated catalog. Use `sourcebook-docs` for other design-system pages.

## 1. Choose the components

1. If the user names files or directories, use only those.
2. Otherwise run `node <path-to-this-skill>/../sourcebook-docs/scripts/read-config.mjs <workspace-root> docs`. Use the `components`, `blocks`, and `layouts` paths of each `design-system` entry.
3. If neither gives a path, stop and ask which components to document.

Document only components the package exports. Skip internal helpers, and say which ones you skipped.

## 2. Find the story factory

Search the workspace for `defineStoryFactory` (usually `lib/story.ts` in the docs app). Import `defineStory` from that module, with the import style that the workspace already uses.

If there is no factory, Fumadocs Story is not set up. Stop and report the setup steps from the Fumadocs page: install `@fumadocs/story`, import `@fumadocs/story/css/preset.css`, wrap `next.config` with `createNextStory()`, and create the factory. Do not change the docs app unless the user asks.

## 3. Read the component

Read the component source, its props type, its sub-components, and its exports. Also read the tests, an existing Storybook `*.stories.tsx`, the README, and existing docs for it. Base every statement on these files. Do not guess appearance or behavior from a file name.

## 4. Write the story

Put `<Name>.story.tsx` next to the component file and use the same name case as that file. The `.story` suffix is required: the Fumadocs plugin transforms only `*.story.{js,jsx,ts,tsx}`. When a story file exists, edit it in place. Change only what the component changed or what is missing.

````tsx
import { defineStory } from "@/lib/story"
import { Callout } from "./Callout"

/**
 * Shows a short message that interrupts the reading flow.
 * Use it for a warning or a note that the reader must not miss.
 *
 * @anatomy
 * - `Callout`: the root container. `theme` sets its colors.
 *   - `Callout.Header`: the icon, eyebrow, and heading.
 *   - `Callout.Body`: the message.
 *
 * @usage
 * Use one callout for each section. Put the most important sentence first.
 * Do not put a callout inside another callout.
 *
 * @example
 * ```tsx
 * import { Callout } from "@cyclone-ui/callout";
 *
 * <Callout theme="warning">
 *   <Callout.Body>Back up the database before you upgrade.</Callout.Body>
 * </Callout>
 * ```
 */
export const story = defineStory({
  Component: Callout,
  args: [
    {
      variant: "Default",
      initial: { children: "Back up the database first." }
    },
    {
      variant: "Warning",
      initial: { children: "Back up the database first." },
      fixed: { theme: "warning" }
    }
  ]
})
````

- **Export:** one `export const story = defineStory({ ... })` per file. `@sourcebook/core` reads only the first exported `defineStory()` call.
- **`Component`:** a client component. If the component is server-only, skip it and say why.
- **`args`:** set realistic default props in `initial`. Use the content that a real product shows, not "lorem ipsum".
- **Variants:** make an `args` array when the component has variants. Add one entry for each value of the prop that selects the variant (for example each `theme` or `size`). Name the entry with `variant`, and put that prop in `fixed`. Use only values that the props type or the source defines.
- **`controls`:** override a generated control only when it is wrong for the prop, for example an object or a node.
- **`frame`:** use it for a component that fills the viewport, such as a layout. Frame arguments go through `postMessage()`, so use only serializable values: no functions and no JSX.

## 5. Write the TSDoc block

Put the block directly above `export const story`. `@sourcebook/core` makes the page from it:

| Part | Becomes | Rules |
| --- | --- | --- |
| Summary (text before the first tag) | Page description and opening text | Required. The first paragraph is the description: one or two sentences about what the component is for and when to choose it. Add more paragraphs for alternatives or limits. |
| `@anatomy` | **Anatomy** section | A Markdown list of the parts, in render order. Give the public name of each part (`Callout.Header`, a slot, or a prop that renders a part) and what it does. Use nested lists for nested parts. |
| `@usage` | **Usage** section | When to use it and when not to. Include rules for content, keyboard, and screen readers, but only rules that the source or tests confirm. |
| `@example` | **Examples** section | Repeat the tag for more examples. Each one is a copyable snippet that imports from the package's public name (from its `package.json`), not from the relative path. Put the code in a fenced block. |

A tag starts a line outside a code fence. Lines that start with `@` inside a fence stay in the example. The parser ignores other tags. Write Markdown that `@sourcebook/core` understands, the same as for `sourcebook-docs` pages.

Write in the `sourcebook-docs` style: short sentences, the same term for the same thing, and direct verbs.

## 6. Generate the catalog

Write the pages to the design-system `outputPath` (default `docs`) plus `/components`, `/blocks`, or `/layouts`. When the user names an output directory, use that one. When the workspace can import `@sourcebook/core`, run this from the workspace root:

```sh
node --input-type=module -e "import { writeComponentCatalog } from '@sourcebook/core'; console.log((await writeComponentCatalog(['components'], 'docs/design-system/components', { title: 'Components' })).join('\n'))"
```

`writeComponentCatalog(sources, outputDirectory, { title, tsconfig })` finds every story under `sources`. It skips hidden, dependency, and build directories. It writes `<slug>.mdx` for each story (`Callout.story.tsx` becomes `callout.mdx`) and an `index.mdx` table. Each page imports its story and renders `<story.WithControl />`.

The import uses a `paths` alias from the docs app's tsconfig when one maps to the story file. For example, `"@ui/*": ["../../packages/ui/src/*"]` gives `@ui/button/Button.story`. If no alias matches, the import is relative to the output directory. The tsconfig defaults to the nearest `tsconfig.json` at or above the output directory. When the MDX content is outside the docs app (common in a monorepo), set `tsconfig` to the docs app's tsconfig, for example `{ tsconfig: 'apps/docs/tsconfig.json' }`. If the stories are outside the docs app and no alias maps them, report that the docs app needs a `paths` alias for them. Do not change that tsconfig unless the user asks.

- A generated page starts with a `Generated by @sourcebook/core` comment. Do not edit it. Edit the story, then run the command again.
- The command stops before it writes when a hand-written `<slug>.md`, `<slug>.mdx`, `index.md`, or `index.mdx` is in the output directory. Do not delete that page. Move the content that it has and the story does not have into the TSDoc block. Then report the page so that the user can remove it, or use a different output directory.
- When you delete a story, delete its generated page too.
- If `@sourcebook/core` is not available, give the command in the report and do not write the pages by hand.

## 7. Check and report

Run the project's type check or lint on the story files when it is fast. Report the stories that you wrote or changed, the components that you skipped and why, the generated pages, and any statements that you could not verify.
