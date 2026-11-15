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

import type { DocumentationPage } from "@sourcebook/core";

/**
 * A link to one page in the side navigation.
 */
export interface PageTreeItem {
  type: "page";
  name: string;
  url: string;
}

/**
 * A directory of pages. `index` is the page compiled from the directory's `index.md` or `README.md`.
 */
export interface PageTreeFolder {
  type: "folder";
  name: string;
  index?: PageTreeItem;
  children: PageTreeNode[];
}

export type PageTreeNode = PageTreeItem | PageTreeFolder;

function parentOf(slug: string): string {
  return slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : "";
}

function folderName(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1).replaceAll("-", " ");

  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;
}

/**
 * Build the side navigation from compiled pages, one folder per slug directory.
 * Nodes keep the order of `pages`; `loadDocumentationPages` returns them sorted by path.
 *
 * @param pages - Pages from `loadDocumentationPages` or `compileDocumentationPage`.
 * @param baseUrl - URL prefix for every page. The `index` page links to `baseUrl` itself.
 */
export function createPageTree(
  pages: readonly Pick<DocumentationPage, "slug" | "title">[],
  baseUrl = "/docs"
): PageTreeNode[] {
  const base = baseUrl.replace(/\/+$/, "");
  const root: PageTreeFolder = { type: "folder", name: "", children: [] };
  const folders = new Map([["", root]]);
  const directories = new Set<string>();
  for (const { slug } of pages) {
    for (let path = parentOf(slug); path; path = parentOf(path)) {
      directories.add(path);
    }
  }

  const folderAt = (path: string): PageTreeFolder => {
    let folder = folders.get(path);
    if (!folder) {
      folder = { type: "folder", name: folderName(path), children: [] };
      folderAt(parentOf(path)).children.push(folder);
      folders.set(path, folder);
    }

    return folder;
  };

  for (const { slug, title } of pages) {
    const item: PageTreeItem = {
      type: "page",
      name: title,
      url: slug === "index" ? base || "/" : `${base}/${slug}`
    };
    if (directories.has(slug)) {
      const folder = folderAt(slug);
      folder.name = title;
      folder.index = item;
      continue;
    }
    folderAt(parentOf(slug)).children.push(item);
  }

  return root.children;
}
