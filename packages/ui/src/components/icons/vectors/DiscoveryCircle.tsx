"use client";

import { getSized } from "@cyclone-ui/helpers";
import { Lightbulb } from "../icons/Lightbulb";
import type { IconProps } from "@tamagui/helpers-icon";
import { useCurrentColor } from "@tamagui/helpers-tamagui";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import { Circle, G, Svg } from "react-native-svg";
import type { ThemedIconBodyProps } from "./themed-icon";
import { themedIcon } from "./themed-icon";

export type DiscoveryCircleProps = IconProps & {
  isComplete?: boolean;
};

const Icon = ({
  isComplete = true,
  size = 24,
  ...props
}: ThemedIconBodyProps<DiscoveryCircleProps>) => {
  const color = useCurrentColor((props.color || "primary") as any);

  const diameter = 24;
  const strokeWidth = 2;
  const lightBulbScaleReferenceSize = 62;
  const resolvedSize = getSized(size);
  const isSmall = resolvedSize < getSized("10xl");
  const outerRadius = diameter / 2;
  const innerRadius = outerRadius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  const motionCircle = useMotionValue(circumference);
  const [strokeDashoffset, setStrokeDashoffset] = useState(circumference);
  useMotionValueEvent(motionCircle, "change", latest => {
    setStrokeDashoffset(latest);
  });

  const motionLightBulbScale = useMotionValue(0);
  const [lightBulbScale, setLightBulbScale] = useState(0);
  useMotionValueEvent(motionLightBulbScale, "change", latest => {
    setLightBulbScale(latest);
  });

  useEffect(() => {
    if (!isComplete) {
      motionCircle.set(circumference);
      motionLightBulbScale.set(0);

      return;
    }

    const playbackCircle = animate(motionCircle, 0, {
      ease: "linear",
      duration: 0.75
    });
    const playbackLightBulb = animate(motionLightBulbScale, 1, {
      ease: "linear",
      duration: 0.5,
      delay: 0.5
    });

    return () => {
      playbackCircle.stop();
      playbackLightBulb.stop();
    };
  }, [circumference, isComplete, motionCircle, motionLightBulbScale]);

  const lightBulbSize = useMemo(() => {
    if (resolvedSize <= 0) {
      return 0;
    }

    // Above the reference size the bulb grows much slower than the circle
    const ratio = lightBulbScaleReferenceSize / resolvedSize;

    return Math.min(
      resolvedSize,
      resolvedSize * 0.28 * ratio ** (ratio >= 1 ? 0.840625 : 0.9)
    );
  }, [resolvedSize]);
  const lightBulbOffset = (diameter - lightBulbSize) / 2;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      strokeWidth={strokeWidth}>
      {isComplete && (
        <>
          {!isSmall && (
            <Circle
              cx={outerRadius}
              cy={outerRadius}
              r={innerRadius}
              fill="transparent"
              stroke={color}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}

          <G
            transform={`translate(12 12) scale(${lightBulbScale}) translate(-12 -12)`}>
            <Lightbulb
              size={isSmall ? diameter : lightBulbSize}
              variant={isSmall ? "filled" : "bold"}
              x={isSmall ? 0 : lightBulbOffset}
              y={isSmall ? 0 : lightBulbOffset}
              color={color}
            />
          </G>
        </>
      )}
    </Svg>
  );
};

Icon.displayName = "DiscoveryCircle";

export const DiscoveryCircle = memo<DiscoveryCircleProps>(themedIcon(Icon));
