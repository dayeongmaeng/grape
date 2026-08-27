import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
  const { getBunch, harvests, harvestBunch, addHarvest, deleteBunch } = useGrapeStore();
  const bunch = getBunch(id);
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });

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

  // "다시 심기" keeps this bunch cycling: harvest + reset, stays in the
  // active list. "보관함에서 확인하기" means the user is done growing this
  // one — it still leaves the same harvest record, but the source bunch is
  // removed from the active list instead of resetting.
  const replant = () => {
    harvestBunch(bunch.id);
    router.replace('/(tabs)');
  };

  const seeHarvest = () => {
    addHarvest(bunch);
    deleteBunch(bunch.id);
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
          <StatTile label="완성 송이" value={`${harvests.length + 1}`} align="center" labelSize={FontSize.sm} />
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
