import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { MINI_BUNCH_SHAPE } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ArchiveScreen() {
  const { harvests } = useGrapeStore();
  const totalGrapes = useMemo(() => harvests.reduce((sum, h) => sum + h.count, 0), [harvests]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>보관함</Text>
          <Text style={styles.title}>수확한 포도송이 {harvests.length}개</Text>
          <Text style={styles.subtitle}>지금까지 채운 알 {totalGrapes}개</Text>
        </View>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {harvests.map((item) => (
            // Routes to the harvest's own read-only detail view (by harvest
            // id, not the source bunch) — the source bunch resets to empty
            // right when it's harvested, so it can't show what was picked.
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/harvest/${item.id}`)}>
              <GrapeBunch shape={MINI_BUNCH_SHAPE} filledCount={14} cellSize={11} gap={3.5} variant="dot" showStem />
              <View style={styles.cardText}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.count}알 · {formatDate(item.harvestedAt)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  subtitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xxs,
  },
  grid: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    width: '47%',
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardText: {
    alignItems: 'center',
  },
  cardName: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  cardMeta: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
});
