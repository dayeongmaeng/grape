import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';

import { Button } from '@/components/button';
import { GrapeBunch } from '@/components/grape-bunch';
import { HeaderBar } from '@/components/header-bar';
import { ScreenBackground } from '@/components/screen-background';
import { StatTile } from '@/components/stat-tile';
import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { generateFittedBunch } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * A past harvest snapshot — always starts out fully filled (that's what a
 * harvest means), independent of whatever the live source bunch is doing
 * now (it may have reset for a new cycle, or been deleted entirely). Never
 * reads/writes the source `Bunch`.
 *
 * Tapping a grape here can only ever *reduce* the count (every cell starts
 * filled, so there's nothing emptier to tap "up" into) — any such correction
 * un-harvests it: the Harvest record is replaced by a fresh, active `Bunch`
 * at the corrected fill count, and this screen hands off to that bunch's
 * own detail page.
 */
export default function HarvestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { harvests, deleteHarvest, recallHarvest } = useGrapeStore();
  const harvest = harvests.find((h) => h.id === id);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fit = useMemo(
    () =>
      generateFittedBunch(harvest?.count ?? 0, cardSize.width - Spacing.lg * 2, cardSize.height - Spacing.lg * 2, 33, 8, 5),
    [harvest?.count, cardSize.width, cardSize.height],
  );

  if (!harvest) return null;

  const onCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCardSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const onChangeFilled = async (count: number) => {
    if (count >= harvest.count) return; // still fully filled — nothing to undo
    const restored = await recallHarvest(harvest.id, count);
    if (restored) router.replace(`/bunch/${restored.id}`);
  };

  const confirmedDelete = () => {
    setConfirmDelete(false);
    deleteHarvest(harvest.id);
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <HeaderBar
          title={harvest.name}
          subtitle={`${formatDate(harvest.harvestedAt)} 수확`}
          onBack={() => router.back()}
          right={
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} style={styles.deleteBtn}>
              <Trash2 size={18} color={Colors.textTertiary} />
            </Pressable>
          }
        />

        <View style={styles.stats}>
          <StatTile label="채운 알" value={`${harvest.count}알`} emphasis align="center" labelSize={FontSize.sm} />
          <StatTile label="수확일" value={formatDate(harvest.harvestedAt)} align="center" labelSize={FontSize.sm} />
        </View>

        <View style={styles.bunchCard} onLayout={onCardLayout}>
          {cardSize.width > 0 && cardSize.height > 0 && (
            <GrapeBunch
              shape={fit.shape}
              filledCount={harvest.count}
              cellSize={fit.cellSize}
              gap={fit.gap}
              rowGap={fit.rowGap}
              variant="interactive"
              showStem
              interactive
              onChangeFilled={onChangeFilled}
            />
          )}
          <Text style={styles.hint}>알을 눌러 되돌리면 다시 채우는 송이로 돌아가요</Text>
        </View>
      </SafeAreaView>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>수확 기록 삭제</Text>
            <Text style={styles.modalMessage}>
              '{harvest.name}' 수확 기록을 삭제할까요?{'\n'}되돌릴 수 없어요.
            </Text>
            <View style={styles.modalActions}>
              <Button label="취소" variant="outline" style={styles.modalButton} onPress={() => setConfirmDelete(false)} />
              <Button
                label="삭제"
                variant="solid"
                style={styles.modalButton}
                textColor={Colors.textDanger}
                onPress={confirmedDelete}
              />
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
