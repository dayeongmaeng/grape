import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { StatTile } from '@/components/stat-tile';
import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';
import { generateFittedBunch } from '@/constants/grape-shapes';
import { longestStreak } from '@/lib/stats';
import { useGrapeStore } from '@/store/grape-store';

// Vertical space the title/subtitle block below the grapes takes, reserved
// so a large bunch's cell size is computed against the room actually left.
const TITLE_RESERVE = 90;

export default function CompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBunch, harvests, addHarvest, addBunch } = useGrapeStore();
  // Snapshot the bunch on entry: it is archived (and removed from the store)
  // automatically below, so it can't be read live for the rest of the screen.
  const [bunch] = useState(() => getBunch(id));
  // "완성 송이" count is frozen too — addHarvest grows `harvests` mid-screen.
  const [harvestCount] = useState(() => harvests.length + 1);
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });

  // Reaching this screen means the bunch is full, so archive it right away —
  // a completed bunch is never left sitting full in the active list even if
  // the user reloads or leaves without choosing. The buttons below only
  // navigate or start a new cycle; they no longer archive.
  const archived = useRef(false);
  useEffect(() => {
    if (!bunch || archived.current) return;
    archived.current = true;
    void addHarvest(bunch);
  }, [bunch, addHarvest]);

  // Direct reload of this route after the archive already happened: nothing
  // to show, so send the user to where the record now lives.
  useEffect(() => {
    if (!bunch) router.replace('/(tabs)/archive');
  }, [bunch]);

  const fit = useMemo(
    () => generateFittedBunch(bunch?.total ?? 0, heroSize.width, heroSize.height - TITLE_RESERVE, 32, 7, 4),
    [bunch?.total, heroSize.width, heroSize.height],
  );

  if (!bunch) return null;

  const onHeroLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setHeroSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const startedAt = new Date(bunch.createdAt).getTime();
  const completedAt = new Date(bunch.completedAt ?? bunch.createdAt).getTime();
  const days = Math.max(1, Math.round((completedAt - startedAt) / 86400000));

  // The harvest is already saved. "다시 심기" starts a fresh empty bunch with
  // the same settings; "보관함에서 확인하기" only moves to the archive.
  const replant = () => {
    void addBunch({
      name: bunch.name,
      unitLabel: bunch.unitLabel,
      total: bunch.total,
      periodDays: bunch.periodDays,
    });
    router.replace('/(tabs)');
  };

  const seeHarvest = () => {
    router.replace('/(tabs)/archive');
  };

  return (
    <ScreenBackground variant="hero">
      <SafeAreaView style={styles.safe}>
        <Text style={styles.eyebrow}>GRAPE COMPLETE</Text>

        <View style={styles.hero} onLayout={onHeroLayout}>
          {heroSize.width > 0 && heroSize.height > 0 && (
            <GrapeBunch
              shape={fit.shape}
              filledCount={bunch.total}
              cellSize={fit.cellSize}
              gap={fit.gap}
              rowGap={fit.rowGap}
              variant="hero"
              showStem
              stagger
            />
          )}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{bunch.name} 한 송이 완성</Text>
            <Text style={styles.subtitle}>
              {bunch.total}알을 다 채우는 데 {days}일
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatTile
            label="최장 연속"
            value={`${longestStreak(bunch.fillDates)}일`}
            emphasis
            align="center"
            labelSize={FontSize.sm}
          />
          <StatTile label="채운 알" value={`${bunch.total}알`} align="center" labelSize={FontSize.sm} />
          <StatTile label="완성 송이" value={`${harvestCount}`} align="center" labelSize={FontSize.sm} />
        </View>

        <View style={styles.actions}>
          <Button label="같은 송이 다시 심기" onPress={replant} />
          <Button label="보관함에서 확인하기" variant="outline" onPress={seeHarvest} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.md,
    color: Colors.gold,
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xxl + 2,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  actions: {
    gap: Spacing.sm,
  },
});
