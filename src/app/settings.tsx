import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/header-bar';
import { ScreenBackground } from '@/components/screen-background';
import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { ToggleSwitch } from '@/components/toggle-switch';
import { Colors, FontSize, Fonts, Radius, Spacing, gradientBackground } from '@/constants/theme';
import { useGrapeStore } from '@/store/grape-store';

export default function SettingsScreen() {
  const { settings, updateSettings, guest, logout } = useGrapeStore();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <HeaderBar title="설정" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.profile}>
            <View style={styles.avatar} />
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{guest ? '게스트' : '지수'}</Text>
              <Text style={styles.profileEmail}>
                {guest ? '로그인하면 기록이 안전하게 보관돼요' : 'jisoo@example.com'}
              </Text>
            </View>
            {!guest && <Text style={styles.editLink}>편집</Text>}
          </View>

          <SettingsSection title="알림">
            <SettingsRow
              label="매일 리마인더"
              sublabel="아직 안 채운 날 저녁에 알림"
              right={
                <ToggleSwitch
                  value={settings.dailyReminder}
                  onValueChange={(v) => updateSettings({ dailyReminder: v })}
                />
              }
            />
            <SettingsRow
              label="알림 시간"
              right={<Text style={styles.goldValue}>{settings.reminderTime}</Text>}
              divider={false}
            />
          </SettingsSection>

          <SettingsSection title="포도알">
            <SettingsRow
              label="채울 때 소리"
              right={
                <ToggleSwitch
                  value={settings.fillSound}
                  onValueChange={(v) => updateSettings({ fillSound: v })}
                />
              }
              divider={false}
            />
          </SettingsSection>

          <SettingsSection title="데이터 · 정보">
            <SettingsRow label="데이터 백업" disabled right={<Badge label="준비 중" />} />
            <SettingsRow label="기록 내보내기" disabled right={<Badge label="준비 중" />} />
            <SettingsRow label="문의하기" />
            <SettingsRow label="버전" right={<Text style={styles.mutedValue}>1.0.2</Text>} divider={false} />
          </SettingsSection>

          <SettingsSection title=" ">
            <SettingsRow label="로그아웃" onPress={logout} />
            <SettingsRow label="회원탈퇴" danger divider={false} />
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg + 2,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md + 2,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 1,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg - 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    ...gradientBackground(Colors.grapeHeroGradient),
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: Fonts.sansMedium,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  editLink: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.xs,
    color: Colors.gold,
  },
  goldValue: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.base,
    color: Colors.gold,
  },
  mutedValue: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  badge: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
  },
  badgeLabel: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xxs,
    color: Colors.textDisabled,
  },
});
