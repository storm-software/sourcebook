"use client";

import { ExternalLink, ThemeableIcon } from "../icons";
import { LinkText } from "../link-text";
import { isWeb } from "@tamagui/constants";
import type { GetProps } from "@tamagui/core";
import { createStyledHOC, styled, View } from "@tamagui/core";
import type { ReactElement } from "react";
import { cloneElement, isValidElement } from "react";
import { Linking } from "react-native";

// Types and static config only (`styled(Link)` keeps the `a` default):
// `Link` renders `LinkText` itself, see below.
const LinkFrame = styled(LinkText, {
  displayName: "Link",
  render: "a",
  role: "link",
  cursor: "pointer"
});

// The hover shift lives on a plain `View`: on a `styled(ThemeableIcon)` HOC the
// `x` / `y` clauses compile to CSS classes and snap instead of animating.
const ExternalIconFrame = styled(View, {
  displayName: "Link",
  render: "span",
  display: "inline-flex",
  marginBottom: "md",
  cursor: "pointer",
  transition: "200ms",
  x: "0 group-hover/link:2px",
  y: "0 group-hover/link:-2px"
});

export const Link = createStyledHOC(
  LinkFrame,
  (
    {
      target,
      children,
      href,
      external,
      size = "md",
      render = "a",
      onClick,
      onPress,
      ...props
    }: GetProps<typeof LinkFrame> & {
      href?: string;
      target?: string;
      rel?: string;
      download?: string;
      external?: boolean;
    },
    forwardedRef
  ) => {
    const hasRenderElement = isValidElement(render);
    let renderElement = render;
    if (isWeb && hasRenderElement && (onClick || onPress)) {
      // Keep consumer clicks off Tamagui's text press path. The router calls
      // this handler before deciding whether to perform client navigation.
      const element = render as ReactElement<{ onClick?: typeof onClick }>;
      renderElement = cloneElement(element, {
        onClick: event => {
          element.props.onClick?.(event);
          onClick?.(event);
          // Tamagui forwards DOM clicks to onPress on web, although its public
          // callback type uses React Native's GestureResponderEvent.
          onPress?.(
            event as unknown as Parameters<NonNullable<typeof onPress>>[0]
          );
        }
      });
    }

    // `LinkText`, not `LinkFrame`: a `render` element (such as Next's `<Link>`)
    // given to a `styled()` over an HOC replaces the HOC, and with it the
    // frame that turns the styles into classes, so the link lost them all.
    return (
      <LinkText
        group="link"
        ref={forwardedRef}
        role="link"
        size={size}
        {...props}
        render={renderElement}
        {...(isWeb
          ? {
              ...(hasRenderElement
                ? {
                    ...(href !== undefined && { href }),
                    ...(target !== undefined && { target })
                  }
                : { href, target: external ? "_blank" : target }),
              ...(!hasRenderElement && { onClick, onPress })
            }
          : {
              onClick,
              onPress: (event: Parameters<NonNullable<typeof onPress>>[0]) => {
                onPress?.(event);
                if (href !== undefined) {
                  void Linking.openURL(href);
                }
              }
            })}>
        {children}

        {external && !(isWeb && hasRenderElement) && (
          <ExternalIconFrame style={{ verticalAlign: "middle" }}>
            <ThemeableIcon render="span" size="4xl">
              {/* Set `color` on the icon (whose props win in `getIcon`) so the
                  SVG fills with the link's computed text color and follows
                  every variant and hover / press state. */}
              <ExternalLink color="currentColor" />
            </ThemeableIcon>
          </ExternalIconFrame>
        )}
      </LinkText>
    );
  },
  { displayName: "Link" }
);

export type LinkProps = GetProps<typeof Link>;
