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

import { TSDocConfiguration, TSDocParser } from "@microsoft/tsdoc";
import { TSDocConfigFile } from "@microsoft/tsdoc-config";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compileDocumentationPage,
  generateComponentStoryPage,
  parseComponentStory,
  parseTSDocComment,
  renderTSDocFeatures
} from "./index.js";

describe("TSDoc features", () => {
  it("loads the shared and workspace presets with the official TSDoc tooling", () => {
    for (const path of [
      "../../tsdoc/recommended.json",
      "../../../tsdoc.json"
    ]) {
      const config = TSDocConfigFile.loadFile(
        fileURLToPath(new URL(path, import.meta.url))
      );
      expect(config.hasErrors, config.getErrorSummary()).toBe(false);
      const configuration = new TSDocConfiguration();
      config.configureParser(configuration);
      expect(config.hasErrors, config.getErrorSummary()).toBe(false);
      const parser = new TSDocParser(configuration);
      const context = parser.parseString(
        "/** Summary.\n * @warning Be careful.\n * @warning Again.\n * @credit Original author.\n * @acknowledgements Maintainers.\n * @anatomy Parts.\n * @usage Instructions.\n */"
      );
      expect(context.log.messages.map(message => message.toString())).toEqual(
        []
      );
      expect(context.docComment.customBlocks).toHaveLength(6);
    }
  });

  it("accepts single-line tags and stripped Markdown without dropping list markers", () => {
    expect(parseTSDocComment("/** @warning Be careful. */").callouts).toEqual([
      { type: "warning", text: "Be careful." }
    ]);
    const doc = parseTSDocComment(
      "Summary.\n\n* Keep this list.\n\n@note\n* Keep this too."
    );
    expect(doc.summary).toContain("* Keep this list.");
    expect(doc.callouts[0]?.text).toBe("* Keep this too.");
  });
  it("preserves repeated blocks, Markdown, and unknown tags without consuming fenced decorators", () => {
    const doc = parseTSDocComment(`/**
 * Load the catalog.
 *
 * @remarks Keeps **Markdown**.
 * @warning Back up first.
 *
 * Run once.
 * @warning Never retry blindly.
 * @credit [Original implementation](https://example.com).
 * @acknowledgements Test maintainers.
 * @example
 * ~~~~ts
 * @decorator
 * \`\`\`
 * @stillCode
 * ~~~~
 * @customTag Retain this for consumers.
 */`);
    expect(doc.summary).toBe("Load the catalog.");
    expect(doc.tags.filter(tag => tag.name === "warning")).toHaveLength(2);
    expect(doc.tags.find(tag => tag.name === "example")?.text).toContain(
      "@stillCode"
    );
    expect(doc.tags.at(-1)).toEqual({
      name: "customTag",
      text: "Retain this for consumers."
    });
    expect(doc.callouts).toEqual([
      { type: "warning", text: "Back up first.\n\nRun once." },
      { type: "warning", text: "Never retry blindly." }
    ]);
    expect(doc.acknowledgements).toEqual([
      "[Original implementation](https://example.com).",
      "Test maintainers."
    ]);
  });

  it("renders every configured callout as a compiled admonition and keeps credit links", () => {
    const doc = parseTSDocComment(`/** Summary.
 * @note Note text.
 * @tip Tip text.
 * @important Important text.
 * @warning Warning text.
 * @caution Caution text.
 * @danger Danger text.
 * @info Info text.
 * @credit [Ada](https://example.com/ada)
 */`);
    const markdown = renderTSDocFeatures(doc);
    const page = compileDocumentationPage(
      `---\ntitle: API\ndescription: API docs.\ndocumentType: reference\n---\n\n${markdown}`,
      { path: "api.md" }
    );
    expect(page.html.match(/<aside /g)).toHaveLength(7);
    expect(page.html).toContain("admonition-danger");
    expect(page.html).toContain('href="https://example.com/ada"');
    expect(page.toc.map(item => item.title)).toContain("Acknowledgements");
  });

  it("includes custom sections in generated story MDX and its compiled HTML", () => {
    const story = parseComponentStory(
      `/**
 * Shows a badge.
 * @remarks Works inline.
 * @warning Do not use color alone.\n *\n * Include a label.
 * @credit [Design team](https://example.com/team)
 */
export const story = defineStory({ Component: Badge });`,
      "badge.story.tsx"
    );
    const source = generateComponentStoryPage(story, "./badge.story.tsx");
    const page = compileDocumentationPage(source, { path: "badge.mdx" });
    expect(page.html).toContain("Works inline.");
    expect(page.html).toContain("admonition-warning");
    expect(page.html).toContain("Include a label.");
    expect(page.html).toContain('href="https://example.com/team"');
    expect(story.description).toBe("Shows a badge.");
  });

  it("ignores empty custom blocks and preserves comments without custom features", () => {
    expect(parseTSDocComment("")).toMatchObject({
      summary: "",
      tags: [],
      callouts: [],
      acknowledgements: []
    });
    expect(
      renderTSDocFeatures(
        parseTSDocComment("/** Summary.\n * @warning\n * @credit\n */")
      )
    ).toBe("");
  });
});
