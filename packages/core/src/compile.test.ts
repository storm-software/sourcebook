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

import {
  documentationMarkdownInstructions,
  documentationPageRequirements
} from "@sourcebook/config";
import type { Root } from "mdast";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "unified";
import { describe, expect, it } from "vitest";

import {
  compileDocumentationPage,
  DocumentationPageError,
  loadDocumentationPages
} from "./index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function failure(source: string, path?: string): DocumentationPageError {
  try {
    compileDocumentationPage(source, path ? { path } : {});
  } catch (error) {
    expect(error).toBeInstanceOf(DocumentationPageError);
    return error as DocumentationPageError;
  }
  throw new Error("expected compilation to fail");
}

describe("compileDocumentationPage", () => {
  it("compiles GitHub Flavored Markdown, admonitions, and a table of contents", () => {
    const page = compileDocumentationPage(
      `---
title: Install
description: Install the package and compile a page.
documentType: getting-started
tags: setup, api
---

# Install

Install the package.

## Steps

Run the installer.

> [!NOTE]
> Node is required.

:::tip[Fast path]
Use the workspace catalog.
:::

| Command | Purpose |
| --- | --- |
| install | Fetch packages |

~~old~~ command

- [x] write

\`\`\`ts
const value = 1;
\`\`\`

## Twice

## Twice

## Details [#details]

## Skip me [!toc]

# Extra [toc]

<div class="banner">Hello</div>
`,
      { path: "docs/Install.md" }
    );

    expect(page.kind).toBe("docs");
    expect(page.slug).toBe("docs/install");
    expect(page.title).toBe("Install");
    expect(page.description).toBe("Install the package and compile a page.");
    expect(page.documentType).toBe("getting-started");
    expect(page.tags).toEqual(["setup", "api"]);
    expect(page.derivedFields).toEqual([]);
    expect(page.missingFields).toEqual([]);
    expect(page.html).toContain('<aside class="admonition admonition-note"');
    expect(page.html).toContain("admonition-tip");
    expect(page.html).toContain("Fast path");
    expect(page.html).toContain("<table>");
    expect(page.html).toContain("<del>old</del>");
    expect(page.html).toContain('type="checkbox"');
    expect(page.html).toContain("language-ts");
    expect(page.html).toContain('<div class="banner">Hello</div>');
    expect(page.html).toContain("Skip me");
    expect(page.html).not.toContain("Extra");
    expect(page.toc.map(item => item.title)).toEqual([
      "Steps",
      "Twice",
      "Twice",
      "Details",
      "Extra"
    ]);
    expect(page.toc.map(item => item.url)).toEqual([
      "#steps",
      "#twice",
      "#twice-1",
      "#details",
      "#extra"
    ]);
    expect(
      page.structuredData.headings.map(heading => heading.content)
    ).toContain("Details");
    expect(
      page.structuredData.contents.some(content =>
        content.content.includes("Node is required")
      )
    ).toBe(true);
  });

  it("derives a docs title and description and still requires documentType", () => {
    const page = compileDocumentationPage(`---
documentType: concept
---

# Derived title

Derived description.
`);

    expect(page.title).toBe("Derived title");
    expect(page.description).toBe("Derived description.");
    expect(page.derivedFields).toEqual(["title", "description"]);

    const error = failure(`---
title: Install
description: Install it.
---

# Install
`);
    expect(error.missingFields).toEqual(["documentType"]);
    expect(error.message).toContain("getting-started");
  });

  it("accepts a normalized document type and a tag list", () => {
    const page = compileDocumentationPage(`---
title: API
description: Public functions.
documentType: Getting Started
tags:
  - setup
  - api, reference
---

# API

Public functions.
`);

    expect(page.documentType).toBe("getting-started");
    expect(page.tags).toEqual(["setup", "api", "reference"]);
  });

  it("requires a blog summary and infers the kind from the path", () => {
    const error = failure(
      `---
title: Release
description: What shipped.
---

# Release

The compiler is new.
`,
      "blog/release.md"
    );

    expect(error.kind).toBe("blog");
    expect(error.missingFields).toContain("summary");

    const page = compileDocumentationPage(
      `---
title: Release
description: What shipped.
summary: The compiler now builds pages from Markdown.
---

# Release

The compiler is new.
`,
      { path: "blog/release.md" }
    );
    expect(page.kind).toBe("blog");
    expect(page.summary).toBe("The compiler now builds pages from Markdown.");
  });

  it("requires a guide audience and perspective", () => {
    const page = compileDocumentationPage(
      `---
title: Auth
description: Walk through session creation.
audience: New contributor
perspective: under the hood
---

# Auth

The session cookie is created after the password check.
`,
      { kind: "guide" }
    );

    expect(page.perspective).toBe("under-the-hood");
    expect(page.audience).toBe("New contributor");
    expect(
      failure(
        `---
title: Auth
description: Walk through session creation.
audience: New contributor
---

# Auth

Body.
`,
        "guides/auth.md"
      ).missingFields
    ).toEqual(["perspective"]);
  });

  it("compiles an ADR from its body fields", () => {
    const page = compileDocumentationPage(
      `# Use remark for documentation pages

- Status: accepted
- Date: 2026-10-21

## Context and Problem Statement

The project needs to compile Markdown into pages.

## Considered Options

- remark and rehype
- a custom parser

## Decision Outcome

Chosen option: "remark and rehype", because the pipeline already speaks Markdown.
`,
      { path: "docs/adr/20261021-use-remark.md" }
    );

    expect(page.kind).toBe("adr");
    expect(page.title).toBe("Use remark for documentation pages");
    expect(page.status).toBe("accepted");
    expect(page.date).toBe("2026-10-21");
    expect(page.description).toContain("compile Markdown into pages");
    expect(page.slug).toBe("docs/adr/20261021-use-remark");

    const error = failure(
      `# Partial

- Status: done
- Date: yesterday

## Context and Problem Statement

Something happened.

## Decision Outcome

We picked one.
`,
      "adr/partial.md"
    );
    expect(error.missingFields).toEqual(["Considered Options"]);
    expect(error.invalidFields.map(field => field.name)).toEqual([
      "status",
      "date"
    ]);
  });

  it("compiles a README from its sections and accepted aliases", () => {
    const page = compileDocumentationPage(
      `# Example

Example is a documentation compiler.

## Features

- Compiles Markdown

## Getting Started

Install the package.

## Examples

Call compileDocumentationPage.

## Contributing

Run the tests.
`,
      { path: "packages/example/README.md" }
    );

    expect(page.kind).toBe("readme");
    expect(page.slug).toBe("packages/example");
    expect(page.title).toBe("Example");
    expect(page.description).toBe("Example is a documentation compiler.");
    expect(page.missingFields).toEqual([]);

    expect(
      failure(
        `# Example

Example is a compiler.

## Quick Features

- Compiles Markdown

## Installation

Install it.

## Development

Run the tests.
`,
        "README.md"
      ).missingFields
    ).toEqual(["Usage"]);
  });

  it("returns incomplete pages when strict mode is off and still rejects broken YAML", () => {
    const page = compileDocumentationPage(
      `# Notes

A paragraph.
`,
      { strict: false }
    );

    expect(page.title).toBe("Notes");
    expect(page.missingFields).toContain("documentType");
    expect(page.html).toContain('<h1 id="notes">Notes</h1>');

    expect(() =>
      compileDocumentationPage(
        `---
title: [
---

# Broken
`,
        { strict: false }
      )
    ).toThrow(/Invalid YAML front matter/);
  });

  it("runs caller-supplied remark plugins before heading ids", () => {
    const remarkPlugin: Plugin<[], Root> = () => tree => {
      tree.children.push({
        type: "heading",
        depth: 2,
        children: [{ type: "text", value: "From a plugin" }]
      });
    };

    const page = compileDocumentationPage(
      `---
title: Plugins
description: Extra plugins join the pipeline.
documentType: reference
---

# Plugins

The page starts here.
`,
      { remarkPlugins: [remarkPlugin] }
    );

    expect(page.html).toContain("From a plugin");
    expect(page.toc.map(item => item.title)).toContain("From a plugin");
  });

  it("parses an .mdx page as MDX and keeps only renderable content", () => {
    const page = compileDocumentationPage(
      `---
title: Button
description: Starts an action.
documentType: reference
---

import { story } from "./button.story";
export const meta = { hidden: true };

{/* A generated-page comment. */}

# Button

Press it {1 + 1} times.

<story.WithControl />

<Callout type="warning">
Keep the label short.
</Callout>

<div className="demo" hidden>Inline</div>
`,
      { path: "components/button.mdx" }
    );

    expect(page.html).not.toMatch(/import|export|comment|1 \+ 1/);
    expect(page.html).toContain(
      '<div data-mdx-component="story.WithControl"></div>'
    );
    expect(page.html).toContain('<div data-mdx-component="Callout">');
    expect(page.html).toContain('<div class="demo" hidden>Inline</div>');
    expect(
      page.structuredData.contents.map(content => content.content)
    ).toContain("Keep the label short.");

    expect(() =>
      compileDocumentationPage("# Broken\n\n<!-- html comment -->\n", {
        format: "mdx"
      })
    ).toThrow(/Invalid MDX/);
  });

  it("uses an index file and a guide directory as the slug and kind", () => {
    const page = compileDocumentationPage(
      `---
title: Start
description: Where to start.
audience: New contributor
perspective: hands-on
---

# Start

Follow the steps.
`,
      { path: "guides/start/index.md" }
    );

    expect(page.kind).toBe("guide");
    expect(page.slug).toBe("guides/start");
  });
});

