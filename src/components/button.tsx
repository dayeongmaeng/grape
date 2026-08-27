import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, FontSize, Fonts, Radius, Spacing, gradientBackground } from '@/constants/theme';

type ButtonVariant = 'primary' | 'outline' | 'solid' | 'text';

interface ButtonProps {
  label: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  backgroundColor?: string;
  textColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  backgroundColor,
  textColor,
  disabled,
  style,
}: ButtonProps) {
  const resolvedBg =
    backgroundColor ?? (variant === 'solid' ? Colors.surface : undefined);
  const resolvedText =
    textColor ?? (variant === 'primary' ? Colors.white : variant === 'text' ? Colors.textSecondary : Colors.textPrimary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'text' && styles.text,
        variant === 'solid' && { backgroundColor: resolvedBg },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, { color: resolvedText }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    ...gradientBackground(Colors.primaryGradient),
    boxShadow: `0 6px 20px ${'rgba(123,79,196,0.4)'}`,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  text: {
    paddingVertical: Spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.md,
  },
});
