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

export type ProjectType = "application" | "library" | "design-system";

export interface SourcebookDocsConfig {
  /**
   * The output path for the generated files.
   *
   * @defaultValue "docs"
   */
  outputPath?: string;

  /**
   * Any additional instructions that should be included when generating documentation for the project.
   */
  instructions?: string;
}

export interface SourcebookSingleApplicationDocsConfig extends SourcebookDocsConfig {
  /**
   * The type of project, which is always "application" for this configuration.
   */
  type: "application";

  /**
   * A path (or paths) to the source files or directories.
   */
  src?: string | string[];
}

export interface SourcebookMultiApplicationDocsConfig extends SourcebookDocsConfig {
  /**
   * The type of project, which is always "application" for this configuration.
   */
  type: "application";

  /**
   * A path (or paths) to the backend source files or directories.
   */
  backend?: string | string[];

  /**
   * A path (or paths) to the frontend source files or directories.
   */
  frontend?: string | string[];
}

export type SourcebookApplicationDocsConfig =
  SourcebookSingleApplicationDocsConfig | SourcebookMultiApplicationDocsConfig;

export interface SourcebookLibraryDocsConfig extends SourcebookDocsConfig {
  /**
   * The type of project, which is always "library" for this configuration.
   */
  type: "library";

  /**
   * A path (or paths) to the package files or directories.
   */
  packages?: string | string[];
}

export interface SourcebookDesignSystemDocsConfig extends SourcebookDocsConfig {
  /**
   * The type of project, which is always "design-system" for this configuration.
   */
  type: "design-system";

  /**
   * A path (or paths) to the design token files or directories.
   */
  tokens?: string | string[];

  /**
   * A path (or paths) to the font files or directories.
   */
  fonts?: string | string[];

  /**
   * A path (or paths) to the icon files or directories.
   */
  icons?: string | string[];

  /**
   * A path (or paths) to the illustration files or directories.
   */
  illustrations?: string | string[];

  /**
   * A path (or paths) to the component files or directories.
   */
  components?: string | string[];

  /**
   * A path (or paths) to the block files or directories.
   */
  blocks?: string | string[];

  /**
   * A path (or paths) to the layout files or directories.
   */
  layouts?: string | string[];
}

export interface SourcebookBlogConfig {
  /**
   * A path (or paths) to the blog article files or directories.
   */
  articles?: string | string[];

  /**
   * Whether to generate hero images for the blog articles.
   */
  generateHeroImages?: boolean;

  /**
   * Any additional instructions that should be included when enhancing the blog articles for the project.
   */
  instructions?: string;
}

/**
 * Configuration loaded from sourcebook config files by the Sourcebook skill.
 */
export interface SourcebookConfig {
  /**
   * Whether to use local output paths for the generated files.
   *
   * @summary
   * Local output paths mean that the generated files will be placed in the `outputPath` directories relative to their parent projects.
   */
  useLocalOutput?: boolean;

  /**
   * The display name for the project.
   */
  displayName?: string;

  /**
   * The homepage URL for the project.
   */
  homepage?: string;

  /**
   * The description for the project.
   */
  description?: string;

  /**
   * Configuration for the documentation of the project.
   */
  docs?:
    | SourcebookApplicationDocsConfig
    | SourcebookLibraryDocsConfig
    | SourcebookDesignSystemDocsConfig
    | (
        | SourcebookApplicationDocsConfig
        | SourcebookLibraryDocsConfig
        | SourcebookDesignSystemDocsConfig
      )[];

  /**
   * Configuration for the blog section of the project.
   */
  blog?: SourcebookBlogConfig;

  /**
   * Any additional instructions that should be included when generating documentation and/or the blog for the project.
   */
  instructions?: string;
}

/**
 * Defines the Sourcebook configuration.
 *
 * @param config - The Sourcebook configuration object or an array of configuration objects.
 * @returns The same Sourcebook configuration object or array of configuration objects that was passed in.
 */
export function defineConfig(
  config: SourcebookConfig | SourcebookConfig[]
): SourcebookConfig | SourcebookConfig[] {
  return config;
}
