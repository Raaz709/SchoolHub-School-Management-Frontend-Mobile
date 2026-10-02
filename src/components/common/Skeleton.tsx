import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../../theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** `animate-pulse rounded-lg bg-line-soft` from the web client. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = theme.borderRadius.lg,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.lineSoft,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** A stack of shimmering lines standing in for a paragraph. */
export function SkeletonText({
  lines = 3,
  lineHeight = 14,
  gap = theme.spacing[2],
  style,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '66%' : '100%'}
          style={{ marginBottom: index === lines - 1 ? 0 : gap }}
        />
      ))}
    </Animated.View>
  );
}

/** Placeholder for a card whose content is still loading. */
export function SkeletonCard({ height = 132, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton height={height} borderRadius={theme.borderRadius['2xl']} style={style} />;
}
