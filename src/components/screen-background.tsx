import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, gradientBackground } from '@/constants/theme';

interface ScreenBackgroundProps {
  children: ReactNode;
  variant?: 'gradient' | 'hero';
  style?: StyleProp<ViewStyle>;
}

export function ScreenBackground({ children, variant = 'gradient', style }: ScreenBackgroundProps) {
  return (
    <View
      style={[
        styles.fill,
        gradientBackground(variant === 'hero' ? Colors.heroGradient : Colors.bgGradient),
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: Colors.bgTop,
  },
});
