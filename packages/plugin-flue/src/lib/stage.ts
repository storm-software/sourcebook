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

import { init, type Agent } from "@flue/runtime";
import {
  DocumentPageSchema,
  toJsonValue,
  type PipelineStage
} from "@sourcebook/core";
import { SOURCEBOOK_DOCUMENTS_DATA } from "./agent.js";

export interface FlueAgentStageOptions {
  agent: Agent;
  id?: string;
  version?: string;
}

export function createFlueAgentStage(
  options: FlueAgentStageOptions
): PipelineStage {
  const id = options.id ?? "flue-agent";
  const version = options.version ?? "1";

  return {
    id,
    kind: "agent",
    version,
    idempotent: false,
    config: toJsonValue({ agent: options.agent.name || "anonymous" }),
    async execute({ job, signal }) {
      signal.throwIfAborted();

      const handle = init(options.agent);
      const abort = () => {
        void handle.abort().catch(() => undefined);
      };
      signal.addEventListener("abort", abort, { once: true });

      try {
        const receipt = await handle.dispatch(
          [
            "Create the Sourcebook documentation for this job.",
            "When complete, call submit_sourcebook_documents exactly once.",
            JSON.stringify({
              repository: job.repository,
              sources: job.sources,
              prompts: job.prompts,
              documents: job.documents
            })
          ].join("\n\n")
        );
        signal.throwIfAborted();

        const reply = await handle.read(receipt, { signal });
        const output = reply.data[SOURCEBOOK_DOCUMENTS_DATA]?.at(-1);
        if (output === undefined) {
          throw new Error(
            `Flue agent did not call submit_sourcebook_documents for stage "${id}"`
          );
        }

        return { documents: DocumentPageSchema.array().parse(output) };
      } finally {
        signal.removeEventListener("abort", abort);
      }
    }
  };
}
