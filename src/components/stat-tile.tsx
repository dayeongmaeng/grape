import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';

interface StatTileProps {
  label: string;
  value: string;
  emphasis?: boolean;
  align?: 'left' | 'center';
  labelSize?: number;
}

export function StatTile({ label, value, emphasis = false, align = 'left', labelSize }: StatTileProps) {
  return (
    <View style={[styles.tile, align === 'center' && styles.center]}>
      <Text style={[styles.label, labelSize != null && { fontSize: labelSize }]}>{label}</Text>
      <Text style={[styles.value, emphasis && styles.emphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  center: {
    alignItems: 'center',
  },
  label: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  value: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.xxs,
  },
  emphasis: {
    color: Colors.gold,
  },
});
