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

import { parse } from "yaml";
import { DocumentationPageError } from "./errors.js";

const EMPTY_FRONTMATTER = /^---[ \t]*\r?\n---[ \t]*(?:\r?\n|$)/;
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Split YAML front matter from a Markdown document.
 * A leading thematic break is left in the body.
 *
 * @param source - Markdown source, optionally starting with front matter.
 * @param path - Path included in parse errors.
 * @returns The body and the front matter mapping. The mapping is empty when the document has no front matter.
 */
export function splitFrontmatter(
  source: string,
  path?: string
): { body: string; frontmatter: Record<string, unknown> } {
  const text = source.replace(/^\uFEFF/, "");
  const empty = EMPTY_FRONTMATTER.exec(text);
  if (empty) {
    return { body: text.slice(empty[0].length), frontmatter: {} };
  }

  const match = FRONTMATTER.exec(text);
  if (!match) return { body: text, frontmatter: {} };

  const raw = match[1] ?? "";
  let parsed: unknown;
  try {
    parsed = raw.trim() ? parse(raw) : {};
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const where = path ? ` in ${path}` : "";
    throw new DocumentationPageError(
      `Invalid YAML front matter${where}: ${detail}`,
      { path }
    );
  }

  const body = text.slice(match[0].length);
  if (parsed === null || parsed === undefined) return { body, frontmatter: {} };
  if (!isRecord(parsed)) {
    const where = path ? ` in ${path}` : "";
    throw new DocumentationPageError(
      `Front matter must be a YAML mapping${where}.`,
      { path }
    );
  }

  return { body, frontmatter: parsed };
}
