import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GrapeBunch } from '@/components/grape-bunch';
import { HeaderBar } from '@/components/header-bar';
import { ScreenBackground } from '@/components/screen-background';
import { StatTile } from '@/components/stat-tile';
import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { generateFittedBunch } from '@/constants/grape-shapes';
import { currentStreak, daysRemaining } from '@/lib/stats';
import { useGrapeStore } from '@/store/grape-store';
import { Trash2 } from 'lucide-react-native';

// Vertical space the hint line (plus its top margin) takes below the grapes,
// reserved so a large bunch's cell size is computed against the space
// actually left for it rather than the card's full height.
const HINT_RESERVE = 24;

export default function BunchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBunch, setFilled, deleteBunch } = useGrapeStore();
  const bunch = getBunch(id);
  const wasComplete = useRef(bunch != null && bunch.filled >= bunch.total);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!bunch) return;
    const isComplete = bunch.filled >= bunch.total;
    if (isComplete && !wasComplete.current) {
      const timer = setTimeout(() => router.replace(`/bunch/complete?id=${bunch.id}`), 420);
      return () => clearTimeout(timer);
    }
    wasComplete.current = isComplete;
  }, [bunch]);

  const fit = useMemo(
    () =>
      generateFittedBunch(
        bunch?.total ?? 0,
        cardSize.width - Spacing.lg * 2,
        cardSize.height - Spacing.lg * 2 - HINT_RESERVE,
        33,
        8,
        5,
      ),
    [bunch?.total, cardSize.width, cardSize.height],
  );

  if (!bunch) return null;

  const remaining = daysRemaining(bunch.createdAt, bunch.periodDays);
  const streak = currentStreak(bunch.fillDates);

  const onCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCardSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const confirmedDelete = () => {
    setConfirmDelete(false);
    deleteBunch(bunch.id);
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <HeaderBar
          title={bunch.name}
          subtitle={bunch.detail}
          onBack={() => router.back()}
          // variant="circle"
          right={
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} style={styles.deleteBtn}>
              <Trash2 size={18} color={Colors.textTertiary} />
            </Pressable>
          }
        />

        <View style={styles.stats}>
          <StatTile label="채운 알" value={`${bunch.filled} / ${bunch.total}`} emphasis labelSize={FontSize.sm} />
          <StatTile
            label="남은 기간"
            value={remaining === null ? '기간 없음' : `${remaining}일`}
            labelSize={FontSize.sm}
          />
          <StatTile label="연속" value={`${streak}일`} labelSize={FontSize.sm} />
        </View>

        <View style={styles.bunchCard} onLayout={onCardLayout}>
          {cardSize.width > 0 && cardSize.height > 0 && (
            <GrapeBunch
              shape={fit.shape}
              filledCount={bunch.filled}
              cellSize={fit.cellSize}
              gap={fit.gap}
              rowGap={fit.rowGap}
              variant="interactive"
              showStem
              interactive
              onChangeFilled={(count) => setFilled(bunch.id, count)}
            />
          )}
          <Text style={styles.hint}>알을 눌러 직접 채우거나 지울 수 있어요</Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="오늘 한 알 채우기"
            onPress={() => setFilled(bunch.id, Math.min(bunch.total, bunch.filled + 1))}
            disabled={bunch.filled >= bunch.total}
          />
        </View>
      </SafeAreaView>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>송이 삭제</Text>
            <Text style={styles.modalMessage}>
              '{bunch.name}' 송이를 삭제할까요?{'\n'}채운 기록을 포함해 되돌릴 수 없어요.
            </Text>
            <View style={styles.modalActions}>
              <Button label="취소" variant="outline" style={styles.modalButton} onPress={() => setConfirmDelete(false)} />
              <Button label="삭제" variant="solid" style={styles.modalButton} textColor={Colors.textDanger} onPress={confirmedDelete} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
  },
  bunchCard: {
    flex: 1,
    margin: Spacing.xl,
    marginBottom: Spacing.md,
    borderRadius: Radius.huge,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  hint: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9,6,15,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.huge,
    backgroundColor: Colors.bgBottom,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  modalMessage: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
