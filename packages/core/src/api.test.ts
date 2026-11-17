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

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DocumentationPageError,
  generateApiReference,
  writeApiReference
} from "./index.js";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "sourcebook-api-"));
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
        types: []
      },
      include: ["*.ts"]
    })
  );
  await writeFile(
    join(root, "base.ts"),
    [
      "/** An entity identified by a stable key. */",
      "export interface Entity {",
      "  /** Stable identifier. */",
      "  id: string;",
      "}",
      "/** Formats a count.\n * @remarks Keeps the original value.\n * @param count - Number of entries.\n * @returns The formatted count.\n * @throws Error if the count is negative.\n * @warning Check the count first.\n * @credit [Design team](https://example.com/team)\n */",
      "export function format(count = 1): string { if (count < 0) throw new Error(); return String(count); }",
      "/** Internal implementation. @internal */",
      "export const secret = 42;"
    ].join("\n")
  );
  await writeFile(
    join(root, "index.ts"),
    [
      'import { format } from "./base.js";',
      'export { Entity, format as formatItem, secret } from "./base.js";',
      "/** Uses {@link Entity | an entity}, {@link https://example.com | the guide}, and {@link Entity.id | its key}. */",
      "export class Store {",
      "  /** Store name. */",
      "  readonly name = 'main';",
      "  /** Reads a count.\n   * @param count - Count to read.\n   * @returns The count.\n   */",
      "  read(count: number): number;",
      "  read(count: string): string;",
      "  read(count: number | string) { return count; }",
      "}",
      "/** {@inheritDoc formatItem} */",
      "export function copy(count = 1): string { return format(count); }",
      "/** A configuration record. */",
      "export type Settings = { enabled: boolean };",
      "/** Available states. */",
      "export enum State { Ready, Busy }"
    ].join("\n")
  );
  return root;
}

