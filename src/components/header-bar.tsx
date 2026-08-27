import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  variant?: 'plain' | 'circle';
  right?: ReactNode;
}

export function HeaderBar({ title, subtitle, onBack, variant = 'plain', right }: HeaderBarProps) {
  return (
    <View style={styles.row}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={variant === 'circle' ? styles.circleBack : undefined}>
          <ChevronLeft
            size={variant === 'circle' ? 18 : 22}
            color={variant === 'circle' ? Colors.iconMuted : Colors.textSecondary}
          />
        </Pressable>
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  circleBack: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceIcon,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xxl - 2,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 3,
  },
});
