"use client";

import type { GetProps } from "@tamagui/core";
import { styled } from "@tamagui/core";
import { SizableText } from "@tamagui/text";

export const InlineCodeText = styled(SizableText, {
  displayName: "InlineCodeText",
  render: "span",
  backgroundColor: "floating-active",
  color: "emphasis",
  // inline (not inline-flex) so long code wraps like text instead of
  // becoming a block; `clone` repeats padding/border/radius on each line
  display: "inline",
  boxDecorationBreak: "clone",
  fontFamily: "code",
  paddingTop: "md",
  paddingBottom: "lg",
  paddingHorizontal: "xl",
  size: "md",
  // after `size`: its variant writes the font's size-keyed weight (`md` → 900)
  fontWeight: "normal",
  // inline padding doesn't grow the line box; this line-height does, so
  // wrapped fragments don't overlap the lines around them
  // (also after `size`, which writes its own)
  lineHeight: 1.6,
  borderRadius: "sm",
  borderWidth: 1,
  borderColor: "hairline"
});

export type InlineCodeTextProps = GetProps<typeof InlineCodeText>;