describe("loadDocumentationPages", () => {
  it("compiles Markdown files under a directory and skips hidden directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "sourcebook-pages-"));
    try {
      await writeFile(
        join(root, "page.md"),
        `---
title: Page
description: A hand-written page.
documentType: reference
---

# Page

Hand-written body.
`
      );
      await writeFile(
        join(root, "README.md"),
        `# Tool

Tool compiles pages.

## Quick Features

- Pages

## Installation

Add the package.

## Usage

Call the compiler.

## Development

Run vitest.
`
      );

      const pages = await loadDocumentationPages(root);
      expect(pages.map(page => page.kind)).toEqual(["docs", "readme"]);
      expect(pages.map(page => page.path)).toEqual(["page.md", "README.md"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("documentation page instructions", () => {
  it("names every required field and the skills tell authors to write them", () => {
    for (const fields of Object.values(documentationPageRequirements)) {
      for (const field of fields) {
        expect(documentationMarkdownInstructions).toContain(field.name);
      }
    }

    const skill = (name: string) =>
      readFileSync(join(repoRoot, "skills", name, "SKILL.md"), "utf8");

    const docs = skill("sourcebook-docs");
    expect(docs).toContain("@sourcebook/core");
    expect(docs).toContain("documentType");
    for (const value of [
      "getting-started",
      "tutorial",
      "concept",
      "recipe",
      "reference"
    ]) {
      expect(docs).toContain(value);
    }

    const blog = skill("sourcebook-blog");
    expect(blog).toContain("@sourcebook/core");
    expect(blog).toContain("summary");

    const guide = skill("sourcebook-guide");
    expect(guide).toContain("@sourcebook/core");
    expect(guide).toContain("under-the-hood");
    expect(guide).toContain("hands-on");
    expect(guide).toContain("audience");

    const adr = skill("sourcebook-adr");
    expect(adr).toContain("@sourcebook/core");
    expect(adr).toContain("Context and Problem Statement");
    expect(adr).toContain("Considered Options");
    expect(adr).toContain("Decision Outcome");

    const readme = skill("sourcebook-readme");
    expect(readme).toContain("@sourcebook/core");
    expect(readme).toContain("Quick Features");
    expect(readme).toContain("Getting Started");

    const editor = skill("sourcebook-editor");
    expect(editor).toContain("@sourcebook/core");
    expect(editor).toContain("documentType");
    expect(editor).toContain("summary");
  });
});
