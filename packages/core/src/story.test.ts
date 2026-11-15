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

import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  compileDocumentationPage,
  DocumentationPageError,
  generateComponentStoryPage,
  parseComponentStory,
  writeComponentCatalog
} from "./index.js";

const CALLOUT = `import { defineStory } from "@/lib/story";
import { Callout } from "./Callout";

/** Not the story comment. */
const unused = 1;

/**
 * Shows a short message that interrupts the reading flow.
 * Use it for a warning or a note.
 *
 * Callouts stack vertically.
 *
 * @anatomy
 * - \`Callout\`: the root. \`theme\` sets the colors.
 *   - \`Callout.Header\`: the icon and the heading.
 * - \`Callout.Body\`: the message.
 *
 * @usage
 * Use one callout per section.
 *
 * @example
 * \`\`\`tsx
 * import { Callout } from "@cyclone-ui/callout";
 * @decorated
 * <Callout theme="warning">Back up first.</Callout>
 * \`\`\`
 *
 * @example
 * <Callout>Plain</Callout>
 *
 * @see https://example.com
 */
export const story = defineStory({
  Component: Callout,
  args: [
    { variant: "Default", initial: { children: "Text" } },
    {
      variant: "Warning",
      initial: { children: "Text" },
      fixed: {
        theme: "warning"
      }
    }
  ]
});
`;

describe("parseComponentStory", () => {
  it("reads the component, its TSDoc sections, and its variants", () => {
    const story = parseComponentStory(
      CALLOUT,
      "components/callout/Callout.story.tsx"
    );

    expect(story).toMatchObject({
      exportName: "story",
      name: "Callout",
      slug: "callout",
      description:
        "Shows a short message that interrupts the reading flow. Use it for a warning or a note.",
      usage: "Use one callout per section.",
      variants: [
        { name: "Default" },
        { name: "Warning", fixed: `{\n        theme: "warning"\n      }` }
      ]
    });
    expect(story.overview).toContain("Callouts stack vertically.");
    expect(story.anatomy).toContain(
      "  - `Callout.Header`: the icon and the heading."
    );
    expect(story.examples).toHaveLength(2);
    expect(story.examples[0]).toContain("@decorated");
    expect(story.examples[1]).toBe("```tsx\n<Callout>Plain</Callout>\n```");
    expect(story.examples.join("")).not.toContain("example.com");
  });

  it("rejects a story without a summary, a Component, or a defineStory export", () => {
    const missing = (source: string) => {
      try {
        parseComponentStory(source, "x.story.tsx");
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentationPageError);
        return (error as DocumentationPageError).missingFields;
      }
      throw new Error("expected the story to be rejected");
    };

    expect(
      missing("export const story = defineStory({ Component: X });")
    ).toEqual(["description"]);
    expect(
      missing("/** Text. */\nexport const story = defineStory({});")
    ).toEqual(["Component"]);
    expect(missing("const story = defineStory({ Component: X });")).toEqual([]);
  });
});

describe("generateComponentStoryPage", () => {
  it("writes MDX that renders the story and compiles as a reference page", () => {
    const story = parseComponentStory(CALLOUT, "Callout.story.tsx");
    const page = generateComponentStoryPage(story, "../src/Callout.story.tsx");

    expect(page).toContain('import { story } from "../src/Callout.story";');
    expect(page).toContain("<story.WithControl />");
    expect(page).toContain('- Warning: `{ theme: "warning" }`');

    const compiled = compileDocumentationPage(page, {
      path: "components/callout.mdx"
    });
    expect(compiled.title).toBe("Callout");
    expect(compiled.documentType).toBe("reference");
    expect(compiled.derivedFields).toEqual([]);
    expect(compiled.toc.map(item => item.title)).toEqual([
      "Anatomy",
      "Usage",
      "Variants",
      "Examples"
    ]);
    expect(compiled.html).toContain(
      '<div data-mdx-component="story.WithControl"></div>'
    );
    expect(compiled.html).not.toContain("Callout.story");
    expect(compiled.html).not.toContain("Generated by");
  });
});

describe("writeComponentCatalog", () => {
  it("writes a page per story and an index, and keeps hand-written pages", async () => {
    const root = await mkdtemp(join(tmpdir(), "sourcebook-stories-"));
    try {
      await mkdir(join(root, "components/callout/src"), { recursive: true });
      await mkdir(join(root, "components/node_modules/x"), { recursive: true });
      await writeFile(
        join(root, "components/callout/src/Callout.story.tsx"),
        CALLOUT
      );
      await writeFile(
        join(root, "components/badge.story.ts"),
        "/** Labels a | status. */\nexport const story = defineStory({ Component: Badge });\n"
      );
      await writeFile(
        join(root, "components/node_modules/x/x.story.tsx"),
        "broken"
      );

      const out = join(root, "docs/components");
      const written = await writeComponentCatalog(
        join(root, "components"),
        out
      );
      expect(written).toEqual([
        join(out, "badge.mdx"),
        join(out, "callout.mdx"),
        join(out, "index.mdx")
      ]);

      const callout = await readFile(join(out, "callout.mdx"), "utf8");
      expect(callout).toContain(
        'from "../../components/callout/src/Callout.story"'
      );
      const index = await readFile(join(out, "index.mdx"), "utf8");
      expect(index).toContain(
        "| [Badge](./badge.mdx) | Labels a \\| status. |"
      );
      expect(
        compileDocumentationPage(index, { path: "components/index.mdx" }).title
      ).toBe("Components");

      await writeFile(
        join(root, "docs/tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            paths: {
              "@/*": ["../*"],
              "@ui/*": ["../components/*"],
              "@ui/badge": ["../components/badge.story.ts"]
            }
          }
        })
      );
      await writeComponentCatalog(join(root, "components"), out);
      expect(await readFile(join(out, "callout.mdx"), "utf8")).toContain(
        'from "@ui/callout/src/Callout.story"'
      );
      expect(await readFile(join(out, "badge.mdx"), "utf8")).toContain(
        'from "@ui/badge"'
      );

      await writeFile(join(out, "badge.md"), "# Badge\n\nHand-written.\n");
      await expect(
        writeComponentCatalog(join(root, "components"), out)
      ).rejects.toThrow(/badge\.md was not generated/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("sourcebook-story skill", () => {
  it("tells authors to write the fields the parser reads", () => {
    const skill = readFileSync(
      fileURLToPath(
        new URL("../../../skills/sourcebook-story/SKILL.md", import.meta.url)
      ),
      "utf8"
    );

    const sourcebook = readFileSync(
      fileURLToPath(
        new URL("../../../skills/sourcebook/SKILL.md", import.meta.url)
      ),
      "utf8"
    );
    expect(sourcebook).toContain("../sourcebook-story/SKILL.md");

    for (const text of [
      "@sourcebook/core",
      "writeComponentCatalog",
      "defineStory",
      "@anatomy",
      "@usage",
      "@example",
      ".story.tsx"
    ]) {
      expect(skill).toContain(text);
    }
  });
});
