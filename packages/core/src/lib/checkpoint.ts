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

import type { DocumentJob } from "./model.js";
import { DocumentJobSchema } from "./model.js";

export interface PipelineCheckpoint {
  key: string;
  inputHash: string;
  job: DocumentJob;
  completedAt: string;
}

export interface CheckpointStore {
  load: (
    key: string,
    signal?: AbortSignal
  ) => Promise<PipelineCheckpoint | null>;
  save: (checkpoint: PipelineCheckpoint, signal?: AbortSignal) => Promise<void>;
}

function cloneCheckpoint(checkpoint: PipelineCheckpoint): PipelineCheckpoint {
  return {
    ...checkpoint,
    job: DocumentJobSchema.parse(structuredClone(checkpoint.job))
  };
}

export class MemoryCheckpointStore implements CheckpointStore {
  readonly #checkpoints = new Map<string, PipelineCheckpoint>();

  async load(
    key: string,
    signal?: AbortSignal
  ): Promise<PipelineCheckpoint | null> {
    signal?.throwIfAborted();
    const checkpoint = this.#checkpoints.get(key);

    return checkpoint ? cloneCheckpoint(checkpoint) : null;
  }

  async save(
    checkpoint: PipelineCheckpoint,
    signal?: AbortSignal
  ): Promise<void> {
    signal?.throwIfAborted();
    this.#checkpoints.set(checkpoint.key, cloneCheckpoint(checkpoint));
  }

  clear() {
    this.#checkpoints.clear();
  }
}
