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
  DocumentBlock,
  DocumentPage,
  DocumentSection,
  OutputArtifact
} from "./model";
import type { PipelineStage } from "./pipeline";

export interface MetadataSerializer {
  id: string;
  version: string;
  serialize: (page: DocumentPage) => string;
}

export interface NavigationSerializer {
  id: string;
  version: string;
  serialize: (pages: readonly DocumentPage[]) => readonly OutputArtifact[];
}

export interface MarkdownRendererOptions {
  id?: string;
  version?: string;
  outputDirectory?: string;
  extension?: ".md" | ".mdx";
  metadataSerializer?: MetadataSerializer;
  navigationSerializer?: NavigationSerializer;
}

function serializeScalar(value: boolean | number | string) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

export const canonicalMetadataSerializer: MetadataSerializer = {
  id: "canonical-yaml-frontmatter",
  version: "1",
  serialize(page) {
    const values = {
      title: page.title,
      ...(page.description ? { description: page.description } : {}),
      ...page.frontmatter
    };
    const lines = Object.entries(values).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(serializeScalar).join(", ")}]`;
      }
      return `${key}: ${serializeScalar(value)}`;
    });

    return `---\n${lines.join("\n")}\n---`;
  }
};

function renderCitation(citation: DocumentBlock["citations"][number]): string {
  const lines =
    citation.startLine === undefined
      ? ""
      : citation.endLine === undefined ||
          citation.endLine === citation.startLine
        ? `#L${citation.startLine}`
        : `#L${citation.startLine}-L${citation.endLine}`;

  return `- ${citation.label ?? citation.path}: \`${citation.path}${lines}\``;
}

function renderBlock(block: DocumentBlock) {
  let content: string;
  switch (block.type) {
    case "prose":
      content = block.text;
      break;
    case "code":
      content = `${block.title ? `**${block.title}**\n\n` : ""}\`\`\`${block.language ?? ""}\n${block.code}\n\`\`\``;
      break;
    case "links":
      content = block.links
        .map(link => `- [${link.label}](${link.url})`)
        .join("\n");
      break;
  }

  if (block.citations.length > 0) {
    content += `\n\n${block.citations.map(renderCitation).join("\n")}`;
  }
  return content;
}

function renderSection(section: DocumentSection, depth: number): string {
  const heading = `${"#".repeat(Math.min(depth, 6))} ${section.heading}`;

  return [
    heading,
    ...section.blocks.map(renderBlock),
    ...section.sections.map(child => renderSection(child, depth + 1))
  ]
    .filter(Boolean)
    .join("\n\n");
}

function outputPath(
  directory: string,
  slug: string,
  extension: ".md" | ".mdx"
) {
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, "");
  if (!normalizedSlug || normalizedSlug.split("/").includes("..")) {
    throw new TypeError(`Invalid document slug: ${slug}`);
  }
  const normalizedDirectory = directory.replace(/^\/+|\/+$/g, "");

  return [normalizedDirectory, `${normalizedSlug}${extension}`]
    .filter(Boolean)
    .join("/");
}

export function renderMarkdownPage(
  page: DocumentPage,
  metadataSerializer: MetadataSerializer = canonicalMetadataSerializer
) {
  return [
    metadataSerializer.serialize(page),
    ...page.sections.map(section => renderSection(section, 2))
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}

export function createMarkdownRendererStage(
  options: MarkdownRendererOptions = {}
): PipelineStage {
  const metadataSerializer =
    options.metadataSerializer ?? canonicalMetadataSerializer;
  const extension = options.extension ?? ".md";
  const outputDirectory = options.outputDirectory ?? "";

  return {
    id: options.id ?? "markdown-renderer",
    kind: "output",
    version: options.version ?? "1",
    idempotent: true,
    config: {
      extension,
      outputDirectory,
      metadataSerializer: {
        id: metadataSerializer.id,
        version: metadataSerializer.version
      },
      navigationSerializer: options.navigationSerializer
        ? {
            id: options.navigationSerializer.id,
            version: options.navigationSerializer.version
          }
        : null
    },
    execute: ({ job, signal }) => {
      signal.throwIfAborted();
      const artifacts: OutputArtifact[] = job.documents.map(page => ({
        path: outputPath(outputDirectory, page.slug, extension),
        mediaType: "text/markdown",
        content: renderMarkdownPage(page, metadataSerializer),
        metadata: { documentSlug: page.slug }
      }));
      if (options.navigationSerializer) {
        artifacts.push(
          ...options.navigationSerializer.serialize(job.documents)
        );
      }
      return { artifacts };
    }
  };
}
