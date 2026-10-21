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
  DocumentationDocumentType,
  DocumentationPageKind,
  GuidePerspective,
  MarkdownRequirement
} from "@sourcebook/config";
import {
  documentationDocumentTypes,
  documentationPageKinds,
  documentationPageRequirements,
  guidePerspectives,
  isDocumentationPageKind
} from "@sourcebook/config";

import type { InvalidDocumentationField, StructuredData } from "./types.js";

const STATUS_PREFIX =
  /^(?:proposed|accepted|rejected|deprecated|superseded)\b/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AuthoredString {
  state: "absent" | "invalid" | "ok";
  value?: string;
}

export interface ResolvedPageFields {
  title: string;
  description: string;
  tags: string[];
  summary?: string;
  documentType?: DocumentationDocumentType;
  audience?: string;
  perspective?: GuidePerspective;
  status?: string;
  date?: string;
  missingFields: string[];
  invalidFields: InvalidDocumentationField[];
  derivedFields: string[];
}

function normalizeHeading(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/:$/, "");
}

function metadataValue(body: string, label: string): string | undefined {
  const match = new RegExp(
    `^[ \\t]*[-*][ \\t]+${label}:[ \\t]*(.+)$`,
    "im"
  ).exec(body);
  const raw = match?.[1];
  if (!raw) return undefined;
  const value = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r/g, "")
    .trim();

  return value || undefined;
}

function readAuthoredString(value: unknown): AuthoredString {
  if (value === undefined || value === null) return { state: "absent" };
  if (typeof value !== "string" || !value.trim()) return { state: "invalid" };
  return { state: "ok", value: value.trim() };
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): { state: "absent" | "invalid" | "ok"; value?: T } {
  if (value === undefined || value === null) return { state: "absent" };
  if (typeof value !== "string") return { state: "invalid" };
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  const match = allowed.find(item => item === normalized);

  return match ? { state: "ok", value: match } : { state: "invalid" };
}

function readTags(value: unknown): { tags: string[]; invalid: boolean } {
  if (value === undefined || value === null || value === "") {
    return { tags: [], invalid: false };
  }
  if (typeof value === "string") {
    return {
      tags: value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean),
      invalid: false
    };
  }
  if (Array.isArray(value) && value.every(item => typeof item === "string")) {
    return {
      tags: value.flatMap(item =>
        item
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean)
      ),
      invalid: false
    };
  }
  return { tags: [], invalid: true };
}

function hasHeading(
  headings: readonly string[],
  field: MarkdownRequirement
): boolean {
  const names = [field.name, ...(field.aliases ?? [])].map(normalizeHeading);

  return headings.some(heading => {
    const key = normalizeHeading(heading);

    return names.some(
      name =>
        key === name || key.startsWith(`${name} `) || key.startsWith(`${name}:`)
    );
  });
}

function inferKindFromPath(
  path: string | undefined
): DocumentationPageKind | undefined {
  if (!path) return undefined;
  const normalized = path.replaceAll("\\", "/");
  const file = normalized.split("/").pop() ?? "";
  if (/^readme\.mdx?$/i.test(file)) return "readme";

  const segments = new Set(
    normalized
      .toLowerCase()
      .split("/")
      .filter(segment => segment.length > 0)
  );
  if (segments.has("adr")) return "adr";
  if (segments.has("blog")) return "blog";
  if (segments.has("guide") || segments.has("guides")) return "guide";
  return undefined;
}

function invalidKind(value: unknown): InvalidDocumentationField {
  return {
    name: "kind",
    message: `kind must be one of ${documentationPageKinds.join(", ")}, received ${JSON.stringify(value)}`
  };
}

/**
 * Choose the page kind from the explicit option, front matter, and path.
 */
