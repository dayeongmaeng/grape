import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { Colors, gradientBackground } from '@/constants/theme';

export type GrapeCellVariant = 'interactive' | 'hero' | 'dot';

interface GrapeCellProps {
  filled: boolean;
  size: number;
  variant?: GrapeCellVariant;
  onPress?: () => void;
  popDelay?: number;
}

function popKeyframe(delayMs: number) {
  'worklet';
  return new Keyframe({
    0: { transform: [{ scale: 0.4 }], opacity: 0 },
    60: { transform: [{ scale: 1.12 }], opacity: 1 },
    100: { transform: [{ scale: 1 }], opacity: 1 },
  })
    .duration(320)
    .delay(delayMs);
}

function GrapeCellInner({ filled, size, variant = 'interactive', onPress, popDelay = 0 }: GrapeCellProps) {
  const cell = (
    <View style={[styles.cell, { width: size, height: size }]}>
      {!filled && (
        <View
          style={[
            styles.empty,
            {
              borderRadius: size / 2,
              backgroundColor: Colors.grapeEmptyBg,
              borderColor: Colors.grapeEmptyBorder,
              borderWidth: variant === 'dot' ? StyleSheet.hairlineWidth : 1,
            },
          ]}
        />
      )}
      {filled && (
        <Animated.View
          // reanimated's web "entering" animation clones the element into a
          // temporary fixed-position overlay for the transition; if that
          // overlay's cleanup gets interrupted by a fast navigate-away (e.g.
          // opening bunch detail and going back), the ghost copy is left
          // behind at its old on-screen position. Native's implementation
          // doesn't have this failure mode, so only animate there.
          entering={Platform.OS === 'web' ? undefined : popKeyframe(popDelay)}
          style={[
            styles.filled,
            {
              borderRadius: size / 2,
              ...gradientBackground(
                variant === 'hero'
                  ? Colors.grapeHeroGradient
                  : variant === 'dot'
                    ? Colors.grapeDotGradient
                    : Colors.grapeGlowGradient,
              ),
              boxShadow:
                variant === 'dot'
                  ? undefined
                  : `0 0 ${size * 0.4}px ${variant === 'hero' ? Colors.grapeHeroShadow : Colors.grapeGlowShadow}`,
            },
          ]}>
          {variant !== 'dot' && (
            <View
              style={[
                styles.highlight,
                {
                  top: size * 0.18,
                  left: size * 0.23,
                  width: size * 0.22,
                  height: size * 0.16,
                  borderRadius: size * 0.11,
                },
              ]}
            />
          )}
        </Animated.View>
      )}
    </View>
  );

  if (!onPress) return cell;

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {cell}
    </Pressable>
  );
}

export const GrapeCell = memo(GrapeCellInner);

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...StyleSheet.absoluteFill,
  },
  filled: {
    ...StyleSheet.absoluteFill,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: Colors.grapeHighlight,
    transform: [{ rotate: '-25deg' }],
  },
});
