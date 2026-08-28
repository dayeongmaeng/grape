import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { StatTile } from '@/components/stat-tile';
import { Colors, FontSize, Fonts, Radius, Spacing, gradientBackground } from '@/constants/theme';
import { currentStreak, weeklyAverage } from '@/lib/stats';
import { useGrapeStore } from '@/store/grape-store';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

function buildMonthGrid(activityDays: Set<string>) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { key: string; inMonth: boolean; filled: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pad-${i}`, inMonth: false, filled: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = date.toISOString().slice(0, 10);
    cells.push({ key, inMonth: true, filled: activityDays.has(key) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-end-${cells.length}`, inMonth: false, filled: false });
  }
  return cells;
}

export default function RecordsScreen() {
  const { bunches, harvests } = useGrapeStore();

  // Stats span active bunches and archived harvests (archive carries a bunch's
  // fillDates into its harvest, recall restores them). Two shapes of the same
  // merge, used for different metrics — never mix them:
  //  - mergedFillDates: one entry per grape filled (duplicates kept) → grape counts
  //  - uniqueFillDays:  distinct day keys → calendar dots + streak
  const mergedFillDates = useMemo(
    () => [
      ...bunches.flatMap((b) => b.fillDates ?? []),
      ...harvests.flatMap((h) => h.fillDates ?? []),
    ],
    [bunches, harvests],
  );
  const uniqueFillDays = useMemo(() => Array.from(new Set(mergedFillDates)), [mergedFillDates]);

  const now = useMemo(() => new Date(), []);
  const monthLabel = now.getMonth() + 1;
  const monthCount = useMemo(
    () =>
      mergedFillDates.filter((d) => {
        const date = new Date(d);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }).length,
    [mergedFillDates, now],
  );

  const activityDays = useMemo(() => new Set(uniqueFillDays), [uniqueFillDays]);
  const grid = useMemo(() => buildMonthGrid(activityDays), [activityDays]);

  const streak = currentStreak(uniqueFillDays);
  const avgPerWeek = weeklyAverage(mergedFillDates);

  const statRows = useMemo(
    () =>
      [...bunches]
        .sort((a, b) => b.filled - a.filled)
        .slice(0, 5)
        .map((b) => ({ name: b.name, pct: Math.min(1, b.filled / b.total), count: b.filled })),
    [bunches],
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View>
            <Text style={styles.eyebrow}>기록</Text>
            <Text style={styles.title}>{monthLabel}월에 {monthCount}알</Text>
          </View>

          <View style={styles.heatmapCard}>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d) => (
                <Text key={d} style={styles.weekday}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {grid.map((cell) => (
                <View key={cell.key} style={styles.gridCell}>
                  {cell.inMonth && (
                    <View
                      style={[
                        styles.dot,
                        cell.filled ? gradientBackground(Colors.grapeDotGradient) : styles.dotEmpty,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatTile label="현재 연속" value={`${streak}일`} emphasis labelSize={FontSize.sm} />
            <StatTile label="주 평균" value={`${avgPerWeek.toFixed(1)}알`} labelSize={FontSize.sm} />
          </View>

          <View style={styles.perBunch}>
            <Text style={styles.perBunchTitle}>송이별</Text>
            {statRows.map((row) => (
              <View key={row.name} style={styles.statRow}>
                <Text style={styles.statName} numberOfLines={1}>
                  {row.name}
                </Text>
                <View style={styles.statTrack}>
                  <View style={[styles.statFill, { width: `${row.pct * 100}%` }]} />
                </View>
                <Text style={styles.statCount}>{row.count}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },
  eyebrow: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.display,
    color: Colors.textPrimary,
    marginTop: Spacing.xxs,
  },
  heatmapCard: {
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm + 2,
  },
  weekday: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    width: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  dot: {
    flex: 1,
    width: '100%',
    borderRadius: 999,
  },
  dotEmpty: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  perBunch: {
    gap: Spacing.md,
  },
  perBunchTitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statName: {
    width: 96,
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  statTrack: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: Colors.surfaceStrong,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    borderRadius: 4,
    ...gradientBackground(Colors.primaryGradient),
  },
  statCount: {
    width: 32,
    textAlign: 'right',
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.gold,
  },
});
