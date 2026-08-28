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

import type { DocumentPage } from "./model";
import { DocumentPageSchema } from "./model";
import type { PipelineStage } from "./pipeline";
import { toJsonValue } from "./pipeline";

export interface FakeAgentStageOptions {
  id?: string;
  version?: string;
  documents: readonly DocumentPage[];
}

export function createFakeAgentStage(
  options: FakeAgentStageOptions
): PipelineStage {
  const documents = options.documents.map(document =>
    DocumentPageSchema.parse(document)
  );

  return {
    id: options.id ?? "fake-agent",
    kind: "agent",
    version: options.version ?? "1",
    idempotent: true,
    config: toJsonValue({ documents }),
    execute: ({ signal }) => {
      signal.throwIfAborted();
      return { documents: structuredClone(documents) };
    }
  };
}
