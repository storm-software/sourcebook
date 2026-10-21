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

import type { Element, Root, RootContent } from "hast";
import { toString } from "hast-util-to-string";
import type { Plugin } from "unified";

import type { TocItem } from "../types.js";
import "../vfile.js";

function tocMode(node: Element): "skip" | "only" | undefined {
  const value = node.properties["data-toc"] ?? node.properties.dataToc;

  return value === "skip" || value === "only" ? value : undefined;
}

function collect(nodes: RootContent[], toc: TocItem[]): void {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node || node.type !== "element") continue;

    if (/^h[1-6]$/.test(node.tagName)) {
      const mode = tocMode(node);
      delete node.properties["data-toc"];
      delete node.properties.dataToc;
      const id = node.properties.id;
      const title = toString(node).replace(/\s+/g, " ").trim();
      const depth = Number(node.tagName.slice(1));
      const include = Boolean(title) && typeof id === "string" && id.length > 0;

      if (mode === "only") {
        if (include && typeof id === "string") {
          toc.push({ title, url: `#${id}`, depth });
        }
        nodes.splice(index, 1);
        index -= 1;
        continue;
      }

      if (mode !== "skip" && include && depth > 1 && typeof id === "string") {
        toc.push({ title, url: `#${id}`, depth });
      }
      continue;
    }

    if (node.children.length) collect(node.children, toc);
  }
}

/**
 * Build the page table of contents from heading elements.
 * `[!toc]` omits a heading. `[toc]` includes it and removes it from the body.
 * Level-1 headings are omitted unless marked `[toc]`.
 */
export const rehypeToc: Plugin<[], Root> = () => (tree, file) => {
  const toc: TocItem[] = [];
  collect(tree.children, toc);
  file.data.documentationToc = toc;
};
