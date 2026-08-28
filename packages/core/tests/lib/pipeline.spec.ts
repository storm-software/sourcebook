import { describe, expect, it, vi } from "vitest";

import { MemoryCheckpointStore } from "./checkpoint.js";
import { createFakeAgentStage } from "./fake-agent.js";
import { createMarkdownRendererStage } from "./markdown.js";
import { createDocumentJob, type DocumentPage } from "./model.js";
import {
  createPipeline,
  executePipeline,
  type PipelineEvent,
  type PipelineStage
} from "./pipeline.js";

const page: DocumentPage = {
  slug: "getting-started",
  title: "Getting started",
  description: "Build documentation with Sourcebook.",
  frontmatter: { category: "Guide", featured: true },
  sections: [
    {
      id: "install",
      heading: "Install",
      blocks: [
        {
          type: "prose",
          text: "Install the package.",
          citations: [
            {
              path: "package.json",
              startLine: 1,
              label: "Package manifest"
            }
          ]
        },
        {
          type: "code",
          language: "sh",
          code: "pnpm add @sourcebook/core",
          citations: []
        },
        {
          type: "links",
          links: [{ label: "Sourcebook", url: "https://sourcebook.dev" }],
          citations: []
        }
      ],
      sections: []
    }
  ]
};

const input = createDocumentJob({
  id: "example",
  repository: { root: "/workspace", revision: "abc123" },
  sources: {
    id: "snapshot-1",
    root: "/workspace",
    revision: "abc123",
    files: [
      {
        path: "package.json",
        content: "{}",
        hash: "44136fa355b3"
      }
    ]
  }
});

async function collect(events: AsyncIterable<PipelineEvent>) {
  const collected: PipelineEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

describe("pipeline", () => {
  it("generates Markdown and resumes matching checkpoints", async () => {
    const checkpoints = new MemoryCheckpointStore();
    const pipeline = createPipeline({
      id: "docs",
      version: "1",
      stages: [
        createFakeAgentStage({ documents: [page] }),
        createMarkdownRendererStage({ outputDirectory: "docs" })
      ]
    });

    const first = executePipeline(pipeline, input, {
      checkpointStore: checkpoints
    });
    const firstEventsPromise = collect(first.events);
    const firstResult = await first.result;
    const firstEvents = await firstEventsPromise;

    expect(firstResult.artifacts).toHaveLength(1);
    expect(firstResult.artifacts[0]?.path).toBe("docs/getting-started.md");
    expect(firstResult.artifacts[0]?.content).toContain(
      "## Install\n\nInstall the package."
    );
    expect(firstEvents.map(event => event.type)).toEqual([
      "pipeline-started",
      "stage-started",
      "stage-completed",
      "stage-started",
      "stage-completed",
      "pipeline-completed"
    ]);

    const resumed = executePipeline(pipeline, input, {
      checkpointStore: checkpoints
    });
    const resumedEventsPromise = collect(resumed.events);
    await expect(resumed.result).resolves.toEqual(firstResult);
    const resumedEvents = await resumedEventsPromise;
    expect(resumedEvents.map(event => event.type)).toEqual([
      "pipeline-started",
      "checkpoint-restored",
      "checkpoint-restored",
      "pipeline-completed"
    ]);
  });

  it("retries idempotent stages", async () => {
    const execute = vi
      .fn<PipelineStage["execute"]>()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue({ metadata: { retried: "true" } });
    const stage: PipelineStage = {
      id: "retrying-stage",
      kind: "transform",
      version: "1",
      idempotent: true,
      retry: { maxAttempts: 2 },
      execute
    };
    const execution = executePipeline(
      createPipeline({ id: "retry", version: "1", stages: [stage] }),
      input
    );
    const eventsPromise = collect(execution.events);

    await expect(execution.result).resolves.toMatchObject({
      metadata: { retried: "true" }
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect((await eventsPromise).map(event => event.type)).toContain(
      "stage-retrying"
    );
  });

  it("rejects automatic retries for non-idempotent stages", () => {
    expect(() =>
      createPipeline({
        id: "unsafe",
        version: "1",
        retry: { maxAttempts: 2 },
        stages: [
          {
            id: "writer",
            kind: "output",
            version: "1",
            idempotent: false,
            execute: () => ({})
          }
        ]
      })
    ).toThrow("is not idempotent");
  });
});
