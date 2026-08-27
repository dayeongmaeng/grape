import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';

type ChipShape = 'pill' | 'block';
type ChipTone = 'purple' | 'gold';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  shape?: ChipShape;
  tone?: ChipTone;
  flex?: boolean;
}

export function Chip({ label, selected, onPress, shape = 'pill', tone = 'purple', flex = false }: ChipProps) {
  const selectedBg = tone === 'purple' ? Colors.purple500 : 'rgba(232,201,138,0.14)';
  const selectedBorder = tone === 'purple' ? Colors.purple500 : 'rgba(232,201,138,0.5)';
  const selectedText = tone === 'purple' ? Colors.white : Colors.gold;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        shape === 'pill' ? styles.pill : styles.block,
        flex && styles.flex,
        {
          backgroundColor: selected ? selectedBg : Colors.surface,
          borderColor: selected ? selectedBorder : Colors.border,
        },
      ]}>
      <Text
        style={[
          styles.label,
          shape === 'block' && styles.blockLabel,
          { color: selected ? selectedText : Colors.textSecondary },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md + 1,
    borderRadius: Radius.pill,
  },
  block: {
    paddingVertical: Spacing.md - 1,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.sm,
  },
  blockLabel: {
    fontSize: FontSize.base,
  },
});
