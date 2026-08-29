import { init } from "@flue/runtime";
import { createDocumentJob } from "@sourcebook/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SOURCEBOOK_DOCUMENTS_DATA } from "../../src/lib/agent.js";
import { createFlueAgentStage } from "../../src/lib/stage.js";

vi.mock("@flue/runtime", () => ({ init: vi.fn() }));

const input = createDocumentJob({
  id: "example",
  repository: { root: "/workspace", revision: "abc123" },
  sources: {
    id: "snapshot-1",
    root: "/workspace",
    files: [{ path: "README.md", content: "# Example", hash: "123" }]
  }
});

const documents = [
  {
    slug: "example",
    title: "Example",
    frontmatter: {},
    sections: []
  }
];

const agent = () => "Write documentation.";

describe("createFlueAgentStage", () => {
  const dispatch = vi.fn();
  const read = vi.fn();
  const abort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    dispatch.mockResolvedValue({ submissionId: "submission-1" });
    read.mockResolvedValue({
      text: "Done",
      data: { [SOURCEBOOK_DOCUMENTS_DATA]: [documents] },
      submissionId: "submission-1"
    });
    abort.mockResolvedValue(undefined);
    vi.mocked(init).mockReturnValue({ dispatch, read, abort } as never);
  });

  it("dispatches the job and returns validated documents", async () => {
    const stage = createFlueAgentStage({ agent });
    const result = await stage.execute({
      job: input,
      signal: new AbortController().signal,
      attempt: 1
    });

    expect(stage).toMatchObject({ kind: "agent", idempotent: false });
    expect(init).toHaveBeenCalledWith(agent);
    expect(dispatch).toHaveBeenCalledWith(
      expect.stringContaining('"path":"README.md"')
    );
    expect(result).toEqual({ documents });
  });

  it("rejects replies without submitted Sourcebook documents", async () => {
    read.mockResolvedValue({
      text: "Done",
      data: {},
      submissionId: "submission-1"
    });

    const stage = createFlueAgentStage({ agent });
    await expect(
      stage.execute({
        job: input,
        signal: new AbortController().signal,
        attempt: 1
      })
    ).rejects.toThrow("did not call submit_sourcebook_documents");
  });

  it("durably aborts Flue when the pipeline is cancelled", async () => {
    const controller = new AbortController();
    dispatch.mockImplementation(async () => {
      controller.abort(new Error("cancelled"));
      return { submissionId: "submission-1" };
    });

    const stage = createFlueAgentStage({ agent });
    await expect(
      stage.execute({ job: input, signal: controller.signal, attempt: 1 })
    ).rejects.toThrow("cancelled");
    expect(abort).toHaveBeenCalledOnce();
  });
});
