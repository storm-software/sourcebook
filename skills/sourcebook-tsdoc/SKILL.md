---
name: sourcebook-tsdoc
description: Use when reviewing or improving TypeScript TSDoc or JSDoc comments, documenting exported functions, classes, interfaces, types, and properties, or preparing source comments for Sourcebook. Use for missing or stale API comments and custom callouts or acknowledgements. Not for runtime refactors, Markdown pages, or creating component stories.
license: Apache-2.0
metadata:
  author: storm-software
  version: "1.0.0"
---

# Sourcebook TSDoc

Review maintained TypeScript source and add or improve documentation comments using the implementation, types, and tests as evidence. Edit comments in the source that owns them. Preserve runtime behavior and accurate existing prose. No `sourcebook.config.*` file is required.

## 1. Establish scope and ownership

If the user names files, packages, or symbols, use that scope. Otherwise inventory all workspace packages from their manifests and workspace configuration; inspect maintained `.ts`, `.tsx`, `.mts`, and `.cts` source in each. Prioritize public exports, entry points, public members, configuration types, and non-obvious internal contracts. Trace re-exports to their defining declaration and document there. An existing first/update work list limits the pass to affected symbols and comments made stale by those changes.

Read workspace instructions and `git status` first. Preserve unrelated edits. Skip dependencies, vendored code, generated declarations and integration layers, build output, coverage, caches, and generated files. Use tests and fixtures as evidence rather than filling them with API comments. For an external package, report its upstream owner and the needed documentation change.

## 2. Read before writing

For each symbol, read its body, signature, related types, callers, tests, and existing docs. Confirm defaults, units, side effects, mutation, asynchronous behavior, failure conditions, and edge cases before describing them. Distinguish a rejected promise from a synchronous throw when that matters to callers. Do not infer a guarantee from a name or one happy-path test. Preserve uncertainty in the report rather than inventing a contract.

Inspect the consumer's `tsdoc.json`, installed `@sourcebook/tsdoc` configuration, and Core implementation or version when available. Read [the comment contract](references/comment-contract.md) for supported tags and rendering limits. A tag definition makes a tag valid for TSDoc tooling; the consumer still needs a renderer for visible output. Do not claim an installed older Core supports a new tag without checking it.

## 3. Improve comments in place

Write a short caller-facing summary that explains what the symbol does. Add detail only where it helps a caller use the API correctly. Keep accurate wording, license notices, attribution, release tags, and visibility markers. Preserve overload relationships and inherited documentation; do not expand `@inheritDoc` without checking its target.

| Content | How to write it |
| --- | --- |
| Parameters | `@param name - Description.` Match the declared name; explain constraints and units instead of repeating its TypeScript type. |
| Type parameters | `@typeParam T - Meaning or constraint.` Use the declared parameter name. |
| Return value | `@returns` explains the result, empty cases, and meaningful asynchronous behavior. Omit for a trivial void return. |
| Failures | `@throws` describes verified failure conditions. Include the known error class when useful; do not add a catch or change the implementation. |
| Defaults | `@defaultValue` on a property with a verified default. Describe function-option defaults in that option's documentation or its parameter description. |
| Longer explanation | `@remarks` holds context that does not belong in the summary. |
| Examples | `@example` followed by a fenced code block with a language. Use real imports, argument shapes, and behavior from the workspace. |
| Deprecation and visibility | Preserve existing tags. Add `@deprecated` or change visibility only with evidence of the intended public contract and replacement. |

Use TSDoc syntax, not redundant JSDoc `{Type}` annotations. Avoid adding tags that merely repeat the signature or obvious getter behavior. For properties, document units, valid ranges, defaults, and consequences where verified. If an example contains `*/`, escape or rephrase it so it cannot close the source comment.

## 4. Use custom features when justified

Use `@note`, `@info`, `@tip`, `@important`, `@warning`, `@caution`, and `@danger` for information that deserves a callout. Each is a block tag, begins on its own line, and may repeat. Describe an observed constraint or hazard; severity is not decoration.

Use repeatable `@credit` or `@acknowledgements` blocks for attribution already supplied by the user or present in the repository. Preserve names, links, and licensing context. Never invent contributors or turn a credit into a license replacement.

For an existing story, keep its summary above the exported `defineStory()` variable statement. Preserve `@anatomy`, `@usage`, and fenced `@example` blocks. Use `sourcebook-story` when the task requires creating or changing a story's code or regenerating its catalog.

Do not install packages or change configuration as a side effect of a comment pass. When custom tags are needed but not configured, report the small setup from the reference. Apply setup only when the user also requests it.

## 5. Verify and report

Review the diff to confirm only intended comments changed. Check that parameter names and type parameters match the declaration, examples match the API, and attribution survived. Run existing focused TSDoc lint or validation if available, plus `git diff --check`. Run the project's existing documentation generator when relevant and authorized; inspect its actual output for custom features. A typecheck alone does not prove documentation renders.

When using this repository, Core's focused tests run with `devenv shell -- pnpm exec vitest run --config packages/core/vitest.config.ts`. In other workspaces, discover their commands instead of assuming this command exists. Follow their environment instructions.

Report changed files and symbols, the implementation or tests supporting significant corrections, skipped sources or uncertain contracts, checks run, and any gap between valid tags and the installed renderer. Keep code changes outside the comment pass as follow-up findings.
