import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { GrapeCell, type GrapeCellVariant } from '@/components/grape-cell';

interface GrapeBunchProps {
  shape: number[];
  filledCount: number;
  cellSize: number;
  gap?: number;
  rowGap?: number;
  variant?: GrapeCellVariant;
  interactive?: boolean;
  onChangeFilled?: (count: number) => void;
  stagger?: boolean;
  showStem?: boolean;
}

export function GrapeBunch({
  shape,
  filledCount,
  cellSize,
  gap,
  rowGap,
  variant = 'interactive',
  interactive = false,
  onChangeFilled,
  stagger = false,
  showStem = false,
}: GrapeBunchProps) {
  const cellGap = gap ?? Math.round(cellSize * 0.22);
  // Design row spacing = the bunch's flex-column `gap` plus each row's own
  // `margin-top:-2px` (the two combine in CSS rather than replacing one
  // another): hero net 6-2=4, interactive net 7-2=5. The small "dot" variant
  // (list rows, archive cards, previews) has no per-row margin, so its net
  // spacing is just the column gap, matching the horizontal cell gap.
  const rowSpacing = rowGap ?? (variant === 'dot' ? cellGap : variant === 'interactive' ? 5 : 4);
  // The stem sits above row 1 the same way row 1 sits above row 2 — under
  // the same column gap — except the "interactive" (bunch detail) design
  // gives the stem an extra bit of its own room, worth ~40% more than the
  // row-to-row gap. Scaling off `rowSpacing` (rather than a flat px value)
  // keeps this consistent even as cellSize/gap shrink for a large bunch.
  const stemSpacing = variant === 'interactive' ? rowSpacing * 1.4 : rowSpacing;
  const rowStarts = shape.reduce<number[]>((starts, len, i) => {
    starts.push(i === 0 ? 0 : starts[i - 1] + shape[i - 1]);
    return starts;
  }, []);

  return (
    <View style={styles.column}>
      {showStem && <Stem size={cellSize} />}
      {shape.map((rowLength, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.row,
            { gap: cellGap, marginTop: rowIndex === 0 ? (showStem ? stemSpacing : 0) : rowSpacing },
          ]}>
          {Array.from({ length: rowLength }, (_, i) => {
            const cellIndex = rowStarts[rowIndex] + i;
            const filled = cellIndex < filledCount;
            return (
              <GrapeCell
                key={cellIndex}
                filled={filled}
                size={cellSize}
                variant={variant}
                popDelay={stagger ? cellIndex * 18 : 0}
                onPress={
                  interactive
                    ? () => onChangeFilled?.(filled ? cellIndex : cellIndex + 1)
                    : undefined
                }
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Stem({ size }: { size: number }) {
  return (
    <View style={styles.stemWrap}>
      <View
        style={[
          styles.leaf,
          { width: size * 0.76, height: size * 0.32, backgroundColor: Colors.leaf },
        ]}
      />
      <View style={[styles.stem, { height: size * 0.42, backgroundColor: Colors.stem }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stemWrap: {
    alignItems: 'center',
  },
  leaf: {
    borderRadius: 999,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ rotate: '-14deg' }],
    marginBottom: -2,
  },
  stem: {
    width: 3,
    borderRadius: 2,
  },
});
