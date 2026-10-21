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

export { compileDocumentationPage } from "./compile.js";
export { DocumentationPageError } from "./errors.js";
export { loadDocumentationPage, loadDocumentationPages } from "./load.js";
export type {
  CompileDocumentationPageOptions,
  DocumentationPage,
  InvalidDocumentationField,
  LoadDocumentationPagesOptions,
  StructuredData,
  StructuredDataContent,
  StructuredDataHeading,
  TocItem
} from "./types.js";

export {
  documentationDocumentTypes,
  documentationMarkdownInstructions,
  documentationPageKinds,
  documentationPageOptionalFields,
  documentationPageRequirements,
  guidePerspectives,
  isDocumentationPageKind
} from "@sourcebook/config";
export type {
  DocumentationDocumentType,
  DocumentationPageKind,
  GuidePerspective,
  MarkdownRequirement
} from "@sourcebook/config";
