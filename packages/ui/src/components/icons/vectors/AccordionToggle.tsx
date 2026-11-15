"use client";

import { styled, View } from "@tamagui/core";
import type { IconProps } from "@tamagui/helpers-icon";
import { useCurrentColor } from "@tamagui/helpers-tamagui";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { memo, useEffect, useState } from "react";
import { Path, Svg } from "react-native-svg";
import type { ThemedIconBodyProps } from "./themed-icon";
import { themedIcon } from "./themed-icon";

const AccordionToggleContainer = styled(View, {
  displayName: "AccordionToggle",

  transition: "250ms",

  variants: {
    isExpanded: {
      true: {
        rotate: "0deg"
      },
      false: {
        rotate: "-90deg"
      }
    }
  } as const,

  defaultVariants: {
    isExpanded: false
  }
});

export type AccordionToggleProps = IconProps & {
  isExpanded?: boolean;
};

const Icon = ({
  isExpanded = false,
  size = 24,
  strokeWidth = 1.5,
  ...props
}: ThemedIconBodyProps<AccordionToggleProps>) => {
  const color = useCurrentColor((props.color || "primary") as any);

  const compressLengthPosition = useMotionValue(0);
  const compressLengthPlayback = animate(compressLengthPosition, 14, {
    duration: 0.1,
    ease: "linear"
  });

  const [compressLength, setCompressLength] = useState(0);
  useMotionValueEvent(compressLengthPosition, "change", latest => {
    setCompressLength(latest);
  });

  const compressOpacityPosition = useMotionValue(0);
  const compressOpacityPlayback = animate(compressOpacityPosition, 1, {
    duration: 0.15,
    ease: "linear"
  });

  const [compressOpacity, setCompressOpacity] = useState(0);
  useMotionValueEvent(compressOpacityPosition, "change", latest => {
    setCompressOpacity(latest);
  });

  const expandLengthPosition = useMotionValue(14);
  const expandLengthPlayback = animate(expandLengthPosition, 1, {
    duration: 0.1,
    ease: "linear"
  });

  const [expandLength, setExpandLength] = useState(14);
  useMotionValueEvent(expandLengthPosition, "change", latest => {
    setExpandLength(latest);
  });

  const expandOpacityPosition = useMotionValue(1);
  const expandOpacityPlayback = animate(expandOpacityPosition, 0, {
    duration: 0.025,
    ease: "linear"
  });

  const [expandOpacity, setExpandOpacity] = useState(1);
  useMotionValueEvent(expandOpacityPosition, "change", latest => {
    setExpandOpacity(latest);
  });

  useEffect(() => {
    if (!isExpanded) {
      expandLengthPlayback.stop();
      expandLengthPosition.set(14);
      expandOpacityPlayback.stop();
      expandOpacityPosition.set(1);
      compressLengthPlayback.play();
      compressOpacityPlayback.play();
    } else {
      compressLengthPlayback.stop();
      compressLengthPosition.set(0);
      compressOpacityPlayback.stop();
      compressOpacityPosition.set(0);
      expandLengthPlayback.play();
    }
  }, [
    compressLengthPlayback,
    compressLengthPosition,
    compressOpacityPlayback,
    compressOpacityPosition,
    expandLengthPlayback,
    expandLengthPosition,
    expandOpacityPlayback,
    expandOpacityPosition,
    isExpanded
  ]);

  return (
    <View style={{ width: size, height: size, rotate: "-90deg" }}>
      <AccordionToggleContainer
        width={size}
        height={size}
        isExpanded={isExpanded}>
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}>
          <Path d="M5 12h14" stroke={color} strokeWidth={strokeWidth} />

          {isExpanded && (
            <Path
              stroke={color}
              d={`M12 5v${expandLength}`}
              strokeWidth={strokeWidth}
              opacity={expandOpacity}
            />
          )}

          {!isExpanded && (
            <Path
              stroke={color}
              d={`M12 5v${compressLength}`}
              strokeWidth={strokeWidth}
              opacity={compressOpacity}
            />
          )}
        </Svg>
      </AccordionToggleContainer>
    </View>
  );
};

Icon.displayName = "AccordionToggle";

export const AccordionToggle = memo<AccordionToggleProps>(themedIcon(Icon));
