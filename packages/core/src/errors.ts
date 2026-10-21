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

import type { InvalidDocumentationField } from "./types.js";

/**
 * A Markdown document could not be compiled into a documentation page.
 */
export class DocumentationPageError extends Error {
  readonly path?: string;

  readonly kind?: DocumentationPageKind;

  readonly missingFields: readonly string[];

  readonly invalidFields: readonly InvalidDocumentationField[];

  constructor(
    message: string,
    details: {
      path?: string;
      kind?: DocumentationPageKind;
      missingFields?: readonly string[];
      invalidFields?: readonly InvalidDocumentationField[];
    } = {}
  ) {
    super(message);
    this.name = "DocumentationPageError";
    this.path = details.path;
    this.kind = details.kind;
    this.missingFields = details.missingFields ?? [];
    this.invalidFields = details.invalidFields ?? [];
  }
}
