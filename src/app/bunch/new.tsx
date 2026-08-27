import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Radius, Spacing } from '@/constants/theme';
import { generateBunchShape } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

const MEANING_PRESETS = ['30분 연습', '1챕터', '1회'];
const SIZE_PRESETS = [12, 24, 30];
const PERIOD_PRESETS = [14, 30];
const CUSTOM = 3;
const CUSTOM_PERIOD = 2;
const NO_DEADLINE = 3;
const PREVIEW_MAX_ROWS = 5;
const PERIOD_LABELS = ['2주', '한 달', '직접', '기간 없음'];

export default function NewBunchScreen() {
  const { addBunch } = useGrapeStore();

  const [name, setName] = useState('');
  const [meaningIndex, setMeaningIndex] = useState(0);
  const [customMeaning, setCustomMeaning] = useState('');

  const [sizeIndex, setSizeIndex] = useState(1);
  const [customSize, setCustomSize] = useState(40);

  const [periodIndex, setPeriodIndex] = useState(1);
  const [customDays, setCustomDays] = useState(60);

  const total = sizeIndex === CUSTOM ? customSize : SIZE_PRESETS[sizeIndex];
  const periodDays =
    periodIndex === CUSTOM_PERIOD ? customDays : periodIndex === NO_DEADLINE ? 0 : PERIOD_PRESETS[periodIndex];
  const unitLabel = meaningIndex === CUSTOM ? customMeaning : MEANING_PRESETS[meaningIndex];

  const paceText = useMemo(() => {
    if (!periodDays) return '천천히, 마감 없이';
    const perDay = total / periodDays;
    return perDay >= 1 ? `하루 ${perDay.toFixed(1)}알` : `약 ${(periodDays / total).toFixed(1)}일에 한 알`;
  }, [total, periodDays]);

  const previewShape = useMemo(() => generateBunchShape(total), [total]);
  const previewRows = previewShape.slice(0, PREVIEW_MAX_ROWS);
  const previewShown = previewRows.reduce((a, b) => a + b, 0);
  const previewRest = total - previewShown;

  const canSave = name.trim().length > 0 && total > 0;

  const save = () => {
    if (!canSave) return;
    addBunch({ name: name.trim(), unitLabel, total, periodDays });
    router.back();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.topBarSide}>닫기</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>새 송이</Text>
          <Pressable onPress={save} disabled={!canSave}>
            <Text style={[styles.topBarSave, !canSave && styles.topBarSaveDisabled]}>저장</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={styles.label}>무엇을 반복하나요</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="예: 바이올린 연습"
                placeholderTextColor={Colors.textTertiary}
                style={styles.nameInput}
              />
            </View>

            <View>
              <Text style={styles.label}>한 알의 의미</Text>
              <View style={styles.chipRow}>
                {[...MEANING_PRESETS, '직접 입력'].map((label, i) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={meaningIndex === i}
                    onPress={() => setMeaningIndex(i)}
                    shape="block"
                    flex
                  />
                ))}
              </View>
              {meaningIndex === CUSTOM && (
                <TextInput
                  value={customMeaning}
                  onChangeText={setCustomMeaning}
                  placeholder="예: 20분 연습, 1세트, 한 편"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.customInput}
                />
              )}
            </View>

            <View>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>송이 크기</Text>
                <Text style={styles.labelValue}>{total}알</Text>
              </View>
              <View style={styles.chipRow}>
                {[...SIZE_PRESETS.map(String), '직접'].map((label, i) => (
                  <Chip
                    key={label}
                    label={i === SIZE_PRESETS.length ? label : `${label}알`}
                    selected={sizeIndex === i}
                    onPress={() => setSizeIndex(i)}
                    shape="block"
                    tone="gold"
                    flex
                  />
                ))}
              </View>
              {sizeIndex === CUSTOM && (
                <Stepper
                  label="직접 입력"
                  helper="1 ~ 1000알"
                  value={customSize}
                  onChange={(v) => setCustomSize(Math.max(1, Math.min(1000, v)))}
                />
              )}
            </View>

            <View>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>채우는 기간</Text>
                <Text style={styles.labelValueMuted}>{paceText}</Text>
              </View>
              <View style={styles.chipRow}>
                {['2주', '한 달', '직접', '기간 없음'].map((label, i) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={periodIndex === i}
                    onPress={() => setPeriodIndex(i)}
                    shape="block"
                    tone="gold"
                    flex
                  />
                ))}
              </View>
              {periodIndex === CUSTOM_PERIOD && (
                <Stepper
                  label="직접 입력"
                  helper="1 ~ 1000일"
                  value={customDays}
                  onChange={(v) => setCustomDays(Math.max(1, Math.min(1000, v)))}
                  suffix="일"
                  compact
                />
              )}
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>
                미리보기 · {total}알 · {PERIOD_LABELS[periodIndex]}
                {previewRest > 0 ? ` (외 ${previewRest}알)` : ''}
              </Text>
              <GrapeBunch shape={previewRows} filledCount={0} cellSize={13} gap={4} variant="dot" />
            </View>

            <Button label="송이 심기" onPress={save} disabled={!canSave} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Stepper({
  label,
  helper,
  value,
  onChange,
  suffix,
  compact,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.stepper, compact && styles.stepperCompact]}>
      <View style={styles.stepperText}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperHelper}>{helper}</Text>
      </View>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(value - 1)}>
        <Text style={styles.stepperBtnLabel}>−</Text>
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')) || 0)}
        keyboardType="numeric"
        style={styles.stepperValue}
      />
      <Pressable style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
        <Text style={styles.stepperBtnLabel}>+</Text>
      </Pressable>
      {suffix && <Text style={styles.stepperSuffix}>{suffix}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  topBarSide: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  topBarTitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  topBarSave: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.gold,
  },
  topBarSaveDisabled: {
    color: Colors.textDisabled,
  },
  scroll: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md + 2,
  },
  label: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  labelValue: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.xs,
    color: Colors.gold,
  },
  labelValueMuted: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInput: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderStrong,
    paddingBottom: Spacing.sm + 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  customInput: {
    marginTop: Spacing.sm + 1,
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceStrong,
    borderWidth: 1,
    borderColor: 'rgba(123,79,196,0.55)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md - 1,
    paddingHorizontal: Spacing.md + 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm + 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md + 2,
  },
  stepperCompact: {
    gap: Spacing.sm + 2,
  },
  stepperText: {
    flex: 1,
  },
  stepperLabel: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  stepperHelper: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xxs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnLabel: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  stepperValue: {
    width: 60,
    textAlign: 'center',
    fontFamily: Fonts.serif,
    fontSize: FontSize.xl,
    color: Colors.gold,
    backgroundColor: Colors.surfaceStrong,
    borderWidth: 1,
    borderColor: 'rgba(232,201,138,0.35)',
    borderRadius: Radius.sm,
    paddingVertical: 5,
  },
  stepperSuffix: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  previewCard: {
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  previewLabel: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xxs,
  },
});
