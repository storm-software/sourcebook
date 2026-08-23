# `@sourcebook/core`

Core orchestration primitives for agent-driven source documentation.

```ts
import {
  createDocumentJob,
  createFakeAgentStage,
  createMarkdownRendererStage,
  createPipeline,
  executePipeline,
  MemoryCheckpointStore
} from "@sourcebook/core"

const pipeline = createPipeline({
  id: "project-docs",
  version: "1",
  stages: [
    createFakeAgentStage({ documents }),
    createMarkdownRendererStage({ outputDirectory: "docs" })
  ]
})

const execution = executePipeline(pipeline, createDocumentJob(job), {
  checkpointStore: new MemoryCheckpointStore()
})

for await (const event of execution.events) {
  console.log(event.type)
}

const result = await execution.result
```

Stages run in declaration order and receive an `AbortSignal`. Checkpoints are
reused only when the pipeline signature, stage version and configuration, and
normalized stage input all match. Automatic retries require an idempotent
stage unless explicitly overridden.
