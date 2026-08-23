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

import { createHash } from "node:crypto";

import type { CheckpointStore } from "./checkpoint.js";
import type { DocumentJob } from "./model.js";
import { DiagnosticSchema, DocumentJobSchema } from "./model.js";

export type JsonValue =
  boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };

export type PipelineStageKind = "discovery" | "agent" | "transform" | "output";

export interface RetryPolicy {
  maxAttempts: number;
  delayMs?: number;
  retryNonIdempotent?: boolean;
}

export interface PipelineStageContext {
  job: Readonly<DocumentJob>;
  signal: AbortSignal;
  attempt: number;
}

export interface PipelineStage {
  id: string;
  kind: PipelineStageKind;
  version: string;
  idempotent: boolean;
  config?: JsonValue;
  retry?: RetryPolicy;
  execute: (
    context: PipelineStageContext
  ) => Promise<Partial<DocumentJob>> | Partial<DocumentJob>;
}

export interface PipelineDefinition {
  id: string;
  version: string;
  stages: readonly PipelineStage[];
  retry?: RetryPolicy;
}

interface PipelineEventBase {
  pipelineId: string;
  jobId: string;
  timestamp: string;
}

export type PipelineEvent =
  | (PipelineEventBase & { type: "pipeline-started" })
  | (PipelineEventBase & { type: "pipeline-completed" })
  | (PipelineEventBase & {
      type: "pipeline-failed";
      error: Error;
    })
  | (PipelineEventBase & {
      type: "stage-started";
      stageId: string;
      attempt: number;
    })
  | (PipelineEventBase & {
      type: "stage-retrying";
      stageId: string;
      attempt: number;
      error: Error;
    })
  | (PipelineEventBase & {
      type: "stage-completed";
      stageId: string;
      attempt: number;
    })
  | (PipelineEventBase & {
      type: "checkpoint-restored";
      stageId: string;
    });

export interface PipelineExecution {
  events: AsyncIterable<PipelineEvent>;
  result: Promise<DocumentJob>;
}

export interface PipelineExecutionOptions {
  checkpointStore?: CheckpointStore;
  signal?: AbortSignal;
  onEvent?: (event: PipelineEvent) => void;
}

export class PipelineExecutionError extends Error {
  constructor(
    message: string,
    readonly job: DocumentJob,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "PipelineExecutionError";
  }
}

class EventQueue<T> implements AsyncIterable<T> {
  readonly #values: T[] = [];

  readonly #waiting: ((result: IteratorResult<T>) => void)[] = [];

  #closed = false;

  push(value: T) {
    const resolve = this.#waiting.shift();
    if (resolve) {
      resolve({ done: false, value });
    } else {
      this.#values.push(value);
    }
  }

  close() {
    this.#closed = true;
    for (const resolve of this.#waiting.splice(0)) {
      resolve({ done: true, value: undefined });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        const value = this.#values.shift();
        if (value !== undefined) {
          return { done: false, value };
        }
        if (this.#closed) {
          return { done: true, value: undefined };
        }
        return new Promise<IteratorResult<T>>(resolve => {
          this.#waiting.push(resolve);
        });
      }
    };
  }
}

function stableValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

function hash(value: JsonValue) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

export function toJsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Value cannot be represented as JSON");
  }
  return JSON.parse(serialized) as JsonValue;
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function validateRetryPolicy(
  policy: RetryPolicy | undefined,
  location: string
) {
  if (
    policy &&
    (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1)
  ) {
    throw new TypeError(`${location} maxAttempts must be a positive integer`);
  }
  if (policy?.delayMs !== undefined && policy.delayMs < 0) {
    throw new TypeError(`${location} delayMs cannot be negative`);
  }
}

export function createPipeline(
  definition: PipelineDefinition
): PipelineDefinition {
  if (!definition.id || !definition.version || definition.stages.length === 0) {
    throw new TypeError(
      "A pipeline requires an id, version, and at least one stage"
    );
  }

  validateRetryPolicy(definition.retry, "Pipeline retry policy");
  const ids = new Set<string>();
  for (const stage of definition.stages) {
    if (!stage.id || !stage.version) {
      throw new TypeError("Every stage requires an id and version");
    }
    if (ids.has(stage.id)) {
      throw new TypeError(`Duplicate pipeline stage id: ${stage.id}`);
    }
    ids.add(stage.id);
    validateRetryPolicy(stage.retry, `Stage "${stage.id}" retry policy`);

    const policy = stage.retry ?? definition.retry;
    if (
      policy &&
      policy.maxAttempts > 1 &&
      !stage.idempotent &&
      !policy.retryNonIdempotent
    ) {
      throw new TypeError(
        `Stage "${stage.id}" is not idempotent and cannot be retried automatically`
      );
    }
  }

  return Object.freeze({
    ...definition,
    stages: Object.freeze([...definition.stages])
  });
}

