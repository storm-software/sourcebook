"use client";

import type { IconProps } from "@tamagui/helpers-icon";
import { useCurrentColor } from "@tamagui/helpers-tamagui";
import { memo } from "react";
import { Defs, Path, Pattern, Rect, Svg } from "react-native-svg";
import type { ThemedIconBodyProps } from "./themed-icon";
import { themedIcon } from "./themed-icon";
const Icon = (props: ThemedIconBodyProps<IconProps>) => {
  const color = useCurrentColor((props.color || "on-primary") as any);

  return (
    <Svg x="0" y="0" fill="none" {...props}>
      <Defs>
        <Pattern
          id="diag_p"
          patternUnits="userSpaceOnUse"
          width="24"
          height="48"
          patternTransform="rotate(-45 2 2)">
          <Path d="M -1,16 l 48,0" stroke={color} strokeWidth="24" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#diag_p)" />
    </Svg>
  );
};

Icon.displayName = "Diagonal";

export const Diagonal = memo<IconProps>(themedIcon(Icon));
