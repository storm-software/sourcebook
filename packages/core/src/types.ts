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
  DocumentationDocumentType,
  DocumentationPageKind,
  GuidePerspective
} from "@sourcebook/config";
import type { PluggableList } from "unified";

/**
 * One heading in a compiled page's table of contents.
 */
export interface TocItem {
  /**
   * Visible heading text.
   */
  title: string;

  /**
   * Fragment URL, including the leading `#`.
   */
  url: string;

  /**
   * Heading depth from 1 through 6.
   */
  depth: number;
}

/**
 * A heading extracted for search and navigation.
 */
export interface StructuredDataHeading {
  /**
   * Heading id.
   */
  id: string;

  /**
   * Visible heading text.
   */
  content: string;
}

/**
 * A block of body text, associated with the heading that contains it.
 */
export interface StructuredDataContent {
  /**
   * Id of the heading that contains this block, when one exists.
   */
  heading?: string;

  /**
   * Plain text of the block.
   */
  content: string;
}

/**
 * Searchable text extracted from the page, in document order.
 */
export interface StructuredData {
  headings: StructuredDataHeading[];
  contents: StructuredDataContent[];
}

/**
 * A field the compiler rejected.
 */
export interface InvalidDocumentationField {
  name: string;
  message: string;
}

/**
 * Options for {@link compileDocumentationPage}.
 */
export interface CompileDocumentationPageOptions {
  /**
   * Page kind. Overrides front matter `kind` and path inference.
   */
  kind?: DocumentationPageKind;

  /**
   * File path used for the slug, kind inference, and error messages.
   * Use a workspace-relative path such as `docs/install.md`.
   */
  path?: string;

  /**
   * Throw when a required field is missing or invalid.
   *
   * @defaultValue true
   */
  strict?: boolean;

  /**
   * Remark plugins run after admonitions and before heading ids are assigned.
   */
  remarkPlugins?: PluggableList;

  /**
   * Rehype plugins run before the table of contents is read from the HTML.
   */
  rehypePlugins?: PluggableList;
}

/**
 * Options for {@link loadDocumentationPages}.
 */
export interface LoadDocumentationPagesOptions extends CompileDocumentationPageOptions {
  /**
   * Read Markdown in nested directories.
   *
   * @defaultValue true
   */
  recursive?: boolean;
}

/**
 * A documentation page compiled from Markdown.
 */
export interface DocumentationPage {
  kind: DocumentationPageKind;

  /**
   * Path passed to the compiler, when one was provided.
   */
  path?: string;

  /**
   * URL slug derived from the path, or from the title when there is no path.
   */
  slug: string;

  title: string;
  description: string;
  tags: string[];
  summary?: string;
  documentType?: DocumentationDocumentType;
  audience?: string;
  perspective?: GuidePerspective;

  /**
   * ADR status line, without the `Status:` label.
   */
  status?: string;

  /**
   * ADR date in `YYYY-MM-DD`.
   */
  date?: string;

  /**
   * HTML fragment for the page body. Raw HTML from the Markdown is preserved.
   */
  html: string;

  toc: TocItem[];
  structuredData: StructuredData;

  /**
   * Front matter fields filled from the body. Generated docs, blog, and guide pages should leave this empty.
   */
  derivedFields: string[];

  /**
   * Required fields the compiler could not find. Empty when compilation succeeds in strict mode.
   */
  missingFields: string[];

  /**
   * Fields that were present but not usable.
   */
  invalidFields: InvalidDocumentationField[];
}
