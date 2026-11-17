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

import calloutTags from "@sourcebook/tsdoc/callouts.json" with { type: "json" };
import coreTags from "@sourcebook/tsdoc/core.json" with { type: "json" };
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import ts from "typescript";
import type {
  ApiReference,
  ApiReferenceDiagnostic,
  ApiReferenceOptions
} from "./api-types.js";
import { DocumentationPageError } from "./errors.js";
import { collectFiles } from "./load.js";

const GENERATED = "Generated API reference by @sourcebook/core";
const SOURCE = /\.(?:[cm]?ts|tsx)$/i;
const EXCLUDED = /\.(?:test|spec|story|stories)\.(?:[cm]?ts|tsx)$/i;

/**
 * Discover public TypeScript exports and generate linked API reference pages.
 *
 * TypeDoc resolves symbols, overloads, re-exports, inline links and explicit or
 * implicit inherited documentation. Sourcebook renders signatures, members,
 * standard documentation blocks, custom callouts and acknowledgements.
 * Private and `@internal` declarations are excluded. No source code or plugins
 * are executed. Directories are searched recursively, excluding hidden/build
 * directories, tests and stories. A barrel entry point limits the public API.
 *
 * @param sources - TypeScript entry point files or source directories.
 * @param options - Compiler configuration, index title and warning strictness.
 * @returns Compiled pages, their Markdown, the index and conversion diagnostics.
 * @throws DocumentationPageError - Conversion fails, no public declarations exist,
 * or warnings occur with `strict: true`. No output files are written.
 */
export async function generateApiReference(
  sources: string | string[],
  options: ApiReferenceOptions = {}
): Promise<ApiReference> {
  const entries = new Set<string>();
  for (const source of [sources].flat()) {
    const path = resolve(source);
    if ((await stat(path)).isDirectory()) {
      for (const file of await collectFiles(path, SOURCE)) {
        if (!EXCLUDED.test(file)) entries.add(file);
      }
    } else if (SOURCE.test(path)) {
      entries.add(path);
    } else {
      throw new DocumentationPageError(
        `Not a TypeScript entry point: ${path}`,
        { path }
      );
    }
  }
  if (!entries.size)
    throw new DocumentationPageError(
      "Cannot generate an API reference: no TypeScript entry points."
    );

  const files = [...entries].sort();
  let common = dirname(files[0]!);
  for (const file of files.slice(1)) {
    while (
      relative(common, file).startsWith(`..${sep}`) ||
      relative(common, file) === ".." ||
      isAbsolute(relative(common, file))
    ) {
      const parent = dirname(common);
      if (parent === common) break;
      common = parent;
    }
  }
  const tsconfig = options.tsconfig
    ? resolve(options.tsconfig)
    : ts.findConfigFile(common, path => ts.sys.fileExists(path));

  const { Application, Logger, LogLevel, OptionDefaults, TSConfigReader } =
    await import("typedoc");
  const { renderApiReference } = await import("./api-render.js");
  const diagnostics: ApiReferenceDiagnostic[] = [];
  class DiagnosticLogger extends Logger {
    override log(
      message: string,
      level: (typeof LogLevel)[keyof typeof LogLevel]
    ): void {
      super.log(message, level);
      if (level >= LogLevel.Warn && level < LogLevel.None) {
        diagnostics.push({
          severity: level === LogLevel.Error ? "error" : "warning",
          message
        });
      }
    }
  }
  const app = await Application.bootstrap(
    {
      entryPoints: files,
      ...(tsconfig ? { tsconfig } : {}),
      name: options.title ?? "API Reference",
      readme: "none",
      excludeInternal: true,
      excludePrivate: true,
      validation: { invalidLink: true, notExported: true },
      gitRevision: "",
      disableSources: true
    },
    tsconfig ? [new TSConfigReader()] : []
  );
  app.logger = new DiagnosticLogger();
  if (!tsconfig) {
    app.options.setCompilerOptions(
      files,
      {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        skipLibCheck: true,
        types: []
      },
      undefined
    );
  }
  app.options.setValue("blockTags", [
    ...new Set([
      ...OptionDefaults.blockTags,
      ...app.options.getValue("blockTags"),
      ...coreTags.tagDefinitions.map(tag => tag.tagName),
      ...calloutTags.tagDefinitions.map(tag => tag.tagName)
    ])
  ] as `@${string}`[]);
  const project = await app.convert();
  if (!project) {
    throw new DocumentationPageError(
      `Cannot generate an API reference:\n${diagnostics.map(item => item.message).join("\n")}`
    );
  }
  app.validate(project);
  const result = renderApiReference(
    project,
    diagnostics,
    options.title ?? "API Reference"
  );
  if (
    diagnostics.some(item => item.severity === "error") ||
    (options.strict && diagnostics.length)
  ) {
    throw new DocumentationPageError(
      `Cannot generate an API reference:\n${diagnostics.map(item => item.message).join("\n")}`
    );
  }
  return result;
}

/**
 * Write a TypeScript API reference and index to Markdown files.
 *
 * Existing destinations and their MDX counterparts must carry the API-generation
 * marker. All ownership checks finish before any file is written. Obsolete pages
 * are not removed; filesystem errors during writing may leave partial output.
 *
 * @param sources - TypeScript entry point files or source directories.
 * @param outputDirectory - Destination directory, created recursively.
 * @param options - Passed to {@link generateApiReference}. The writer defaults
 * `strict` to true, so documentation warnings reject before output is written.
 * @returns Written paths with `index.md` last.
 */
export async function writeApiReference(
  sources: string | string[],
  outputDirectory: string,
  options: ApiReferenceOptions = {}
): Promise<string[]> {
  const result = await generateApiReference(sources, {
    ...options,
    strict: options.strict ?? true
  });
  const pages = [...result.pages, result.index];
  for (const page of pages) {
    for (const path of [
      join(outputDirectory, page.path),
      join(outputDirectory, `${page.path}x`)
    ]) {
      let existing: string;
      try {
        existing = await readFile(path, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      if (!existing.includes(GENERATED)) {
        throw new DocumentationPageError(
          `Cannot write API reference: ${path} was not generated by @sourcebook/core.`,
          { path }
        );
      }
    }
  }
  await mkdir(outputDirectory, { recursive: true });
  const paths: string[] = [];
  for (const page of pages) {
    const path = join(outputDirectory, page.path);
    await writeFile(path, page.markdown);
    paths.push(path);
  }
  return paths;
}
