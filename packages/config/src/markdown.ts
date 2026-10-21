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

/**
 * Diataxis kinds accepted on a documentation page.
 */
export const documentationDocumentTypes = [
  "getting-started",
  "tutorial",
  "concept",
  "recipe",
  "reference"
] as const;

/**
 * A documentation page's Diataxis kind.
 */
export type DocumentationDocumentType =
  (typeof documentationDocumentTypes)[number];

/**
 * Perspectives accepted on a guide page.
 */
export const guidePerspectives = ["under-the-hood", "hands-on"] as const;

/**
 * Who a guide is written for: contributors reading the code, or people using it.
 */
export type GuidePerspective = (typeof guidePerspectives)[number];

/**
 * Page kinds `@sourcebook/core` can compile.
 */
export const documentationPageKinds = [
  "docs",
  "blog",
  "guide",
  "adr",
  "readme"
] as const;

/**
 * A Markdown document `@sourcebook/core` can compile into a page.
 */
export type DocumentationPageKind = (typeof documentationPageKinds)[number];

/**
 * One field a generated Markdown page must include for a page kind.
 */
export interface MarkdownRequirement {
  /**
   * Field name reported when the field is missing.
   */
  name: string;

  /**
   * What the author should write.
   */
  description: string;

  /**
   * The compiler may fill this from the Markdown body when front matter omits it.
   */
  deriveFromBody?: boolean;

  /**
   * Record the field on `derivedFields` when the body fallback is used.
   * Generated docs, blog, and guide pages should set the field explicitly instead.
   */
  warnWhenDerived?: boolean;

  /**
   * Heading titles that satisfy a body section.
   */
  aliases?: readonly string[];

  /**
   * Accepted values after the compiler trims and normalizes case and spaces.
   */
  allowed?: readonly string[];

  /**
   * The field is a Markdown heading rather than a front matter value.
   */
  heading?: boolean;
}

const title = (
  description: string,
  warnWhenDerived = false
): MarkdownRequirement => ({
  name: "title",
  description,
  deriveFromBody: true,
  ...(warnWhenDerived ? { warnWhenDerived: true } : {})
});

const description = (
  text: string,
  warnWhenDerived = false
): MarkdownRequirement => ({
  name: "description",
  description: text,
  deriveFromBody: true,
  ...(warnWhenDerived ? { warnWhenDerived: true } : {})
});

/**
 * Fields `@sourcebook/core` requires before it compiles a page of each kind.
 */
export const documentationPageRequirements: Record<
  DocumentationPageKind,
  readonly MarkdownRequirement[]
> = {
  docs: [
    title(
      "Page title in YAML front matter. The compiler otherwise uses the first level-1 heading.",
      true
    ),
    description(
      "One or two sentences in YAML front matter. The compiler otherwise uses the first paragraph.",
      true
    ),
    {
      name: "documentType",
      description:
        "Diataxis kind in YAML front matter. Map a getting-started overview to getting-started, a concept guide to concept, a core-feature page to recipe, and benchmarks to reference.",
      allowed: documentationDocumentTypes
    }
  ],
  blog: [
    title(
      "Article title in YAML front matter. The compiler otherwise uses the first level-1 heading.",
      true
    ),
    description(
      "One or two sentences in YAML front matter. The compiler otherwise uses the first paragraph.",
      true
    ),
    {
      name: "summary",
      description:
        "TLDR shown at the top of the article, in YAML front matter. Do not repeat the description verbatim unless the article is only one paragraph."
    }
  ],
  guide: [
    title(
      "Guide title in YAML front matter. The compiler otherwise uses the first level-1 heading.",
      true
    ),
    description(
      "One or two sentences in YAML front matter. The compiler otherwise uses the first paragraph.",
      true
    ),
    {
      name: "audience",
      description: "Who the walk-through is for, in YAML front matter."
    },
    {
      name: "perspective",
      description:
        "under-the-hood for a contributor reading the code, or hands-on for someone using it. Write it in YAML front matter.",
      allowed: guidePerspectives
    }
  ],
  adr: [
    title("The level-1 heading. Do not move it into YAML front matter."),
    {
      name: "status",
      description:
        "A `- Status:` metadata line. Use proposed, accepted, rejected, deprecated, or superseded by a link to the replacing ADR.",
      allowed: ["proposed", "accepted", "rejected", "deprecated", "superseded"]
    },
    {
      name: "date",
      description: "A `- Date:` metadata line in YYYY-MM-DD."
    },
    {
      name: "Context and Problem Statement",
      description:
        "A heading whose body states the situation and the problem in a few sentences.",
      heading: true
    },
    {
      name: "Considered Options",
      description:
        "A heading that lists the options that were actually considered.",
      heading: true
    },
    {
      name: "Decision Outcome",
      description: "A heading that names the chosen option and why.",
      heading: true
    }
  ],
  readme: [
    title("A level-1 heading. Do not add YAML front matter for it."),
    description(
      "An opening paragraph after the title. Do not add YAML front matter for it."
    ),
    {
      name: "Quick Features",
      description: "A heading that lists current capabilities.",
      heading: true,
      aliases: ["Features"]
    },
    {
      name: "Installation",
      description: "A heading for prerequisites and install or setup steps.",
      heading: true,
      aliases: ["Install", "Getting Started", "Setup"]
    },
    {
      name: "Usage",
      description: "A heading for the shortest path to a useful outcome.",
      heading: true,
      aliases: ["Examples"]
    },
    {
      name: "Development",
      description: "A heading for contributor setup, scripts, and tests.",
      heading: true,
      aliases: ["Contributing"]
    }
  ]
};

