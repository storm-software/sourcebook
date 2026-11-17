# Sourcebook comment contract

## Configuration

`@sourcebook/tsdoc` is a JSON-only shared configuration package. When setup is requested, add it as a development dependency using the workspace package manager and extend the preset in `tsdoc.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "extends": ["@sourcebook/tsdoc/recommended.json"]
}
```

Preserve other presets and local definitions. Check existing definitions for conflicting tag syntax before extending another preset. The package includes standard TSDoc tags by default. `core.json` adds `@anatomy`, `@usage`, `@credit`, and `@acknowledgements`; `callouts.json` adds the seven callout tags below. `recommended.json` combines both. These presets can also be extended individually.

## What Core consumes

`parseTSDocComment(comment)` reads one complete comment or its stripped body. It returns `summary`, all block `tags` in source order, `callouts`, and `acknowledgements`. Tags begin at the start of a comment content line; put one tag on each line. Matching backtick and tilde fences protect `@` lines in code. Blank lines, Markdown, repeated blocks, and unknown tags are preserved.

`renderTSDocFeatures(parsed)` emits the custom blocks as Markdown. Compile that Markdown with `compileDocumentationPage` in a page containing `title`, `description`, and `documentType` front matter to check the resulting HTML.

| Tags | Output |
| --- | --- |
| `@note`, `@info`, `@important` | Information admonition |
| `@tip` | Discovery admonition |
| `@warning`, `@caution` | Warning admonition |
| `@danger` | Danger admonition |
| `@credit`, `@acknowledgements` | Markdown under Acknowledgements |

Each custom block may repeat. Empty blocks produce no feature. The renderer emits callouts in their source order, followed by acknowledgements in their source order.

For story pages, `parseComponentStory` reads the comment above the first exported `defineStory()` variable. The first summary paragraph becomes the page description; the full summary becomes the overview. `generateComponentStoryPage` includes anatomy, usage, remarks, examples, custom callouts, and acknowledgements. Unfenced story examples are wrapped as TSX; explicitly fence examples to retain their intended language. Story parsing still requires a summary and `Component`.

For ordinary TypeScript APIs, `generateApiReference(sources, options)` discovers exported declarations with TypeDoc and returns declaration pages, a generated index, and diagnostics. Each page includes Markdown and a compiled Sourcebook page. `writeApiReference(sources, outputDirectory, options)` writes owned generated Markdown pages and rejects warnings by default. Pass the workspace's tsconfig when needed; a barrel entry point defines the public surface, while source directories expand to maintained TypeScript files. Run generation only when the documentation task includes generating API output; a comment-only review does not authorize overwriting generated pages.

API generation resolves inline `{@link Entity}`, `{@link Entity.id | its key}`, `{@linkcode Entity}`, external URL links, and `{@inheritDoc Entity}`. References use the public names in the analyzed export graph, including qualified members; an alias exported as `formatItem` uses `{@inheritDoc formatItem}`. Code spans and fences remain literal. Missing links and invalid or cyclic inheritance produce diagnostics rather than guessed destinations. Inspect diagnostics and generated links, then compile and inspect the actual output. `strict: true` makes the in-memory generator reject documentation warnings.

The raw `parseTSDocComment` utility remains context-free. Standard tags such as `@param`, `@returns`, and `@throws` are retained in `tags`; API generation renders them using TypeDoc's declaration model, but they do not automatically become story sections. Story parsing does not itself have an API symbol graph: use Markdown links in a standalone story, or resolved API-page URLs. A custom tag unknown to Core is retained by the reader but has no built-in visual output.

## Example

This story comment uses hypothetical content to show syntax. In a real review, confirm the component API and attribution from the workspace before writing it.

````tsx
/**
 * Shows a status with a visible text label.
 *
 * @anatomy
 * - `Badge`: the status label.
 *
 * @usage
 * Put the badge beside the item it describes.
 *
 * @warning
 * Include a visible label so color is not the only status indicator.
 *
 * @credit
 * [Design team](https://example.com/team).
 *
 * @example
 * ```tsx
 * <Badge>Ready</Badge>
 * ```
 */
export const story = defineStory({ Component: Badge });
````
