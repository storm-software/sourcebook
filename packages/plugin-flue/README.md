# `@sourcebook/plugin-flue`

Runs a [Flue](https://flueframework.com) agent as a Sourcebook Core pipeline
stage.

```ts
import { useModel, useSubagent } from "@flue/runtime"
import { createPipeline } from "@sourcebook/core"
import {
  createFlueAgentStage,
  useSourcebookDocuments
} from "@sourcebook/plugin-flue"

function Researcher() {
  return "Inspect the supplied sources and report the important facts."
}

export function DocumentationAgent() {
  useModel("anthropic/claude-sonnet-4-6")
  useSubagent({
    name: "researcher",
    description: "Researches source material before documentation is written.",
    agent: Researcher
  })
  useSourcebookDocuments()

  return "Delegate research when useful, then write accurate Sourcebook documents."
}

const pipeline = createPipeline({
  id: "project-docs",
  version: "1",
  stages: [createFlueAgentStage({ agent: DocumentationAgent })]
})
```

The host owns Flue runtime setup. Start it once with `start({ agents: [...] })`
for standalone Node.js processes, or register the agent with the existing Flue
server. The pipeline stage does not start or stop a shared runtime.

The stage is intentionally non-idempotent because dispatching an agent creates
a durable Flue submission. Core therefore rejects automatic retries unless they
are explicitly enabled. Pipeline cancellation durably aborts the Flue instance.
