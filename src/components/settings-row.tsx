import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';

interface SettingsRowProps {
  label: string;
  sublabel?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export function SettingsRow({
  label,
  sublabel,
  right,
  onPress,
  disabled,
  danger,
  divider = true,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.textCol}>
        <Text style={[styles.label, disabled && styles.disabledText, danger && styles.dangerText]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {content}
    </Pressable>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xxs + 0.5,
    color: Colors.textTertiary,
    letterSpacing: 1.6,
    marginHorizontal: 4,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  sublabel: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  disabledText: {
    color: Colors.textDisabled,
  },
  dangerText: {
    color: Colors.textDanger,
  },
});
