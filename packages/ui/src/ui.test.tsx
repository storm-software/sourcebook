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

import { config } from "@cyclone-ui/tokens/tamagui";
import { compileDocumentationPage } from "@sourcebook/core";
import { TamaguiProvider } from "@tamagui/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createPageTree, DocsLayout, DocsPage } from "./index";

describe("createPageTree", () => {
  it("nests pages by slug and uses directory pages as folder indexes", () => {
    expect(
      createPageTree(
        [
          { slug: "index", title: "Home" },
          { slug: "api/core", title: "Core" },
          { slug: "guides", title: "Guides" },
          { slug: "guides/install", title: "Install" }
        ],
        "/docs/"
      )
    ).toEqual([
      { type: "page", name: "Home", url: "/docs" },
      {
        type: "folder",
        name: "Api",
        children: [{ type: "page", name: "Core", url: "/docs/api/core" }]
      },
      {
        type: "folder",
        name: "Guides",
        index: { type: "page", name: "Guides", url: "/docs/guides" },
        children: [
          { type: "page", name: "Install", url: "/docs/guides/install" }
        ]
      }
    ]);
  });
});

describe("DocsPage", () => {
  it("renders a compiled page with Cyclone UI components", () => {
    const page = compileDocumentationPage(
      [
        "# Notes",
        "",
        "Run `pnpm build` first. See [install](/docs/install).",
        "",
        "> [!WARNING]",
        "> Careful.",
        "",
        "```ts",
        "const answer = 42;",
        "```",
        ""
      ].join("\n"),
      { strict: false }
    );
    const tree = createPageTree([{ slug: "notes", title: page.title }]);
    const html = renderToStaticMarkup(
      <TamaguiProvider config={config} defaultTheme="light">
        <DocsLayout tree={tree} title="Sourcebook" activeUrl="/docs/notes">
          <DocsPage page={page} />
        </DocsLayout>
      </TamaguiProvider>
    );

    expect(html).toMatch(/<h1[^>]*id="notes"/);
    expect(html).toContain('href="/docs/install"');
    expect(html).toMatch(/<code[^>]*>pnpm build<\/code>/);
    expect(html).toContain("Warning");
    expect(html).toMatch(/<figure[^>]*>[\s\S]*<code class="language-ts">/);
    expect(html).toContain('href="/docs/notes"');
    // The body has an h1, so the page title is not rendered twice.
    expect(html.match(/<h1/g)).toHaveLength(1);
  });
});
