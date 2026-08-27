import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { MINI_BUNCH_SHAPE, scaleToMiniFilled } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

export default function HomeScreen() {
  const { bunches } = useGrapeStore();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>송이</Text>
            <Text style={styles.title}>포도송이 {bunches.length}개</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <View style={styles.hamburger}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
            {/*<Text style={styles.settingsLabel}>설정</Text>*/}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {bunches.map((item) => {
            const pct = Math.min(1, item.filled / item.total);
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/bunch/${item.id}`)}>
                <View style={styles.mini}>
                  <GrapeBunch
                    shape={MINI_BUNCH_SHAPE}
                    filledCount={scaleToMiniFilled(item.filled, item.total)}
                    cellSize={8}
                    gap={3}
                    variant="dot"
                    showStem
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {item.detail}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                  </View>
                </View>
                <View style={styles.countCol}>
                  <Text style={styles.count}>{item.filled}</Text>
                  <Text style={styles.total}>/ {item.total}</Text>
                </View>
              </Pressable>
            );
          })}

          <Pressable style={styles.newCard} onPress={() => router.push('/bunch/new')}>
            <Text style={styles.newCardLabel}>+ 새 포도송이 만들기</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md + 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceStrong,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  hamburger: {
    gap: 2.5,
  },
  hamburgerLine: {
    width: 11,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: Colors.textSecondary,
  },
  settingsLabel: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg - 2,
  },
  mini: {
    width: 56,
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  progressTrack: {
    height: 2,
    borderRadius: 2,
    backgroundColor: Colors.surfaceStrong,
    marginTop: Spacing.sm + 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple400,
  },
  countCol: {
    alignItems: 'flex-end',
  },
  count: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.md,
    color: Colors.gold,
  },
  total: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xxs,
    color: Colors.textSecondary,
  },
  newCard: {
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.dashedBorder,
    padding: Spacing.md + 3,
    alignItems: 'center',
  },
  newCardLabel: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
});
