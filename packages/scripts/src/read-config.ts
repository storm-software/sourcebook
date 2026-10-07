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

import type {
  ProjectType,
  SourcebookApplicationDocsConfig,
  SourcebookConfig,
  SourcebookDesignSystemDocsConfig,
  SourcebookLibraryDocsConfig
} from "@sourcebook/config";
import { loadConfig } from "c12";
import { isAbsolute, relative, resolve } from "node:path";

export type SourcebookConfigScope = "docs" | "blog";

type SourcebookDocsEntry =
  | SourcebookApplicationDocsConfig
  | SourcebookLibraryDocsConfig
  | SourcebookDesignSystemDocsConfig;

function isInsideWorkspace(workspace: string, path: string) {
  if (isAbsolute(path)) return false;
  const destination = relative(workspace, resolve(workspace, path));

  return (
    destination !== ".." &&
    !destination.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(destination)
  );
}

function validateString(
  config: Record<string, unknown>,
  field: string,
  location: string
) {
  const value = config[field];
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${location}.${field} must be a string`);
  }
  return value;
}

function validatePathValue(
  value: unknown,
  workspace: string,
  location: string
) {
  if (value === undefined) return undefined;
  const paths = Array.isArray(value) ? value : [value];
  if (
    !paths.length ||
    paths.some(
      path =>
        typeof path !== "string" ||
        !path.trim() ||
        !isInsideWorkspace(workspace, path)
    )
  ) {
    throw new Error(`${location} must contain workspace-relative paths`);
  }
  return value as string | string[];
}

const docsPathFields = {
  application: ["src", "backend", "frontend"],
  library: ["packages"],
  "design-system": [
    "tokens",
    "fonts",
    "icons",
    "illustrations",
    "components",
    "blocks",
    "layouts"
  ]
} satisfies Record<ProjectType, readonly string[]>;

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === "string" && Object.hasOwn(docsPathFields, value);
}

function validateDocsEntry(
  entry: unknown,
  workspace: string,
  location: string
): SourcebookDocsEntry {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${location} must be a documentation configuration object`);
  }

  const config = entry as Record<string, unknown>;
  if (!isProjectType(config.type)) {
    throw new Error(
      `${location}.type must be application, library, or design-system`
    );
  }

  const outputPath = config.outputPath ?? "docs";
  if (
    typeof outputPath !== "string" ||
    !outputPath.trim() ||
    !isInsideWorkspace(workspace, outputPath)
  ) {
    throw new Error(`${location}.outputPath must be a workspace-relative path`);
  }

  const instructions = validateString(config, "instructions", location);
  const base = {
    outputPath,
    ...(instructions === undefined ? {} : { instructions })
  };
  const path = (field: string) =>
    validatePathValue(config[field], workspace, `${location}.${field}`);

  switch (config.type) {
    case "application": {
      const src = path("src");
      const backend = path("backend");
      const frontend = path("frontend");

      return {
        ...base,
        type: "application",
        ...(src === undefined ? {} : { src }),
        ...(backend === undefined ? {} : { backend }),
        ...(frontend === undefined ? {} : { frontend })
      } satisfies SourcebookApplicationDocsConfig;
    }
    case "library": {
      const packages = path("packages");

      return {
        ...base,
        type: "library",
        ...(packages === undefined ? {} : { packages })
      } satisfies SourcebookLibraryDocsConfig;
    }
    case "design-system": {
      const tokens = path("tokens");
      const fonts = path("fonts");
      const icons = path("icons");
      const illustrations = path("illustrations");
      const components = path("components");
      const blocks = path("blocks");
      const layouts = path("layouts");

      return {
        ...base,
        type: "design-system",
        ...(tokens === undefined ? {} : { tokens }),
        ...(fonts === undefined ? {} : { fonts }),
        ...(icons === undefined ? {} : { icons }),
        ...(illustrations === undefined ? {} : { illustrations }),
        ...(components === undefined ? {} : { components }),
        ...(blocks === undefined ? {} : { blocks }),
        ...(layouts === undefined ? {} : { layouts })
      } satisfies SourcebookDesignSystemDocsConfig;
    }
  }
}

function pickSharedConfig(config: Record<string, unknown>, location: string) {
  const result: Record<string, unknown> = {};
  for (const field of [
    "displayName",
    "homepage",
    "description",
    "instructions"
  ]) {
    const value = validateString(config, field, location);
    if (value !== undefined) result[field] = value;
  }
  return result;
}

