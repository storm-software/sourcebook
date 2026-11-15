"use client";

import type { GetProps } from "@tamagui/core";
import { styled } from "@tamagui/core";
import { SizableText } from "@tamagui/text";

export const BodyText = styled(SizableText, {
  displayName: "BodyText",
  render: "p",
  color: "ink",
  fontFamily: "body",
  size: "md",
  fontWeight: "normal"
});

export type BodyTextProps = GetProps<typeof BodyText>;
