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

import GithubSlugger from "github-slugger";
import type { Heading, Root, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";
import type { Plugin } from "unified";

import "../vfile.js";
import type { DocumentationHeading } from "../vfile.js";

const HEADING_ID = /\s*\[#([^\]]+)\]\s*$/;
const TOC_SKIP = "[!toc]";
const TOC_ONLY = "[toc]";

function stripMarker(heading: Heading, marker: string): boolean {
  let removed = false;
  for (const child of heading.children) {
    if (child.type !== "text" || !child.value.includes(marker)) continue;
    child.value = child.value.replaceAll(marker, "").replace(/[ \t]{2,}/g, " ");
    removed = true;
  }
  const textNodes = heading.children.filter(child => child.type === "text");
  const first = textNodes[0];
  const last = textNodes.at(-1);
  if (first?.type === "text") first.value = first.value.replace(/^\s+/, "");
  if (last?.type === "text") last.value = last.value.replace(/\s+$/, "");
  heading.children = heading.children.filter(
    child => child.type !== "text" || child.value.length > 0
  );
  return removed;
}

function headingProperties(heading: Heading): Record<string, unknown> {
  heading.data ??= {};
  const properties = heading.data.hProperties ?? {};
  heading.data.hProperties = properties;
  return properties;
}

function walk(
  node: Root | RootContent,
  visit: (node: RootContent) => void
): void {
  if (node.type !== "root") visit(node);
  if (!("children" in node) || !Array.isArray(node.children)) return;
  for (const child of node.children) walk(child, visit);
}

/**
 * Assign heading ids and remember the title and opening paragraph.
 * A trailing `[#custom-id]` on a heading becomes its id.
 */
export const remarkHeading: Plugin<[], Root> = () => (tree, file) => {
  const slugger = new GithubSlugger();
  const headings: DocumentationHeading[] = [];
  // Generated API links use explicit member IDs. Reserve them before assigning
  // automatic IDs so titles and comment headings cannot capture those links.
  const explicitIds = new Set<string>();
  walk(tree, node => {
    if (node.type !== "heading") return;
    const id = node.data?.hProperties?.id;
    if (typeof id === "string" && id) explicitIds.add(id);
    const last = node.children.at(-1);
    if (last?.type === "text") {
      const customId = HEADING_ID.exec(last.value)?.[1]?.trim();
      if (customId) explicitIds.add(customId);
    }
  });

  walk(tree, node => {
    if (node.type !== "heading") return;

    const properties = headingProperties(node);
    const last = node.children.at(-1);
    if (last?.type === "text") {
      const match = HEADING_ID.exec(last.value);
      const customId = match?.[1]?.trim();
      if (match && customId) {
        properties.id = customId;
        last.value = last.value.slice(0, match.index).replace(/\s+$/, "");
        if (!last.value) node.children.pop();
      }
    }

    if (stripMarker(node, TOC_SKIP)) properties["data-toc"] = "skip";
    else if (stripMarker(node, TOC_ONLY)) properties["data-toc"] = "only";

    const text = toString(node).trim();
    if (typeof properties.id !== "string" || !properties.id) {
      if (!text) return;
      properties.id = slugger.slug(text);
      while (explicitIds.has(String(properties.id)))
        properties.id = slugger.slug(text);
    }

    if (text) {
      headings.push({ depth: node.depth, id: String(properties.id), text });
    }
  });

  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      const text = toString(node).trim();
      if (text) {
        file.data.documentationTitle = text;
        break;
      }
    }
  }

  for (const node of tree.children) {
    if (node.type !== "paragraph") continue;
    const text = toString(node).trim();
    if (!text) continue;
    file.data.documentationDescription = text;
    break;
  }

  file.data.documentationHeadings = headings;
};
