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

import { readdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";
import { compileDocumentationPage } from "./compile.js";
import type {
  CompileDocumentationPageOptions,
  DocumentationPage,
  LoadDocumentationPagesOptions
} from "./types.js";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "out-tsc",
  "coverage",
  ".git"
]);

async function collectMarkdown(
  directory: string,
  recursive: boolean
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!recursive || IGNORED_DIRECTORIES.has(entry.name)) continue;
      files.push(...(await collectMarkdown(path, true)));
      continue;
    }
    if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(path);
  }

  return files;
}

/**
 * Read one Markdown file and compile it.
 * An absolute path is reduced to its file name unless `options.path` is set.
 *
 * @param filePath - Markdown file to read.
 * @param options - Compile options. `path` overrides the path stored on the page.
 * @returns The compiled page.
 */
export async function loadDocumentationPage(
  filePath: string,
  options: CompileDocumentationPageOptions = {}
): Promise<DocumentationPage> {
  const source = await readFile(filePath, "utf8");
  const path =
    options.path ?? (isAbsolute(filePath) ? basename(filePath) : filePath);

  return compileDocumentationPage(source, { ...options, path });
}

/**
 * Compile every Markdown file in a directory.
 * `options.kind` applies to every file. Leave it unset to infer the kind from each path.
 * `options.path` is a slug prefix, not a single file path.
 *
 * @param directory - Directory of `.md` and `.mdx` files.
 * @param options - Compile options for every page.
 * @returns Pages in path order. The first invalid page throws in strict mode.
 */
export async function loadDocumentationPages(
  directory: string,
  options: LoadDocumentationPagesOptions = {}
): Promise<DocumentationPage[]> {
  const { path: pathPrefix, recursive = true, ...compileOptions } = options;
  const files = (await collectMarkdown(directory, recursive)).sort(
    (left, right) => left.localeCompare(right)
  );
  const pages: DocumentationPage[] = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const relativePath = relative(directory, filePath);
    const path = pathPrefix
      ? `${pathPrefix.replace(/\/$/, "")}/${relativePath}`
      : relativePath;
    pages.push(compileDocumentationPage(source, { ...compileOptions, path }));
  }

  return pages;
}
