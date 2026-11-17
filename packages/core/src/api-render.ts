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
import type {
  Comment,
  CommentDisplayPart,
  DeclarationReflection,
  ProjectReflection,
  SignatureReflection,
  SomeType
} from "typedoc";
import { ReflectionKind, TypeContext } from "typedoc";
import { stringify } from "yaml";
import type {
  ApiReference,
  ApiReferenceDiagnostic,
  ApiReferencePage
} from "./api-types.js";
import { compileDocumentationPage } from "./compile.js";
import { DocumentationPageError } from "./errors.js";
import { parseTSDocComment, renderTSDocFeatures } from "./tsdoc.js";

const GENERATED = "Generated API reference by @sourcebook/core";

function code(text: string): string {
  const longest = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map(item => item.length)
  );
  const fence = "`".repeat(longest + 1);

  return `${fence} ${text.replace(/\s+/g, " ")} ${fence}`;
}

function fenced(text: string): string {
  const length = Math.max(
    3,
    ...(text.match(/`+/g) ?? []).map(item => item.length + 1)
  );
  const fence = "`".repeat(length);

  return `${fence}ts\n${text}\n${fence}`;
}

function label(text: string): string {
  return text.replace(/[\\`*_[\]<>]/g, "\\$&");
}

function concrete(reflection: DeclarationReflection): DeclarationReflection {
  if (reflection.isReference()) {
    const target = reflection.tryGetTargetReflectionDeep();
    if (target?.isDeclaration()) return target;
  }
  return reflection;
}

function members(reflection: DeclarationReflection): DeclarationReflection[] {
  return [
    ...(reflection.children ?? []),
    ...(reflection.type?.type === "reflection"
      ? (reflection.type.declaration.children ?? [])
      : [])
  ];
}

function signatures(reflection: DeclarationReflection): SignatureReflection[] {
  return [
    ...reflection.getAllSignatures(),
    ...(reflection.type?.type === "reflection"
      ? reflection.type.declaration.getAllSignatures()
      : [])
  ];
}

function typeName(
  type: SomeType | undefined,
  context: TypeContext = TypeContext.none
): string {
  if (!type) return "unknown";
  let text: string;
  if (type.type === "reflection") text = objectType(type.declaration);
  else if (type.type === "array")
    text = `${typeName(type.elementType, TypeContext.arrayElement)}[]`;
  else if (type.type === "union" || type.type === "intersection") {
    const childContext =
      type.type === "union"
        ? TypeContext.unionElement
        : TypeContext.intersectionElement;
    text = type.types
      .map(child => typeName(child, childContext))
      .join(type.type === "union" ? " | " : " & ");
  } else if (type.type === "reference" && type.typeArguments?.length) {
    text = `${type.name}<${type.typeArguments.map(child => typeName(child, TypeContext.referenceTypeArgument)).join(", ")}>`;
  } else text = type.toString();
  return type.needsParenthesis(context) ? `(${text})` : text;
}

function modifiers(reflection: DeclarationReflection): string {
  return `${reflection.flags.isProtected ? "protected " : ""}${reflection.flags.isStatic ? "static " : ""}${reflection.flags.isAbstract ? "abstract " : ""}${reflection.flags.isReadonly ? "readonly " : ""}`;
}

function objectType(reflection: DeclarationReflection): string {
  const properties = members(reflection).map(member => {
    if (member.kindOf(ReflectionKind.Method)) {
      return signatures(member)
        .map(signature =>
          signatureText(
            signature,
            `${member.name}${member.flags.isOptional ? "?" : ""}`
          )
        )
        .join("; ");
    }
    return `${member.flags.isReadonly ? "readonly " : ""}${member.name}${member.flags.isOptional ? "?" : ""}: ${typeName(member.type)}`;
  });
  const calls = signatures(reflection).map(signature =>
    signatureText(signature, "")
  );

  return `{ ${[...properties, ...calls].map(text => `${text};`).join(" ")} }`;
}

function signatureText(signature: SignatureReflection, name: string): string {
  if (name && signature.kindOf(ReflectionKind.ConstructorSignature)) {
    name = signature.parent.parent?.name ?? name;
  }
  const generics = signature.typeParameters?.map(
    param =>
      `${param.name}${param.type ? ` extends ${typeName(param.type)}` : ""}${param.default ? ` = ${typeName(param.default)}` : ""}`
  );
  const params =
    signature.parameters?.map(
      param =>
        `${param.flags.isRest ? "..." : ""}${param.name}${param.flags.isOptional ? "?" : ""}: ${typeName(param.type)}${param.defaultValue !== undefined ? ` = ${param.defaultValue}` : ""}`
    ) ?? [];
  const prefix = signature.kindOf(ReflectionKind.ConstructorSignature)
    ? "new "
    : signature.kindOf(ReflectionKind.GetSignature)
      ? "get "
      : signature.kindOf(ReflectionKind.SetSignature)
        ? "set "
        : "";
  const left = signature.kindOf(ReflectionKind.IndexSignature) ? "[" : "(";
  const right = signature.kindOf(ReflectionKind.IndexSignature) ? "]" : ")";

  return `${prefix}${name}${generics?.length ? `<${generics.join(", ")}>` : ""}${left}${params.join(", ")}${right}: ${typeName(signature.type)}`;
}

/** Render TypeDoc's resolved model into Sourcebook Markdown and compiled pages. */
export function renderApiReference(
  project: ProjectReflection,
  diagnostics: ApiReferenceDiagnostic[],
  title: string
): ApiReference {
  const roots: {
    name: string;
    reflection: DeclarationReflection;
    path: string;
  }[] = [];
  const files = new GithubSlugger();
  files.slug("index");
  function collect(nodes: readonly DeclarationReflection[], prefix = ""): void {
    for (const node of nodes) {
      const name = prefix ? `${prefix}.${node.name}` : node.name;
      if (node.kindOf(ReflectionKind.Module)) {
        collect(node.children ?? [], name);
      } else {
        roots.push({
          name,
          reflection: node,
          path: `${files.slug(name) || files.slug("declaration")}.md`
        });
      }
    }
  }
  collect(project.children ?? []);
  if (!roots.length)
    throw new DocumentationPageError(
      "Cannot generate an API reference: no public declarations."
    );
  const urls = new Map<number, string>();
  const anchors = new Map<string, Map<number, string>>();
  for (const root of roots) {
    const slugger = new GithubSlugger();
    slugger.slug(root.name);
    const ids = new Map<number, string>();
    anchors.set(root.path, ids);
    function register(
      node: DeclarationReflection,
      top = false,
      ancestors = new Set<number>()
    ): void {
      const ref = concrete(node);
      const anchor = top ? "" : slugger.slug(node.name);
      const url = `./${root.path}${anchor ? `#${anchor}` : ""}`;
      ids.set(node.id, anchor);
      if (!urls.has(ref.id)) urls.set(ref.id, url);
      urls.set(node.id, url);
      if (ancestors.has(ref.id)) return;
      const visited = new Set([...ancestors, ref.id]);
      for (const sig of signatures(ref)) {
        // Overload and parameter references land on the owning declaration.
        urls.set(sig.id, url);
        for (const param of [
          ...(sig.parameters ?? []),
          ...(sig.typeParameters ?? [])
        ])
          urls.set(param.id, url);
      }
      for (const param of ref.typeParameters ?? []) urls.set(param.id, url);
      for (const member of members(ref)) register(member, false, visited);
    }
    register(root.reflection, true);
  }

  function parts(content: readonly CommentDisplayPart[] = []): string {
    return content
      .map(part => {
        if (part.kind !== "inline-tag") return part.text;
        if (!["@link", "@linkcode", "@linkplain"].includes(part.tag)) {
          return part.tag === "@inheritDoc" ? "" : part.text;
        }
        const target = part.target;
        const url =
          typeof target === "string"
            ? target
            : target && "id" in target
              ? urls.get(target.id)
              : undefined;
        const text =
          part.text ||
          (typeof target === "object" && "name" in target
            ? String(target.name)
            : "reference");
        const displayed = part.tag === "@linkcode" ? code(text) : label(text);
        if (!url) {
          diagnostics.push({
            severity: "warning",
            message: `Cannot resolve documentation link: ${text}`
          });
          return displayed;
        }
        return `[${displayed}](<${url}>)`;
      })
      .join("");
  }

  function commentText(comment: Comment | undefined, depth: number): string[] {
    if (!comment) return [];
    const summary = parts(comment.summary);
    const tags = comment.blockTags.map(tag => ({
      name: tag.tag.slice(1),
      text: parts(tag.content)
    }));
    const custom = parseTSDocComment(
      tags.map(tag => `@${tag.name}\n${tag.text}`).join("\n\n")
    );
    const customNames = new Set([
      "credit",
      "acknowledgements",
      ...custom.callouts.map(item => item.type)
    ]);
    const result = summary ? [summary] : [];
    const heading = "#".repeat(Math.min(depth, 6));
    for (const tag of tags) {
      if (!tag.text || customNames.has(tag.name) || tag.name === "inheritDoc")
        continue;
      const name =
        (
          {
            remarks: "Remarks",
            returns: "Returns",
            throws: "Throws",
            example: "Example",
            defaultValue: "Default value",
            see: "See also",
            deprecated: "Deprecated"
          } as Record<string, string>
        )[tag.name] ?? tag.name;
      result.push(
        `${heading} ${name}`,
        tag.name === "example" && !/^\s*(?:```|~~~)/m.test(tag.text)
          ? fenced(tag.text)
          : tag.text
      );
    }
    const features = renderTSDocFeatures(custom).replace(
      /^## /gm,
      `${heading} `
    );
    if (features) result.push(features);
    return result;
  }

  function renderDeclaration(
    node: DeclarationReflection,
    path: string,
    depth = 1,
    displayName = node.name,
    ancestors = new Set<number>()
  ): string[] {
    const ref = concrete(node);
    const result: string[] = [];
    if (depth > 1)
      result.push(
        `${"#".repeat(Math.min(depth, 6))} ${code(node.name)} [#${anchors.get(path)?.get(node.id)}]`
      );
    if (ancestors.has(ref.id)) {
      result.push(`Alias of [${label(ref.name)}](<${urls.get(ref.id)}>).`);
      return result;
    }
    const visited = new Set([...ancestors, ref.id]);
    const sigs = signatures(ref);
    const hasHeader =
      !sigs.length ||
      ref.kindOf([
        ReflectionKind.Class,
        ReflectionKind.Interface,
        ReflectionKind.TypeAlias,
        ReflectionKind.Variable,
        ReflectionKind.Property
      ]);
    if (hasHeader) {
      const generics = ref.typeParameters?.map(
        param =>
          `${param.name}${param.type ? ` extends ${typeName(param.type)}` : ""}${param.default ? ` = ${typeName(param.default)}` : ""}`
      );
      const typed = ref.kindOf([
        ReflectionKind.Variable,
        ReflectionKind.Property
      ]);
      const type = ref.type
        ? `${typed ? ": " : " = "}${typeName(ref.type)}`
        : ref.kindOf(ReflectionKind.TypeAlias)
          ? ` = ${objectType(ref)}`
          : "";
      const extended = ref.extendedTypes
        ?.map(type => typeName(type))
        .join(", ");
      const implemented = ref.implementedTypes
        ?.map(type => typeName(type))
        .join(", ");
      const kind = ref.kindOf(ReflectionKind.Variable)
        ? ref.flags.isConst
          ? "const"
          : "let"
        : ref.kindOf(ReflectionKind.TypeAlias)
          ? "type"
          : ref.kindOf([ReflectionKind.Property, ReflectionKind.EnumMember])
            ? ""
            : ReflectionKind[ref.kind].toLowerCase();
      result.push(
        fenced(
          `${modifiers(ref)}${kind ? `${kind} ` : ""}${displayName}${ref.flags.isOptional ? "?" : ""}${generics?.length ? `<${generics.join(", ")}>` : ""}${type}${extended ? ` extends ${extended}` : ""}${implemented ? ` implements ${implemented}` : ""}${ref.defaultValue !== undefined ? ` = ${ref.defaultValue}` : ""}`
        )
      );
    }
    result.push(...commentText(ref.comment, depth + 1));
    if (ref.typeParameters?.length) {
      result.push(`${"#".repeat(Math.min(depth + 1, 6))} Type parameters`);
      for (const param of ref.typeParameters) {
        result.push(
          `- ${code(param.name)}\n\n${commentText(param.comment, depth + 2)
            .map(text =>
              text
                .split("\n")
                .map(line => `  ${line}`)
                .join("\n")
            )
            .join("\n\n")}`
        );
      }
    }
    for (const [index, signature] of sigs.entries()) {
      if (sigs.length > 1)
        result.push(
          `${"#".repeat(Math.min(depth + 1, 6))} Signature ${index + 1}`
        );
      const name =
        signature.kindOf(ReflectionKind.IndexSignature) || hasHeader
          ? ""
          : `${displayName}${ref.flags.isOptional ? "?" : ""}`;
      result.push(fenced(`${modifiers(ref)}${signatureText(signature, name)}`));
      result.push(...commentText(signature.comment, depth + 1));
      if (signature.typeParameters?.length) {
        result.push(`${"#".repeat(Math.min(depth + 1, 6))} Type parameters`);
        for (const param of signature.typeParameters)
          result.push(
            `- ${code(param.name)}${param.type ? ` extends ${code(typeName(param.type))}` : ""}\n\n${commentText(
              param.comment,
              depth + 2
            )
              .map(text =>
                text
                  .split("\n")
                  .map(line => `  ${line}`)
                  .join("\n")
              )
              .join("\n\n")}`
          );
      }
      if (signature.parameters?.length) {
        result.push(`${"#".repeat(Math.min(depth + 1, 6))} Parameters`);
        for (const param of signature.parameters) {
          result.push(
            `- ${code(param.name)} — ${code(typeName(param.type))}${param.flags.isOptional ? " (optional)" : ""}${param.defaultValue !== undefined ? `; default ${code(param.defaultValue)}` : ""}\n\n${commentText(
              param.comment,
              depth + 2
            )
              .map(text =>
                text
                  .split("\n")
                  .map(line => `  ${line}`)
                  .join("\n")
              )
              .join("\n\n")}`
          );
        }
      }
    }
    for (const member of members(ref))
      result.push(
        ...renderDeclaration(member, path, depth + 1, member.name, visited)
      );
    return result;
  }

  function makePage(
    name: string,
    kind: string,
    path: string,
    body: string[],
    description?: string
  ): ApiReferencePage {
    const text =
      description?.replace(/\s+/g, " ").trim() ||
      `${kind} reference for ${name}.`;
    const markdown = `---\n${stringify({ title: name, description: text, documentType: "reference" }, { lineWidth: 0 })}---\n\n<!-- ${GENERATED}. Edit the TypeScript source, then generate again. -->\n\n# ${label(name)}\n\n${body.filter(Boolean).join("\n\n")}\n`;

    return {
      name,
      kind,
      path,
      markdown,
      page: compileDocumentationPage(markdown, { path, format: "md" })
    };
  }
  const pages = roots.map(root => {
    const ref = concrete(root.reflection);
    const comment = ref.comment ?? signatures(ref)[0]?.comment;

    return makePage(
      root.name,
      ReflectionKind[ref.kind],
      root.path,
      renderDeclaration(root.reflection, root.path, 1, root.name),
      parts(comment?.summary).split(/\n\s*\n/)[0]
    );
  });
  const index = makePage(
    title,
    "API",
    "index.md",
    pages.map(page => `- [${label(page.name)}](./${page.path}) — ${page.kind}`)
  );

  return { pages, index, diagnostics };
}
