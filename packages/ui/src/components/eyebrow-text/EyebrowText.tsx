"use client";

import type { GetProps } from "@tamagui/core";
import { styled } from "@tamagui/core";
// Lets TypeScript name `GetFontSizedInput` (SizableText's `size` type) in
// this package's declarations.
import type {} from "@tamagui/get-font-sized";
import { SizableText } from "@tamagui/text";

export const EyebrowText = styled(SizableText, {
  displayName: "EyebrowText",
  render: "h5",
  color: "subtle",
  fontFamily: "eyebrow",
  size: "xs",
  fontWeight: "medium",
  textTransform: "uppercase"
});

export type EyebrowTextProps = GetProps<typeof EyebrowText>;