describe("TypeScript API reference", () => {
  it("preserves type precedence, method flags, index signatures and unique link anchors", async () => {
    const root = await fixture();
    try {
      await writeFile(
        join(root, "shapes.ts"),
        [
          "/** A choice with a required key. */",
          "export type Mixed = ({ a: string } | { b: string }) & { key: number };",
          "/** Lookup table. */",
          "export interface Dict<T extends string = string> { [key: string]: T }",
          "/** Alias lookup table. */",
          "export type Table = { [key: string]: number };",
          "/** See {@link Value.value} and {@link Value.remarks}.\n * @remarks A named value.\n */",
          "export abstract class Value {",
          "  value = 1;",
          "  remarks = 'details';",
          "  static create(): number { return 1; }",
          "  abstract read(): string;",
          "}",
          "/** Optional implementation. */",
          "export interface Optional { run?(): void }"
        ].join("\n")
      );
      const result = await generateApiReference(join(root, "shapes.ts"));
      const page = (name: string) =>
        result.pages.find(item => item.name === name)!;
      expect(page("Mixed").markdown).toContain(
        "({ a: string; } | { b: string; }) & { key: number; }"
      );
      expect(page("Dict").markdown).toContain(
        "interface Dict<T extends string = string>"
      );
      expect(page("Dict").markdown).toContain("[key: string]: T");
      expect(page("Dict").markdown).not.toContain("Dict[key:");
      expect(page("Table").markdown).toContain(
        "type Table = { [key: string]: number; }"
      );
      expect(page("Value").markdown).toContain("static create(): number");
      expect(page("Value").markdown).toContain("abstract read(): string");
      expect(page("Optional").markdown).toContain("run?(): void");
      const html = page("Value").page.html;
      const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const match of html.matchAll(/href="\.\/value.md#([^"]+)"/g)) {
        expect(html).toMatch(new RegExp(`<h2 id="${match[1]}"><code>`));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("converts a standalone TypeScript file without a tsconfig", async () => {
    const root = await mkdtemp(join(tmpdir(), "sourcebook-api-single-"));
    try {
      await writeFile(
        join(root, "source.ts"),
        "/** A public value. */\nexport const value = 1;"
      );
      const result = await generateApiReference(join(root, "source.ts"));
      expect(result.pages.map(page => page.name)).toEqual(["value"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("finds the source tsconfig and handles namespaces that re-export themselves", async () => {
    const root = await fixture();
    try {
      await writeFile(
        join(root, "loop.ts"),
        "/** Public namespace. */\nexport namespace Loop {\n /** Recursive namespace alias. */\n export import self = Loop;\n}"
      );
      const result = await generateApiReference(join(root, "loop.ts"));
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]!.name).toBe("Loop");
      expect(result.pages[0]!.page.html).toContain("self");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("keeps generic documentation, code examples and typed variable declarations", async () => {
    const root = await fixture();
    try {
      await writeFile(
        join(root, "generic.ts"),
        [
          "/** Holds a value.\n * @typeParam T - Stored value type.\n * @example\n * ```ts\n * const literal = '{@link NotARealReference}';\n * ```\n */",
          "export class Box<T extends string = string> {",
          "  /** The stored value. */",
          "  constructor(public readonly value: T) {}",
          "}",
          "/** Default retry count. */",
          "export const retries: number = 3;"
        ].join("\n")
      );
      const result = await generateApiReference(join(root, "generic.ts"), {
        tsconfig: join(root, "tsconfig.json")
      });
      expect(result.diagnostics).toEqual([]);
      const box = result.pages.find(page => page.name === "Box")!;
      expect(box.page.html).toContain("Stored value type.");
      expect(box.markdown).toContain("{@link NotARealReference}");
      expect(box.markdown).toContain("new Box");
      expect(
        result.pages.find(page => page.name === "retries")!.markdown
      ).toContain("const retries: number = 3");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports or rejects unresolved links and rejects invalid TypeScript", async () => {
    const root = await fixture();
    try {
      await writeFile(
        join(root, "invalid.ts"),
        "/** See {@link Absent}. */\nexport const value = 1;"
      );
      await expect(
        generateApiReference(join(root, "invalid.ts"), {
          tsconfig: join(root, "tsconfig.json"),
          strict: true
        })
      ).rejects.toBeInstanceOf(DocumentationPageError);
      await expect(
        writeApiReference(join(root, "invalid.ts"), join(root, "unwritten"), {
          tsconfig: join(root, "tsconfig.json")
        })
      ).rejects.toBeInstanceOf(DocumentationPageError);
      await writeFile(
        join(root, "invalid.ts"),
        "export const value: string = 1;"
      );
      await expect(
        generateApiReference(join(root, "invalid.ts"), {
          tsconfig: join(root, "tsconfig.json")
        })
      ).rejects.toBeInstanceOf(DocumentationPageError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("expands directories without documenting dependencies, tests or generated build output", async () => {
    const root = await fixture();
    try {
      for (const directory of ["dist", "node_modules", ".cache"]) {
        await mkdir(join(root, directory), { recursive: true });
        await writeFile(
          join(root, directory, "generated.ts"),
          "export const implementationDetail = 1;"
        );
      }
      await writeFile(
        join(root, "ignored.test.ts"),
        "export const testDetail = 1;"
      );
      const result = await generateApiReference(root, {
        tsconfig: join(root, "tsconfig.json")
      });
      expect(
        result.pages.some(page =>
          /implementationDetail|testDetail|secret/.test(page.name)
        )
      ).toBe(false);
      expect(new Set(result.pages.map(page => page.path)).size).toBe(
        result.pages.length
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("discovers public exports and renders signatures, members, overloads and custom tags", async () => {
    const root = await fixture();
    try {
      const result = await generateApiReference(join(root, "index.ts"), {
        tsconfig: join(root, "tsconfig.json")
      });
      expect(result.diagnostics).toEqual([]);
      expect(result.pages.map(page => page.name)).toEqual(
        expect.arrayContaining([
          "Entity",
          "formatItem",
          "Store",
          "copy",
          "Settings",
          "State"
        ])
      );
      expect(result.pages.some(page => page.name === "secret")).toBe(false);
      const format = result.pages.find(page => page.name === "formatItem")!;
      expect(format.markdown).toContain("Number of entries.");
      expect(format.markdown).toContain("The formatted count.");
      expect(format.markdown).toContain("negative");
      expect(format.markdown).toContain("count");
      expect(format.markdown).not.toContain("return String");
      expect(format.page.html).toContain("admonition-warning");
      expect(format.page.html).toContain('href="https://example.com/team"');
      const store = result.pages.find(page => page.name === "Store")!;
      expect(
        result.pages.find(page => page.name === "Settings")!.markdown
      ).toContain("type Settings = { enabled: boolean; }");
      expect(store.markdown).toContain("count: number");
      expect(store.markdown).toContain("count: string");
      expect(store.page.html).toContain("Store name.");
      expect(
        result.pages.every(
          page =>
            page.page.documentType === "reference" &&
            !page.page.missingFields.length
        )
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves local, external and member links and inherits summary and parameter documentation", async () => {
    const root = await fixture();
    try {
      const result = await generateApiReference(join(root, "index.ts"), {
        tsconfig: join(root, "tsconfig.json")
      });
      const store = result.pages.find(page => page.name === "Store")!;
      const entity = result.pages.find(page => page.name === "Entity")!;
      expect(store.page.html).toContain(`href="./${entity.path}"`);
      expect(store.page.html).toContain(`href="./${entity.path}#`);
      expect(store.page.html).toContain('href="https://example.com"');
      expect(store.page.html).not.toContain("{@link");
      const copy = result.pages.find(page => page.name === "copy")!;
      expect(copy.page.html).toContain("Formats a count.");
      expect(copy.page.html).toContain("Keeps the original value.");
      expect(copy.page.html).toContain("Number of entries.");
      expect(copy.page.html).not.toContain("inheritDoc");
      for (const page of result.pages) {
        for (const match of page.page.html.matchAll(
          /href="\.\/([^"#]+)(?:#([^"]+))?"/g
        )) {
          const target = result.pages.find(
            candidate => candidate.path === match[1]
          );
          expect(target, `Missing linked page ${match[1]}`).toBeDefined();
          if (match[2]) expect(target!.page.html).toContain(`id="${match[2]}"`);
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports broken references and inheritance cycles without inventing links", async () => {
    const root = await fixture();
    try {
      await writeFile(
        join(root, "broken.ts"),
        "/** See {@link Missing}. */\nexport const value = 1;\n/** {@inheritDoc B} */\nexport interface A {}\n/** {@inheritDoc A} */\nexport interface B {}\n/** {@inheritDoc Unknown} */\nexport interface C {}"
      );
      const result = await generateApiReference(join(root, "broken.ts"), {
        tsconfig: join(root, "tsconfig.json")
      });
      expect(
        result.diagnostics.some(item => /Missing/.test(item.message))
      ).toBe(true);
      expect(
        result.diagnostics.some(item => /cycl|circular/i.test(item.message))
      ).toBe(true);
      expect(
        result.diagnostics.some(item => /Unknown/.test(item.message))
      ).toBe(true);
      expect(
        result.pages.find(page => page.name === "value")!.page.html
      ).not.toContain('href="Missing"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes a compilable index, regenerates owned pages and protects hand-written output", async () => {
    const root = await fixture();
    const out = join(root, "docs");
    try {
      const paths = await writeApiReference(join(root, "index.ts"), out, {
        tsconfig: join(root, "tsconfig.json")
      });
      expect(paths.at(-1)).toBe(join(out, "index.md"));
      expect(await readFile(join(out, "index.md"), "utf8")).toContain(
        "documentType: reference"
      );
      await expect(
        writeApiReference(join(root, "index.ts"), out, {
          tsconfig: join(root, "tsconfig.json")
        })
      ).resolves.toEqual(paths);
      await writeFile(paths[0]!, "Hand-written content");
      const previous = await readFile(paths[1]!, "utf8");
      await expect(
        writeApiReference(join(root, "index.ts"), out, {
          tsconfig: join(root, "tsconfig.json")
        })
      ).rejects.toBeInstanceOf(DocumentationPageError);
      expect(await readFile(paths[0]!, "utf8")).toBe("Hand-written content");
      expect(await readFile(paths[1]!, "utf8")).toBe(previous);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
