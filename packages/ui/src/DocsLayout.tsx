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
import type { Components } from "hast-util-to-jsx-runtime";
import type { ReactNode } from "react";
import { BodyText } from "./components/body-text";
// Flat exports only: React Server Components cannot dot into a client module.
import {
  DocsPage as CycloneDocsPage,
  DocsPageContent,
  DocsPageHeader,
  DocsPageMain,
  DocsPageSideNav,
  DocsPageSideNavToggle
} from "./components/docs-page";
import { HeadingText } from "./components/heading-text";
import {
  NavigationSidebar,
  NavigationSidebarBody,
  NavigationSidebarFolder,
  NavigationSidebarHeader,
  NavigationSidebarItem
} from "./components/navigation-sidebar";
import { DocsBody } from "./DocsBody";
import type { PageTreeNode } from "./tree";

function contains(node: PageTreeNode, url: string | undefined): boolean {
  if (node.type === "page") return node.url === url;

  return (
    node.index?.url === url || node.children.some(child => contains(child, url))
  );
}

function renderNodes(
  nodes: readonly PageTreeNode[],
  activeUrl?: string
): ReactNode {
  return nodes.map(node =>
    node.type === "page" ? (
      <NavigationSidebarItem
        key={node.url}
        href={node.url}
        active={node.url === activeUrl}>
        {node.name}
      </NavigationSidebarItem>
    ) : (
      <NavigationSidebarFolder
        key={node.index?.url ?? node.name}
        label={node.name}
        defaultOpen={contains(node, activeUrl)}>
        {renderNodes(
          node.index ? [node.index, ...node.children] : node.children,
          activeUrl
        )}
      </NavigationSidebarFolder>
    )
  );
}

export interface DocsLayoutProps {
  /**
   * Side navigation from {@link createPageTree}.
   */
  tree: readonly PageTreeNode[];

  /**
   * Site name shown above the navigation.
   */
  title?: ReactNode;

  /**
   * URL of the current page, highlighted in the navigation and opening its folders.
   */
  activeUrl?: string;

  /**
   * A {@link DocsPage}.
   */
  children: ReactNode;
}

/**
 * The documentation shell: a collapsible side navigation beside the current page.
 */
export function DocsLayout({
  tree,
  title,
  activeUrl,
  children
}: DocsLayoutProps) {
  return (
    <CycloneDocsPage>
      <DocsPageSideNav>
        <NavigationSidebar render="div">
          <NavigationSidebarHeader>
            <BodyText
              render="span"
              color="emphasis"
              fontWeight="700"
              flexGrow={1}>
              {title}
            </BodyText>
            <DocsPageSideNavToggle />
          </NavigationSidebarHeader>
          <NavigationSidebarBody>
            {renderNodes(tree, activeUrl)}
          </NavigationSidebarBody>
        </NavigationSidebar>
      </DocsPageSideNav>
      {children}
    </CycloneDocsPage>
  );
}

export interface DocsPageProps {
  /**
   * A page compiled by `@sourcebook/core`.
   */
  page: Pick<DocumentationPage, "title" | "description" | "html" | "toc">;

  /**
   * Breadcrumbs and page actions for the top row.
   */
  header?: ReactNode;

  /**
   * Passed to {@link DocsBody}.
   */
  components?: Partial<Components>;
}

/**
 * One documentation page with its table of contents. Render it inside {@link DocsLayout}.
 * The title and description come from the page when the body has no `h1`.
 */
export function DocsPage({ page, header, components }: DocsPageProps) {
  return (
    <DocsPageMain>
      <DocsPageHeader>{header}</DocsPageHeader>
      <DocsPageContent toc={page.toc}>
        {/<h1[\s>]/.test(page.html) ? null : (
          <>
            <HeadingText render="h1" level="title">
              {page.title}
            </HeadingText>
            <BodyText render="p" color="ink">
              {page.description}
            </BodyText>
          </>
        )}
        <DocsBody html={page.html} components={components} />
      </DocsPageContent>
    </DocsPageMain>
  );
}
