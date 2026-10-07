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

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// eslint-disable-next-line test/no-import-node-test -- This test exercises the bundled ESM script through Node's built-in runner.
import test from "node:test";

import { readSourcebookConfig as readBlogConfig } from "../skills/sourcebook-blog/scripts/read-config.mjs";
import { readSourcebookConfig as readDocsConfig } from "../skills/sourcebook-docs/scripts/read-config.mjs";

async function withWorkspace(files, run) {
  const root = await mkdtemp(join(tmpdir(), "sourcebook-"));
  try {
    await Promise.all(
      Object.entries(files).map(([name, content]) =>
        writeFile(join(root, name), content)
      )
    );
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const configFile = config => ({
  "sourcebook.config.json": JSON.stringify(config)
});

test("docs reader returns only shared and docs configuration", async () => {
  const input = {
    displayName: "Example",
    homepage: "https://example.com",
    description: "Example workspace",
    instructions: "Use concise language",
    useLocalOutput: false,
    docs: [
      {
        type: "application",
        frontend: "apps/web/src",
        backend: ["apps/api/src"],
        instructions: "Document deployment"
      },
      {
        type: "library",
        packages: ["packages/core", "packages/ui"],
        outputPath: "reference"
      },
      {
        type: "design-system",
        tokens: "tokens",
        fonts: "assets/fonts",
        icons: ["assets/icons"],
        illustrations: "assets/illustrations",
        components: "src/components",
        blocks: "src/blocks",
        layouts: "src/layouts"
      }
    ],
    blog: {
      articles: "../outside",
      generateHeroImages: "not-a-boolean",
      instructions: 42
    }
  };

  await withWorkspace(configFile(input), async root => {
    const result = await readDocsConfig(root, "docs");

    assert.equal(result.workspace, root);
    assert.equal(result.configFile, join(root, "sourcebook.config.json"));
    assert.deepEqual(result.config, {
      displayName: input.displayName,
      homepage: input.homepage,
      description: input.description,
      instructions: input.instructions,
      useLocalOutput: false,
      docs: [
        { ...input.docs[0], outputPath: "docs" },
        input.docs[1],
        { ...input.docs[2], outputPath: "docs" }
      ]
    });
  });
});

test("docs reader supports config arrays and ignores entries without docs", async () => {
  const input = [
    { displayName: "Blog only", blog: { articles: "blog" } },
    {
      displayName: "Library",
      docs: { type: "library", packages: "packages/core" }
    }
  ];

  await withWorkspace(configFile(input), async root => {
    const result = await readDocsConfig(root, "docs");

    assert.deepEqual(result.config, [
      {
        displayName: "Library",
        useLocalOutput: true,
        docs: {
          type: "library",
          packages: "packages/core",
          outputPath: "docs"
        }
      }
    ]);
  });
});

test("docs reader rejects invalid docs configuration", async () => {
  await withWorkspace({}, async root => {
    await assert.rejects(readDocsConfig(root, "docs"), /sourcebook\.config/);
  });

  for (const config of [
    {},
    { docs: [] },
    { docs: { type: "service" } },
    { docs: { type: "application", src: "../outside" } },
    { docs: { type: "application", frontend: 123 } },
    { docs: { type: "library", packages: ["packages/core", "/absolute"] } },
    { docs: { type: "design-system", icons: [""] } },
    { docs: { type: "library", outputPath: "../outside" } },
    { docs: { type: "library", instructions: 10 } },
    { docs: { type: "library" }, useLocalOutput: "yes" }
  ]) {
    await withWorkspace(configFile(config), async root => {
      await assert.rejects(readDocsConfig(root, "docs"));
    });
  }
});

test("blog reader returns only shared and blog configuration", async () => {
  const input = {
    displayName: "Example",
    homepage: "https://example.com",
    description: "Example workspace",
    instructions: "Use concise language",
    useLocalOutput: "not-a-boolean",
    docs: {
      type: "library",
      packages: "../outside",
      outputPath: 42,
      instructions: false
    },
    blog: {
      articles: ["blog", "news"],
      generateHeroImages: true,
      instructions: "Keep the author's voice"
    }
  };

  await withWorkspace(configFile(input), async root => {
    const result = await readBlogConfig(root, "blog");

    assert.equal(result.workspace, root);
    assert.equal(result.configFile, join(root, "sourcebook.config.json"));
    assert.deepEqual(result.config, {
      displayName: input.displayName,
      homepage: input.homepage,
      description: input.description,
      instructions: input.instructions,
      blog: input.blog
    });
  });
});

test("blog reader supports config arrays and ignores entries without blog", async () => {
  const input = [
    { displayName: "Docs only", docs: { type: "library" } },
    { displayName: "Blog", blog: { articles: "articles" } }
  ];

  await withWorkspace(configFile(input), async root => {
    const result = await readBlogConfig(root, "blog");

    assert.deepEqual(result.config, [
      {
        displayName: "Blog",
        blog: { articles: "articles" }
      }
    ]);
  });
});

test("blog reader rejects invalid blog configuration", async () => {
  for (const config of [
    {},
    { blog: [] },
    { blog: { articles: "../outside" } },
    { blog: { articles: ["articles", "/absolute"] } },
    { blog: { generateHeroImages: "yes" } },
    { blog: { instructions: 10 } }
  ]) {
    await withWorkspace(configFile(config), async root => {
      await assert.rejects(readBlogConfig(root, "blog"));
    });
  }
});
