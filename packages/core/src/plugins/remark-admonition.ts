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

import type {
  Blockquote,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent
} from "mdast";
import { toString } from "mdast-util-to-string";
import type { Plugin } from "unified";

const ALIASES: Record<string, string> = {
  note: "info",
  info: "info",
  important: "info",
  tip: "discovery",
  discovery: "discovery",
  help: "discovery",
  warning: "warning",
  warn: "warning",
  caution: "warning",
  danger: "danger",
  error: "danger"
};

const LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution"
};

const ALERT =
  /^\[!(note|tip|important|warning|caution|info|warn|danger|error)\]\s*/i;
// eslint-disable-next-line regexp/no-super-linear-backtracking
const OPENING = /^:::([A-Z][\w-]*)(?:\[([^\]]*)\])?(?:[ \t]+(.+))?$/i;
const CLOSING = /^:::\s*$/;

function normalizeType(value: string): { type: string; label: string } {
  const type = ALIASES[value.toLowerCase()] ?? value.toLowerCase();
  const known = LABELS[type];
  const label = known ?? `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;

  return { type, label };
}

function dropPrefix(
  nodes: PhrasingContent[],
  count: number
): PhrasingContent[] {
  const kept: PhrasingContent[] = [];
  let remaining = count;

  for (const node of nodes) {
    if (remaining <= 0) {
      kept.push(node);
      continue;
    }

    if (node.type === "text") {
      if (node.value.length <= remaining) {
        remaining -= node.value.length;
        continue;
      }
      kept.push({ type: "text", value: node.value.slice(remaining) });
      remaining = 0;
      continue;
    }

    if (node.type === "break") {
      remaining -= 1;
      continue;
    }

    if ("children" in node && Array.isArray(node.children)) {
      const children = dropPrefix(node.children, remaining);
      const consumed = textSize(node.children) - textSize(children);
      remaining -= consumed;
      if (children.length) {
        kept.push({ ...node, children });
      }
      continue;
    }

    kept.push(node);
    remaining = 0;
  }

  return kept;
}

function textSize(nodes: readonly PhrasingContent[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === "text") return total + node.value.length;
    if (node.type === "break") return total + 1;
    if ("children" in node && Array.isArray(node.children)) {
      return total + textSize(node.children);
    }
    return total;
  }, 0);
}

function createAdmonition(
  typeName: string,
  title: string | undefined,
  children: Blockquote["children"]
): Blockquote {
  const normalized = normalizeType(typeName);
  const label = title?.trim() || normalized.label;

  return {
    type: "blockquote",
    data: {
      hName: "aside",
      hProperties: {
        className: ["admonition", `admonition-${normalized.type}`],
        "data-type": normalized.type
      }
    },
    children: [
      {
        type: "paragraph",
        data: { hProperties: { className: ["admonition-title"] } },
        children: [{ type: "text", value: label }]
      },
      ...children
    ]
  };
}

function parseAlert(node: Blockquote): Blockquote | undefined {
  const first = node.children[0];
  if (first?.type !== "paragraph") return undefined;

  const match = ALERT.exec(toString(first));
  const typeName = match?.[1];
  if (!match || !typeName) return undefined;

  const kept = dropPrefix(first.children, match[0].length);
  const rest = kept.length
    ? [{ ...first, children: kept }, ...node.children.slice(1)]
    : node.children.slice(1);

  return createAdmonition(
    typeName,
    undefined,
    transformChildren(rest) as Blockquote["children"]
  );
}

const WRAPPED =
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  /^(:::[A-Z][\w-]*(?:\[[^\]]*\])?(?:[ \t][^\n]+)?\s*\n)([\s\S]*?)\n?:::\s*$/i;

function dropSuffix(
  nodes: PhrasingContent[],
  count: number
): PhrasingContent[] {
  let remaining = count;
  const kept: PhrasingContent[] = [];

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (!node) continue;
    if (remaining <= 0) {
      kept.push(node);
      continue;
    }

    if (node.type === "text") {
      if (node.value.length <= remaining) {
        remaining -= node.value.length;
        continue;
      }
      kept.push({
        type: "text",
        value: node.value.slice(0, node.value.length - remaining)
      });
      remaining = 0;
      continue;
    }

    if (node.type === "break") {
      remaining -= 1;
      continue;
    }

    if ("children" in node && Array.isArray(node.children)) {
      const children = dropSuffix(node.children, remaining);
      remaining -= textSize(node.children) - textSize(children);
      if (children.length) kept.push({ ...node, children });
      continue;
    }

    kept.push(node);
    remaining = 0;
  }

  return kept.reverse();
}

function parseOpening(
  text: string
): { type: string; title?: string } | undefined {
  const match = OPENING.exec(text);
  const typeName = match?.[1];
  if (!typeName) return undefined;
  const title = match[2] ?? match[3];

  return title ? { type: typeName, title } : { type: typeName };
}

function isClosing(node: RootContent): node is Paragraph {
  return node.type === "paragraph" && CLOSING.test(toString(node).trim());
}

function transformChildren(nodes: RootContent[]): RootContent[] {
  const result: RootContent[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) continue;

    if (node.type === "paragraph") {
      const text = toString(node);
      const wrapped = WRAPPED.exec(text);
      const wrappedOpening = wrapped
        ? parseOpening((wrapped[1] ?? "").trim())
        : undefined;
      if (wrapped && wrappedOpening) {
        const opened = dropPrefix(node.children, wrapped[1]?.length ?? 0);
        const suffixLength =
          text.length - (wrapped[1]?.length ?? 0) - (wrapped[2]?.length ?? 0);
        const body = dropSuffix(opened, suffixLength);
        result.push(
          createAdmonition(
            wrappedOpening.type,
            wrappedOpening.title,
            body.length ? [{ type: "paragraph", children: body }] : []
          )
        );
        continue;
      }

      const opening = parseOpening(text.trim());
      if (opening) {
        const closeAt = nodes.findIndex(
          (candidate, candidateIndex) =>
            candidateIndex > index &&
            candidate !== undefined &&
            isClosing(candidate)
        );
        if (closeAt !== -1) {
          result.push(
            createAdmonition(
              opening.type,
              opening.title,
              transformChildren(
                nodes.slice(index + 1, closeAt)
              ) as Blockquote["children"]
            )
          );
          index = closeAt;
          continue;
        }
      }
    }

    if (node.type === "blockquote") {
      const alert = parseAlert(node);
      if (alert) {
        result.push(alert);
        continue;
      }
    }

    if ("children" in node && Array.isArray(node.children)) {
      const children = transformChildren(node.children);
      result.push({ ...node, children } as RootContent);
      continue;
    }

    result.push(node);
  }

  return result;
}

/**
 * Turn GitHub alerts and `:::type` blocks into `aside` elements.
 */
export const remarkAdmonition: Plugin<[], Root> = () => tree => {
  tree.children = transformChildren(tree.children);
};
