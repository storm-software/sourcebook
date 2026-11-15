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

import type { ColorThemeName } from "@cyclone-ui/state/theme";
import { fromHtml } from "hast-util-from-html";
import type { Components } from "hast-util-to-jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { BodyText } from "./components/body-text";
// Flat exports only: React Server Components cannot dot into a client module.
import {
  Callout,
  CalloutHeader,
  CalloutHeading,
  CalloutIcon
} from "./components/callout";
import { CodeBlock, Pre } from "./components/code-block";
import { Divider } from "./components/divider";
import { HeadingText } from "./components/heading-text";
import { InlineCodeText } from "./components/inline-code-text";
import { Link } from "./components/link";

const HEADING_LEVELS = {
  h1: "title",
  h2: "lg",
  h3: "md",
  h4: "sm",
  h5: "xs",
  h6: "xs"
} as const;

const CALLOUT_THEMES = new Set<string>([
  "discovery",
  "info",
  "warning",
  "danger",
  "success"
] satisfies ColorThemeName[]);

const headings = Object.fromEntries(
  Object.entries(HEADING_LEVELS).map(([tag, level]) => [
    tag,
    ({ children, id }: ComponentProps<"h1">) => (
      <HeadingText render={tag} level={level} id={id}>
        {children}
      </HeadingText>
    )
  ])
);

/**
 * Cyclone UI components for the elements `@sourcebook/core` emits. Other elements render as plain HTML.
 */
export const defaultComponents: Partial<Components> = {
  ...headings,
  p: ({ children, className }) =>
    className === "admonition-title" ? (
      <CalloutHeader>
        <CalloutIcon />
        <CalloutHeading render="p">{children}</CalloutHeading>
      </CalloutHeader>
    ) : (
      <BodyText render="p">{children}</BodyText>
    ),
  a: ({ children, href }) => <Link href={href}>{children}</Link>,
  code: ({ children }) => (
    <InlineCodeText render="code">{children}</InlineCodeText>
  ),
  // `pre > code` would otherwise render as inline code.
  pre: ({ children }) => (
    <CodeBlock>
      <Pre>
        {isValidElement<ComponentProps<"code">>(children) ? (
          <code className={children.props.className}>
            {children.props.children}
          </code>
        ) : (
          children
        )}
      </Pre>
    </CodeBlock>
  ),
  aside: ({ children, ...props }) => {
    const type = (props as { "data-type"?: string })["data-type"];
    if (!type) return <aside {...props}>{children}</aside>;

    return (
      <Callout
        theme={(CALLOUT_THEMES.has(type) ? type : "info") as ColorThemeName}
        marginVertical="2xl">
        {children}
      </Callout>
    );
  },
  hr: () => <Divider />
};

export interface DocsBodyProps {
  /**
   * `DocumentationPage.html` from `@sourcebook/core`. Raw HTML is rendered as is, so pass only trusted pages.
   */
  html: string;

  /**
   * Override or add components by tag name, such as `{ table: MyTable }`.
   */
  components?: Partial<Components>;
}

/**
 * Render a compiled page body with Cyclone UI components. Works in React Server Components.
 */
export function DocsBody({ html, components }: DocsBodyProps): ReactNode {
  return toJsxRuntime(fromHtml(html, { fragment: true }), {
    Fragment,
    jsx,
    jsxs,
    components: { ...defaultComponents, ...components }
  });
}