/**
 * Fields the compiler reads when present but does not require.
 */
export const documentationPageOptionalFields: Record<
  DocumentationPageKind,
  readonly MarkdownRequirement[]
> = {
  docs: [
    {
      name: "tags",
      description:
        "YAML list or comma-separated string. Omit it rather than inventing tags."
    },
    {
      name: "kind",
      description:
        "docs, blog, guide, adr, or readme when the file path does not already show the kind.",
      allowed: documentationPageKinds
    }
  ],
  blog: [
    {
      name: "tags",
      description:
        "YAML list or comma-separated string. Omit it rather than inventing tags."
    },
    {
      name: "kind",
      description:
        "docs, blog, guide, adr, or readme when the file path does not already show the kind.",
      allowed: documentationPageKinds
    }
  ],
  guide: [
    {
      name: "tags",
      description:
        "YAML list or comma-separated string. Omit it rather than inventing tags."
    },
    {
      name: "kind",
      description:
        "docs, blog, guide, adr, or readme when the file path does not already show the kind.",
      allowed: documentationPageKinds
    }
  ],
  adr: [
    {
      name: "tags",
      description:
        "Optional `- Tags:` metadata line. Omit it rather than inventing tags."
    }
  ],
  readme: [
    {
      name: "tags",
      description: "Do not add tags to a README."
    }
  ]
};

function describeField(field: MarkdownRequirement): string {
  const allowed = field.allowed?.length
    ? ` Allowed values: ${field.allowed.join(", ")}.`
    : "";
  const aliases = field.aliases?.length
    ? ` Accepted names: ${field.aliases.join(", ")}.`
    : "";
  const derived = field.warnWhenDerived
    ? " Generated pages must set this explicitly."
    : "";

  return `- ${field.name}: ${field.description}${allowed}${aliases}${derived}`;
}

function describeKind(kind: DocumentationPageKind): string {
  const required = documentationPageRequirements[kind].map(describeField);
  const optional = documentationPageOptionalFields[kind]
    .map(field => field.name)
    .join(", ");

  return [`${kind}`, ...required, `Optional: ${optional}.`].join("\n");
}

/**
 * Instructions for Markdown that `@sourcebook/core` compiles into a page.
 * Skills that generate Markdown follow the same fields.
 */
export const documentationMarkdownInstructions = [
  "Markdown compiled by @sourcebook/core must include the fields for its page kind.",
  "The compiler uses remark and rehype: GitHub Flavored Markdown, GitHub alerts such as `> [!NOTE]`, `:::type` admonitions, heading ids written as `[#id]`, and table-of-contents markers `[toc]` and `[!toc]`.",
  "Docs, blog, and guide pages put their fields in YAML front matter between --- lines at the top of the file.",
  "ADR and README pages keep their fields in the body so log4brains and GitHub can read them. Do not add YAML front matter to those files.",
  "Do not invent tags. Omit tags when the page has none. In front matter, tags may be a YAML list or a comma-separated string.",
  ...documentationPageKinds.map(describeKind)
].join("\n\n");

/**
 * @param value - Candidate page kind.
 * @returns Whether the value is a page kind the compiler accepts.
 */
export function isDocumentationPageKind(
  value: unknown
): value is DocumentationPageKind {
  return (
    typeof value === "string" &&
    (documentationPageKinds as readonly string[]).includes(value)
  );
}