export function resolveDocumentationKind(
  optionsKind: DocumentationPageKind | undefined,
  frontmatter: Record<string, unknown>,
  path: string | undefined
): { kind: DocumentationPageKind; invalid?: InvalidDocumentationField } {
  const declared = frontmatter.kind;
  const declaredInvalid =
    declared !== undefined && !isDocumentationPageKind(declared)
      ? invalidKind(declared)
      : undefined;

  if (optionsKind !== undefined) {
    if (!isDocumentationPageKind(optionsKind)) {
      return {
        kind: isDocumentationPageKind(declared)
          ? declared
          : (inferKindFromPath(path) ?? "docs"),
        invalid: invalidKind(optionsKind)
      };
    }
    return declaredInvalid
      ? { kind: optionsKind, invalid: declaredInvalid }
      : { kind: optionsKind };
  }

  if (declaredInvalid) {
    return {
      kind: inferKindFromPath(path) ?? "docs",
      invalid: declaredInvalid
    };
  }
  if (isDocumentationPageKind(declared)) return { kind: declared };
  return { kind: inferKindFromPath(path) ?? "docs" };
}

function requirementMessage(
  field: MarkdownRequirement,
  message: string
): string {
  const allowed = field.allowed?.length
    ? ` Allowed values: ${field.allowed.join(", ")}.`
    : "";

  return `${message}${allowed}`;
}

/**
 * Resolve the fields required for a page kind.
 * Missing and invalid fields are reported together so a strict compile can fail once.
 */