function validateDocsConfig(
  entry: unknown,
  workspace: string,
  location: string
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${location} must be a Sourcebook configuration object`);
  }

  const config = entry as Record<string, unknown>;
  if (config.docs === undefined) return undefined;
  const docs = Array.isArray(config.docs) ? config.docs : [config.docs];
  if (!docs.length) {
    throw new Error(`${location}.docs must not be an empty array`);
  }
  if (
    config.useLocalOutput !== undefined &&
    typeof config.useLocalOutput !== "boolean"
  ) {
    throw new Error(`${location}.useLocalOutput must be a boolean`);
  }

  const normalizedDocs = docs.map((doc, index) =>
    validateDocsEntry(
      doc,
      workspace,
      Array.isArray(config.docs)
        ? `${location}.docs[${index}]`
        : `${location}.docs`
    )
  );

  return {
    ...pickSharedConfig(config, location),
    useLocalOutput: config.useLocalOutput ?? true,
    docs: Array.isArray(config.docs) ? normalizedDocs : normalizedDocs[0]
  } satisfies SourcebookConfig;
}

function validateBlogConfig(
  entry: unknown,
  workspace: string,
  location: string
) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${location} must be a Sourcebook configuration object`);
  }

  const config = entry as Record<string, unknown>;
  if (config.blog === undefined) return undefined;
  if (
    !config.blog ||
    typeof config.blog !== "object" ||
    Array.isArray(config.blog)
  ) {
    throw new Error(`${location}.blog must be a blog configuration object`);
  }

  const blog = config.blog as Record<string, unknown>;
  const normalizedBlog: Record<string, unknown> = {};
  const articles = validatePathValue(
    blog.articles,
    workspace,
    `${location}.blog.articles`
  );
  if (articles !== undefined) normalizedBlog.articles = articles;

  if (
    blog.generateHeroImages !== undefined &&
    typeof blog.generateHeroImages !== "boolean"
  ) {
    throw new Error(`${location}.blog.generateHeroImages must be a boolean`);
  }
  if (blog.generateHeroImages !== undefined) {
    normalizedBlog.generateHeroImages = blog.generateHeroImages;
  }

  const instructions = validateString(blog, "instructions", `${location}.blog`);
  if (instructions !== undefined) normalizedBlog.instructions = instructions;

  return {
    ...pickSharedConfig(config, location),
    blog: normalizedBlog
  } satisfies SourcebookConfig;
}

function normalizeConfig(
  config: unknown,
  workspace: string,
  configFile: string,
  scope: SourcebookConfigScope
) {
  if (scope !== "docs" && scope !== "blog") {
    throw new Error("Unsupported Sourcebook config scope");
  }

  const entries = Array.isArray(config) ? config : [config];
  if (!entries.length) {
    throw new Error(`${configFile}: configuration array must not be empty`);
  }

  const normalized = entries
    .map((entry, index) =>
      scope === "docs"
        ? validateDocsConfig(
            entry,
            workspace,
            Array.isArray(config) ? `${configFile}[${index}]` : configFile
          )
        : validateBlogConfig(
            entry,
            workspace,
            Array.isArray(config) ? `${configFile}[${index}]` : configFile
          )
    )
    .filter(entry => entry !== undefined);

  if (!normalized.length) {
    throw new Error(`${configFile}: no ${scope} configuration found`);
  }

  return Array.isArray(config) ? normalized : normalized[0];
}

export async function readSourcebookConfig(
  root = process.cwd(),
  scope = process.argv[3] as SourcebookConfigScope
) {
  const workspace = resolve(root);
  const { config, configFile } = await loadConfig({
    name: "sourcebook",
    cwd: workspace
  });

  if (!configFile) {
    throw new Error(`No sourcebook.config file found in ${workspace}`);
  }

  return {
    workspace,
    configFile,
    config: normalizeConfig(config, workspace, configFile, scope)
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === new URL(import.meta.url).pathname
) {
  try {
    process.stdout.write(
      `${JSON.stringify(
        await readSourcebookConfig(
          process.argv[2],
          process.argv[3] as SourcebookConfigScope
        )
      )}\n`
    );
  } catch (error) {
    process.stderr.write(
      `Sourcebook: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}
