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

import type { Root, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import type { StructuredData } from "../types.js";
import "../vfile.js";

const CONTENT_NODES = new Set([
  "paragraph",
  "blockquote",
  "list",
  "table",
  "code"
]);

function visit(
  nodes: readonly RootContent[],
  data: StructuredData,
  heading?: string
): void {
  let current = heading;

  for (const node of nodes) {
    if (node.type === "heading") {
      const id = node.data?.hProperties?.id;
      const content = toString(node).trim();
      if (typeof id === "string" && id && content) {
        data.headings.push({ id, content });
        current = id;
      }
      continue;
    }

    if (CONTENT_NODES.has(node.type)) {
      const content = toString(node).trim();
      if (content) {
        data.contents.push(
          current ? { heading: current, content } : { content }
        );
      }
      continue;
    }

    if ("children" in node && Array.isArray(node.children)) {
      visit(node.children, data, current);
    }
  }
}

/**
 * Collect headings and text blocks for search. Heading ids must already be assigned.
 */
export const remarkStructure: Plugin<[], Root> = () => (tree, file) => {
  const data: StructuredData = { headings: [], contents: [] };
  visit(tree.children, data);
  file.data.documentationStructuredData = data;
};
