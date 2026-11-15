/* -------------------------------------------------------------------

                   🗲 Storm Software - Sourcebook

 This code was released as part of the Sourcebook project. Sourcebook
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/sourcebook.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/sourcebook
 Documentation:            https://docs.stormsoftware.com/projects/sourcebook
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { DocumentationPageKind } from "@sourcebook/config";
import { slug as toSlug } from "github-slugger";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkRehype from "remark-rehype";
import type { PluggableList, Processor } from "unified";
import { DocumentationPageError } from "./errors.js";
import {
  describeMissingField,
  resolveDocumentationFields,
  resolveDocumentationKind
} from "./fields.js";
import { splitFrontmatter } from "./frontmatter.js";
import { rehypeToc } from "./plugins/rehype-toc.js";
import { remarkAdmonition } from "./plugins/remark-admonition.js";
import { remarkHeading } from "./plugins/remark-heading.js";
import { remarkMdxHtml } from "./plugins/remark-mdx-html.js";
import { remarkStructure } from "./plugins/remark-structure.js";
import type {
  CompileDocumentationPageOptions,
  DocumentationPage
} from "./types.js";
import "./vfile.js";

function applyPlugins(
  processor: Processor,
  plugins: PluggableList | undefined
): void {
  for (const entry of plugins ?? []) {
    if (Array.isArray(entry)) {
      const [plugin, options, enabled] = entry as [never, never, boolean?];
      if (enabled === false) continue;
      processor.use(plugin, options);
      continue;
    }
    processor.use(entry as never);
  }
}

function pageSlug(path: string | undefined, title: string): string {
  const fallback = toSlug(title) || "page";
  if (!path) return fallback;

  const parts = path
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .split("/")
    .filter(part => part.length > 0 && part !== ".");
  const file = parts.pop() ?? "";
  const directories = parts.map(part => toSlug(part)).filter(Boolean);

  if (/^readme\.mdx?$/i.test(file)) return directories.join("/") || "readme";

  const stem = file.replace(/\.mdx?$/i, "");
  if (/^index$/i.test(stem)) return directories.join("/") || "index";

  const page = toSlug(stem);

  return [...directories, page].filter(Boolean).join("/") || fallback;
}

function formatPageError(
  kind: DocumentationPageKind,
  path: string | undefined,
  missingFields: readonly string[],
  invalidFields: readonly { name: string; message: string }[]
): string {
  const where = path ? ` ${path}` : "";
  const problems = [
    ...missingFields.map(name => `missing ${name}`),
    ...invalidFields.map(field => `invalid ${field.name}`)
  ];
  const details = [
    ...missingFields.map(
      name => `${name}: ${describeMissingField(kind, name)}`
    ),
    ...invalidFields.map(field => `${field.name}: ${field.message}`)
  ].join("\n");

  return `Cannot compile ${kind} page${where}: ${problems.join(", ")}.\n${details}`;
}

/**
 * Compile one Markdown document into a documentation page.
 *
 * Remark applies GitHub Flavored Markdown, admonitions, heading ids, and searchable structure.
 * Rehype renders an HTML fragment and collects the table of contents.
 * Raw HTML in the Markdown is preserved, so compile only trusted source.
 * MDX (`format: "mdx"`, or a `.mdx` path) drops imports, exports, and `{expressions}` from the HTML.
 * JSX components become placeholder elements that keep their children.
 *
 * `remarkPlugins` run after admonitions and before heading ids are assigned.
 * `rehypePlugins` run before the table of contents is read from the HTML.
 *
 * @param source - Markdown written by a Sourcebook skill or by hand.
 * @param options - Page kind, path, strictness, and extra plugins.
 * @returns The compiled page. In strict mode, a missing or invalid required field throws instead.
 */
export function compileDocumentationPage(
  source: string,
  options: CompileDocumentationPageOptions = {}
): DocumentationPage {
  if (typeof source !== "string") {
    throw new TypeError("Documentation page source must be a string");
  }

  const { body, frontmatter } = splitFrontmatter(source, options.path);
  const resolvedKind = resolveDocumentationKind(
    options.kind,
    frontmatter,
    options.path
  );
  const mdx =
    (options.format ?? (/\.mdx$/i.test(options.path ?? "") ? "mdx" : "md")) ===
    "mdx";
  const processor = remark() as unknown as Processor;
  processor.use(remarkGfm);
  if (mdx) processor.use(remarkMdx).use(remarkMdxHtml);
  processor.use(remarkAdmonition);
  applyPlugins(processor, options.remarkPlugins);
  processor.use(remarkHeading);
  processor.use(remarkStructure);
  processor.use(remarkRehype, { allowDangerousHtml: true });
  applyPlugins(processor, options.rehypePlugins);
  processor.use(rehypeToc);
  processor.use(rehypeStringify, { allowDangerousHtml: true });

  let file: ReturnType<Processor["processSync"]>;
  try {
    file = processor.processSync(
      options.path ? { path: options.path, value: body } : body
    );
  } catch (error) {
    if (!mdx) throw error;
    const where = options.path ? ` in ${options.path}` : "";
    const detail = error instanceof Error ? error.message : String(error);
    throw new DocumentationPageError(`Invalid MDX${where}: ${detail}`, {
      path: options.path
    });
  }
  const structuredData = file.data.documentationStructuredData ?? {
    headings: [],
    contents: []
  };
  const resolved = resolveDocumentationFields({
    kind: resolvedKind.kind,
    frontmatter,
    body,
    titleFromHeading: file.data.documentationTitle,
    descriptionFromParagraph: file.data.documentationDescription,
    headings: file.data.documentationHeadings ?? [],
    structuredData,
    ...(resolvedKind.invalid ? { kindInvalid: resolvedKind.invalid } : {})
  });
  const strict = options.strict ?? true;

  if (
    strict &&
    (resolved.missingFields.length || resolved.invalidFields.length)
  ) {
    throw new DocumentationPageError(
      formatPageError(
        resolvedKind.kind,
        options.path,
        resolved.missingFields,
        resolved.invalidFields
      ),
      {
        path: options.path,
        kind: resolvedKind.kind,
        missingFields: resolved.missingFields,
        invalidFields: resolved.invalidFields
      }
    );
  }

  const title = resolved.title || "Untitled";

  return {
    kind: resolvedKind.kind,
    ...(options.path ? { path: options.path } : {}),
    slug: pageSlug(options.path, title),
    title,
    description: resolved.description,
    tags: resolved.tags,
    ...(resolved.summary ? { summary: resolved.summary } : {}),
    ...(resolved.documentType ? { documentType: resolved.documentType } : {}),
    ...(resolved.audience ? { audience: resolved.audience } : {}),
    ...(resolved.perspective ? { perspective: resolved.perspective } : {}),
    ...(resolved.status ? { status: resolved.status } : {}),
    ...(resolved.date ? { date: resolved.date } : {}),
    html: String(file),
    toc: file.data.documentationToc ?? [],
    structuredData,
    derivedFields: resolved.derivedFields,
    missingFields: resolved.missingFields,
    invalidFields: resolved.invalidFields
  };
}
