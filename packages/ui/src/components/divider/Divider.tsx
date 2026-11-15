"use client";

import type {
  ColorTokens,
  TamaguiElement,
  ThemeTokens,
  ViewProps
} from "@tamagui/core";
import { View } from "@tamagui/core";
import { createElement, forwardRef } from "react";

export type DividerDirection = "horizontal" | "vertical";
export type DividerSize = "sm" | "md" | "lg";
export type DividerColor = ColorTokens | ThemeTokens | (string & {});

// Other view props (e.g. margins) are forwarded to the line.
export interface DividerProps extends Omit<
  ViewProps,
  "children" | "direction" | "size" | "color"
> {
  /** The direction in which the divider extends. */
  direction?: DividerDirection;
  /** The divider thickness: 1px, 2px, or 3px. */
  size?: DividerSize;
  /** The divider color. Defaults to the theme's border color. */
  color?: DividerColor;
}

const dividerThickness = {
  sm: 1,
  md: 2,
  lg: 3
} as const;

/** A themed line that separates adjacent content. */
export const Divider = forwardRef<TamaguiElement, DividerProps>(
  (
    { color, direction = "horizontal", size = "md", ...props },
    forwardedRef
  ) => {
    const thickness = dividerThickness[size];
    const horizontal = direction === "horizontal";

    return createElement(View, {
      ...props,
      ref: forwardedRef,
      alignSelf: horizontal ? undefined : "stretch",
      backgroundColor:
        color ||
        (size === "sm" ? "hairline" : size === "md" ? "hairline" : "border"),
      flexShrink: 0,
      height: horizontal ? thickness : "100%",
      width: horizontal ? "100%" : thickness
    } as never);
  }
);
