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

import { z } from "zod";

const FrontmatterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string())
]);

export const SourceFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  hash: z.string().min(1)
});

export const SourceSnapshotSchema = z.object({
  id: z.string().min(1),
  root: z.string().min(1),
  revision: z.string().min(1).optional(),
  files: z.array(SourceFileSchema)
});

export const PromptSchema = z.object({
  name: z.string().min(1),
  content: z.string()
});

export const SourceCitationSchema = z
  .object({
    path: z.string().min(1),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    label: z.string().min(1).optional()
  })
  .refine(
    citation =>
      citation.startLine === undefined ||
      citation.endLine === undefined ||
      citation.endLine >= citation.startLine,
    "Citation endLine must be greater than or equal to startLine"
  );

const BlockBaseSchema = z.object({
  citations: z.array(SourceCitationSchema).default([])
});

export const DocumentBlockSchema = z.discriminatedUnion("type", [
  BlockBaseSchema.extend({
    type: z.literal("prose"),
    text: z.string()
  }),
  BlockBaseSchema.extend({
    type: z.literal("code"),
    code: z.string(),
    language: z.string().optional(),
    title: z.string().optional()
  }),
  BlockBaseSchema.extend({
    type: z.literal("links"),
    links: z.array(
      z.object({
        label: z.string().min(1),
        url: z.string().min(1)
      })
    )
  })
]);

export interface DocumentSection {
  id: string;
  heading: string;
  blocks: z.infer<typeof DocumentBlockSchema>[];
  sections: DocumentSection[];
}

export const DocumentSectionSchema: z.ZodType<DocumentSection> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    heading: z.string().min(1),
    blocks: z.array(DocumentBlockSchema).default([]),
    sections: z.array(DocumentSectionSchema).default([])
  })
);

export const DocumentPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  frontmatter: z.record(z.string(), FrontmatterValueSchema).default({}),
  sections: z.array(DocumentSectionSchema)
});

export const OutputArtifactSchema = z.object({
  path: z.string().min(1),
  mediaType: z.string().min(1),
  content: z.string(),
  metadata: z.record(z.string(), z.string()).default({})
});

export const DiagnosticSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  code: z.string().min(1),
  message: z.string().min(1),
  stageId: z.string().min(1).optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const DocumentJobSchema = z.object({
  id: z.string().min(1),
  repository: z.object({
    root: z.string().min(1),
    revision: z.string().min(1).optional()
  }),
  sources: SourceSnapshotSchema,
  prompts: z.array(PromptSchema).default([]),
  documents: z.array(DocumentPageSchema).default([]),
  artifacts: z.array(OutputArtifactSchema).default([]),
  diagnostics: z.array(DiagnosticSchema).default([]),
  metadata: z.record(z.string(), z.string()).default({})
});

export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;
export type DocumentJob = z.infer<typeof DocumentJobSchema>;
export type DocumentPage = z.infer<typeof DocumentPageSchema>;
export type OutputArtifact = z.infer<typeof OutputArtifactSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type SourceCitation = z.infer<typeof SourceCitationSchema>;
export type SourceFile = z.infer<typeof SourceFileSchema>;
export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

export function createDocumentJob(input: z.input<typeof DocumentJobSchema>) {
  return DocumentJobSchema.parse(input);
}

export function createSourceSnapshot(
  input: z.input<typeof SourceSnapshotSchema>
): SourceSnapshot {
  return SourceSnapshotSchema.parse(input);
}
