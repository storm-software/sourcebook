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

import type { DocumentationPage } from "./types.js";

/** Inputs to TypeScript symbol discovery and API documentation generation. */
export interface ApiReferenceOptions {
  /** Compiler configuration. Defaults to the nearest tsconfig above the sources. */
  tsconfig?: string;
  /** Index title. @defaultValue `API Reference` */
  title?: string;
  /**
   * Reject documentation warnings, including unresolved links.
   * Defaults to false for generation and true for writing.
   */
  strict?: boolean;
}

/** A conversion or documentation-resolution message from TypeDoc. */
export interface ApiReferenceDiagnostic {
  severity: "warning" | "error";
  message: string;
}

/** One public declaration, rendered as Markdown and compiled by Sourcebook. */
export interface ApiReferencePage {
  name: string;
  kind: string;
  /** Relative Markdown output path and link destination within this reference. */
  path: string;
  markdown: string;
  page: DocumentationPage;
}

/** Generated declaration pages, index, and reference-resolution diagnostics. */
export interface ApiReference {
  pages: ApiReferencePage[];
  index: ApiReferencePage;
  diagnostics: ApiReferenceDiagnostic[];
}
