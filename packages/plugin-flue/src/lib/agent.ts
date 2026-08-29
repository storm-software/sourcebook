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

import { useDataWriter, useTool } from "@flue/runtime";
import { DocumentPageSchema } from "@sourcebook/core";
import * as v from "valibot";

export const SOURCEBOOK_DOCUMENTS_DATA = "sourcebook-documents";

const SubmitDocumentsInput = v.object({
  documents: v.string()
});

/**
 * Adds the tool a Flue agent uses to return validated Sourcebook documents.
 * Call this hook unconditionally from the agent function because Flue data
 * writer names are part of an agent render's identity.
 */
export function useSourcebookDocuments() {
  const writeDocuments = useDataWriter(SOURCEBOOK_DOCUMENTS_DATA);

  useTool({
    name: "submit_sourcebook_documents",
    description:
      "Submit the completed Sourcebook DocumentPage array as a JSON string. Call this once when the documentation is complete.",
    input: SubmitDocumentsInput,
    output: v.string(),
    run({ data }) {
      const documents = DocumentPageSchema.array().parse(
        JSON.parse(data.documents)
      );
      writeDocuments(documents);

      return {
        output: `Accepted ${documents.length} Sourcebook document(s).`,
        terminate: true
      };
    }
  });
}