function mergeJob(
  current: DocumentJob,
  patch: Partial<DocumentJob>
): DocumentJob {
  return deepFreeze(
    DocumentJobSchema.parse({
      ...current,
      ...patch,
      repository: { ...current.repository, ...patch.repository },
      metadata: { ...current.metadata, ...patch.metadata }
    })
  );
}

async function abortableDelay(delayMs: number, signal: AbortSignal) {
  if (delayMs === 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;
    const abort = () => {
      clearTimeout(timeout);
      reject(signal.reason);
    };
    const complete = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    timeout = setTimeout(complete, delayMs);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
    }
  });
}

function pipelineSignature(definition: PipelineDefinition): JsonValue {
  return {
    id: definition.id,
    version: definition.version,
    stages: definition.stages.map(stage => ({
      id: stage.id,
      kind: stage.kind,
      version: stage.version,
      idempotent: stage.idempotent,
      config: stage.config ?? null,
      retry: stage.retry ? toJsonValue(stage.retry) : null
    }))
  };
}

export function executePipeline(
  definition: PipelineDefinition,
  input: DocumentJob,
  options: PipelineExecutionOptions = {}
): PipelineExecution {
  const pipeline = createPipeline(definition);
  const initialJob = deepFreeze(DocumentJobSchema.parse(input));
  const queue = new EventQueue<PipelineEvent>();
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  if (options.signal?.aborted) {
    forwardAbort();
  }

  const publish = (event: PipelineEvent) => {
    queue.push(event);
    options.onEvent?.(event);
  };

  const eventBase = () => ({
    pipelineId: pipeline.id,
    jobId: initialJob.id,
    timestamp: new Date().toISOString()
  });

  const result = (async () => {
    let job = initialJob;
    publish({ ...eventBase(), type: "pipeline-started" });

    try {
      const signature = pipelineSignature(pipeline);
      for (const stage of pipeline.stages) {
        controller.signal.throwIfAborted();
        const checkpointKey = `${pipeline.id}:${job.id}:${stage.id}`;
        const inputHash = hash({
          pipeline: signature,
          stage: {
            id: stage.id,
            version: stage.version,
            config: stage.config ?? null
          },
          input: toJsonValue(job)
        });
        const checkpoint = await options.checkpointStore?.load(
          checkpointKey,
          controller.signal
        );

        if (checkpoint?.inputHash === inputHash) {
          job = deepFreeze(DocumentJobSchema.parse(checkpoint.job));
          publish({
            ...eventBase(),
            type: "checkpoint-restored",
            stageId: stage.id
          });
          continue;
        }

        const retry = stage.retry ?? pipeline.retry ?? { maxAttempts: 1 };
        let lastError: Error | undefined;
        for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
          controller.signal.throwIfAborted();
          publish({
            ...eventBase(),
            type: "stage-started",
            stageId: stage.id,
            attempt
          });

          try {
            const patch = await stage.execute({
              job,
              signal: controller.signal,
              attempt
            });
            job = mergeJob(job, patch);
            await options.checkpointStore?.save(
              {
                key: checkpointKey,
                inputHash,
                job,
                completedAt: new Date().toISOString()
              },
              controller.signal
            );
            publish({
              ...eventBase(),
              type: "stage-completed",
              stageId: stage.id,
              attempt
            });
            lastError = undefined;
            break;
          } catch (error) {
            lastError = asError(error);
            controller.signal.throwIfAborted();
            if (attempt < retry.maxAttempts) {
              publish({
                ...eventBase(),
                type: "stage-retrying",
                stageId: stage.id,
                attempt,
                error: lastError
              });
              await abortableDelay(retry.delayMs ?? 0, controller.signal);
            }
          }
        }

        if (lastError) {
          const diagnostic = DiagnosticSchema.parse({
            severity: "error",
            code: "STAGE_EXECUTION_FAILED",
            message: lastError.message,
            stageId: stage.id,
            details: { causeName: lastError.name }
          });
          job = mergeJob(job, {
            diagnostics: [...job.diagnostics, diagnostic]
          });
          throw new PipelineExecutionError(
            `Pipeline stage "${stage.id}" failed`,
            job,
            { cause: lastError }
          );
        }
      }

      publish({ ...eventBase(), type: "pipeline-completed" });
      return job;
    } catch (error) {
      const failure =
        error instanceof PipelineExecutionError
          ? error
          : new PipelineExecutionError("Pipeline execution failed", job, {
              cause: asError(error)
            });
      queue.push({
        ...eventBase(),
        type: "pipeline-failed",
        error: failure
      });
      throw failure;
    } finally {
      options.signal?.removeEventListener("abort", forwardAbort);
      queue.close();
    }
  })();

  return { events: queue, result };
}
