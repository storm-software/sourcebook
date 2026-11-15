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

import type { Root } from "mdast";
import type { Plugin } from "unified";

// cspell:ignore mdxjs
const DROPPED = new Set(["mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"]);
const HTML_TAG = /^[a-z][a-z0-9-]*$/;

interface MdxNode {
  type: string;
  name?: string | null;
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: MdxNode[];
  data?: Record<string, unknown>;
}

function transform(nodes: MdxNode[]): MdxNode[] {
  return nodes
    .filter(node => !DROPPED.has(node.type))
    .map(node => {
      if (node.children) node.children = transform(node.children);
      if (
        node.type !== "mdxJsxFlowElement" &&
        node.type !== "mdxJsxTextElement"
      ) {
        return node;
      }

      const name = node.name ?? "";
      if (HTML_TAG.test(name)) {
        const properties: Record<string, unknown> = {};
        for (const attribute of node.attributes ?? []) {
          if (attribute.type !== "mdxJsxAttribute" || !attribute.name) continue;
          if (attribute.value === null || attribute.value === undefined) {
            properties[attribute.name] = true;
          } else if (typeof attribute.value === "string") {
            properties[attribute.name] = attribute.value;
          }
        }
        node.data = { ...node.data, hName: name, hProperties: properties };
      } else {
        node.data = {
          ...node.data,
          hName: node.type === "mdxJsxFlowElement" ? "div" : "span",
          hProperties: name ? { "data-mdx-component": name } : {}
        };
      }
      return node;
    });
}

/**
 * Prepare an MDX tree for HTML output.
 * Imports, exports, and `{expressions}` are removed. A lowercase JSX element becomes that HTML element
 * with its string attributes. A component such as `<story.WithControl />` becomes a `div` or `span`
 * placeholder with a `data-mdx-component` attribute, and keeps its children.
 */
export const remarkMdxHtml: Plugin<[], Root> = () => tree => {
  const root = tree as unknown as MdxNode;
  root.children = transform(root.children ?? []);
};
