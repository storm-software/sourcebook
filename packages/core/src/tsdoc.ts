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

import calloutConfig from "@sourcebook/tsdoc/callouts.json" with { type: "json" };

/** One Markdown block from a documentation tag, without its leading `@`. */
export interface TSDocBlock {
  name: string;
  text: string;
}

/** A callout whose type is declared in `@sourcebook/tsdoc/callouts.json`. */
export interface TSDocCallout {
  type: string;
  text: string;
}

/** Markdown summary and block tags read from one documentation comment. */
export interface TSDocComment {
  summary: string;
  /** All block tags in source order, including unrecognized tags. */
  tags: TSDocBlock[];
  callouts: TSDocCallout[];
  /** Each nonempty `@credit` or `@acknowledgements` block, in source order. */
  acknowledgements: string[];
}

const calloutTags = new Set(
  calloutConfig.tagDefinitions.map(tag => tag.tagName.slice(1))
);
const TAG = /^@([a-z][a-z0-9]*)(?:[ \t](.*))?$/i;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Split a TSDoc comment into Markdown and line-start block tags.
 *
 * Fenced code is preserved verbatim. Repeated and unknown tags remain in
 * `tags`; supported custom blocks also populate `callouts` and
 * `acknowledgements`. This reader does not resolve inline TSDoc links,
 * declaration references, or `@inheritDoc`.
 *
 * @param comment - A complete documentation comment, or its stripped body.
 * @returns The summary, block tags, and custom features. Empty input returns empty collections.
 */
export function parseTSDocComment(comment: string): TSDocComment {
  const source = comment.trim();
  const wrapped = source.startsWith("/**");
  const body = wrapped ? source.slice(3).replace(/\*\/$/, "") : source;
  const lines = body
    .split(/\r?\n/)
    .map((line, index) =>
      wrapped
        ? index === 0
          ? line.trimStart()
          : line.replace(/^\s*\* ?/, "")
        : line
    );
  const summary: string[] = [];
  const tags: { name: string; lines: string[] }[] = [];
  let fence: { marker: string; length: number } | undefined;

  for (const line of lines) {
    const marker = FENCE.exec(line);
    const tag = fence ? null : TAG.exec(line);
    if (marker?.[1]) {
      if (!fence) {
        fence = { marker: marker[1].charAt(0), length: marker[1].length };
      } else if (
        marker[1].charAt(0) === fence.marker &&
        marker[1].length >= fence.length &&
        !line.slice(marker[0].length).trim()
      ) {
        fence = undefined;
      }
    }
    if (tag?.[1]) {
      tags.push({ name: tag[1], lines: tag[2] ? [tag[2]] : [] });
    } else {
      (tags.at(-1)?.lines ?? summary).push(line);
    }
  }

  const blocks = tags.map(tag => ({
    name: tag.name,
    text: tag.lines.join("\n").trim()
  }));

  return {
    summary: summary.join("\n").trim(),
    tags: blocks,
    callouts: blocks
      .filter(tag => calloutTags.has(tag.name) && tag.text)
      .map(tag => ({ type: tag.name, text: tag.text })),
    acknowledgements: blocks
      .filter(
        tag =>
          (tag.name === "credit" || tag.name === "acknowledgements") && tag.text
      )
      .map(tag => tag.text)
  };
}

/**
 * Render custom TSDoc features as Markdown understood by Sourcebook.
 *
 * Each callout is a GitHub alert blockquote; credits follow under an
 * Acknowledgements heading. Blockquoting every line preserves paragraphs,
 * lists, and fenced code without delimiter collisions.
 *
 * @param features - Parsed callouts and acknowledgements.
 * @returns Markdown for the custom blocks, or an empty string when none exist.
 */
export function renderTSDocFeatures(
  features: Pick<TSDocComment, "callouts" | "acknowledgements">
): string {
  const blocks = features.callouts.map(
    callout =>
      `> [!${callout.type.toUpperCase()}]\n${callout.text
        .split("\n")
        .map(line => `> ${line}`)
        .join("\n")}`
  );
  if (features.acknowledgements.length) {
    blocks.push("## Acknowledgements", features.acknowledgements.join("\n\n"));
  }
  return blocks.join("\n\n");
}