export function resolveDocumentationFields(input: {
  kind: DocumentationPageKind;
  frontmatter: Record<string, unknown>;
  body: string;
  titleFromHeading?: string;
  descriptionFromParagraph?: string;
  headings: readonly { id: string; text: string }[];
  structuredData: StructuredData;
  kindInvalid?: InvalidDocumentationField;
}): ResolvedPageFields {
  const missingFields: string[] = [];
  const invalidFields: InvalidDocumentationField[] = [];
  const derivedFields: string[] = [];
  if (input.kindInvalid) invalidFields.push(input.kindInvalid);

  const titleAuthored = readAuthoredString(input.frontmatter.title);
  const descriptionAuthored = readAuthoredString(input.frontmatter.description);
  const summaryAuthored = readAuthoredString(input.frontmatter.summary);
  const audienceAuthored = readAuthoredString(input.frontmatter.audience);
  const documentTypeAuthored = readEnum(
    input.frontmatter.documentType,
    documentationDocumentTypes
  );
  const perspectiveAuthored = readEnum(
    input.frontmatter.perspective,
    guidePerspectives
  );
  const status =
    input.kind === "adr" ? metadataValue(input.body, "Status") : undefined;
  const date =
    input.kind === "adr" ? metadataValue(input.body, "Date") : undefined;
  const tagSource =
    input.frontmatter.tags ??
    (input.kind === "adr" ? metadataValue(input.body, "Tags") : undefined);
  const tags = readTags(tagSource);
  if (tags.invalid) {
    invalidFields.push({
      name: "tags",
      message: "tags must be a string or a list of strings"
    });
  }

  let title = "";
  let description = "";
  let summary: string | undefined;
  let audience: string | undefined;
  let documentType: DocumentationDocumentType | undefined;
  let perspective: GuidePerspective | undefined;
  let statusValue: string | undefined;
  let dateValue: string | undefined;

  const acceptString = (
    field: MarkdownRequirement,
    authored: AuthoredString,
    derived: string | undefined
  ): string => {
    if (authored.state === "invalid") {
      invalidFields.push({
        name: field.name,
        message: `${field.name} must be a non-empty string`
      });
      return "";
    }
    if (authored.state === "ok" && authored.value) return authored.value;
    if (field.deriveFromBody && derived) {
      if (field.warnWhenDerived) derivedFields.push(field.name);
      return derived;
    }
    missingFields.push(field.name);
    return "";
  };

  for (const field of documentationPageRequirements[input.kind]) {
    if (field.heading) {
      if (
        !hasHeading(
          input.headings.map(heading => heading.text),
          field
        )
      ) {
        missingFields.push(field.name);
      }
      continue;
    }

    switch (field.name) {
      case "title":
        title = acceptString(field, titleAuthored, input.titleFromHeading);
        break;
      case "description":
        description = acceptString(
          field,
          descriptionAuthored,
          input.descriptionFromParagraph
        );
        break;
      case "summary":
        if (summaryAuthored.state === "invalid") {
          invalidFields.push({
            name: field.name,
            message: "summary must be a non-empty string"
          });
        } else if (summaryAuthored.state === "ok") {
          summary = summaryAuthored.value;
        } else {
          missingFields.push(field.name);
        }
        break;
      case "audience":
        if (audienceAuthored.state === "invalid") {
          invalidFields.push({
            name: field.name,
            message: "audience must be a non-empty string"
          });
        } else if (audienceAuthored.state === "ok") {
          audience = audienceAuthored.value;
        } else {
          missingFields.push(field.name);
        }
        break;
      case "documentType":
        if (documentTypeAuthored.state === "invalid") {
          invalidFields.push({
            name: field.name,
            message: requirementMessage(
              field,
              "documentType must be a Diataxis kind."
            )
          });
        } else if (documentTypeAuthored.state === "ok") {
          documentType = documentTypeAuthored.value;
        } else {
          missingFields.push(field.name);
        }
        break;
      case "perspective":
        if (perspectiveAuthored.state === "invalid") {
          invalidFields.push({
            name: field.name,
            message: requirementMessage(
              field,
              "perspective must name how the guide is written."
            )
          });
        } else if (perspectiveAuthored.state === "ok") {
          perspective = perspectiveAuthored.value;
        } else {
          missingFields.push(field.name);
        }
        break;
      case "status":
        if (!status) missingFields.push(field.name);
        else if (!STATUS_PREFIX.test(status)) {
          invalidFields.push({
            name: field.name,
            message: requirementMessage(
              field,
              "status must start with a known ADR status."
            )
          });
        } else statusValue = status;
        break;
      case "date":
        if (!date) missingFields.push(field.name);
        else if (!DATE.test(date)) {
          invalidFields.push({
            name: field.name,
            message: "date must be YYYY-MM-DD"
          });
        } else dateValue = date;
        break;
      default:
        missingFields.push(field.name);
    }
  }

  if (input.kind !== "docs" && documentTypeAuthored.state === "ok") {
    documentType = documentTypeAuthored.value;
  } else if (
    input.kind !== "docs" &&
    documentTypeAuthored.state === "invalid"
  ) {
    invalidFields.push({
      name: "documentType",
      message: `documentType must be one of ${documentationDocumentTypes.join(", ")}`
    });
  }

  if (input.kind !== "guide" && perspectiveAuthored.state === "ok") {
    perspective = perspectiveAuthored.value;
  } else if (
    input.kind !== "guide" &&
    perspectiveAuthored.state === "invalid"
  ) {
    invalidFields.push({
      name: "perspective",
      message: `perspective must be one of ${guidePerspectives.join(", ")}`
    });
  }

  if (input.kind !== "guide" && audienceAuthored.state === "ok") {
    audience = audienceAuthored.value;
  }
  if (input.kind !== "blog" && summaryAuthored.state === "ok") {
    summary = summaryAuthored.value;
  }

  if (input.kind === "adr") {
    const context = input.headings.find(heading => {
      const key = normalizeHeading(heading.text);

      return (
        key === "context and problem statement" ||
        key.startsWith("context and problem statement ")
      );
    });
    const contextText = context
      ? input.structuredData.contents.find(
          content => content.heading === context.id
        )?.content
      : undefined;
    description =
      descriptionAuthored.state === "ok" && descriptionAuthored.value
        ? descriptionAuthored.value
        : (contextText ?? input.descriptionFromParagraph ?? title);
  }

  return {
    title,
    description,
    tags: tags.tags,
    ...(summary ? { summary } : {}),
    ...(documentType ? { documentType } : {}),
    ...(audience ? { audience } : {}),
    ...(perspective ? { perspective } : {}),
    ...(statusValue ? { status: statusValue } : {}),
    ...(dateValue ? { date: dateValue } : {}),
    missingFields,
    invalidFields,
    derivedFields
  };
}

/**
 * Explain a missing field using the shared requirement text.
 */
export function describeMissingField(
  kind: DocumentationPageKind,
  name: string
): string {
  const field = documentationPageRequirements[kind].find(
    item => item.name === name
  );
  if (!field) return "This field is required.";
  const allowed = field.allowed?.length
    ? ` Allowed values: ${field.allowed.join(", ")}.`
    : "";
  const aliases = field.aliases?.length
    ? ` Accepted names: ${field.aliases.join(", ")}.`
    : "";

  return `${field.description}${allowed}${aliases}`;
}
