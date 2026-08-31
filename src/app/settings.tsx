import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { HeaderBar } from '@/components/header-bar';
import { ScreenBackground } from '@/components/screen-background';
import { SettingsRow, SettingsSection } from '@/components/settings-row';
import { Colors, FontSize, Fonts, Radius, Spacing, gradientBackground } from '@/constants/theme';
import { useGrapeStore } from '@/store/grape-store';

const PRIVACY_URL = 'https://grape.kkori.co.kr/privacy';
const TERMS_URL = 'https://grape.kkori.co.kr/terms';

const PROVIDER_LABEL: Record<string, string> = {
  GUEST: '게스트',
  GOOGLE: '구글 로그인',
  KAKAO: '카카오 로그인',
};

export default function SettingsScreen() {
  const { user, guest, logout, deleteAccount } = useGrapeStore();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const providerLabel = PROVIDER_LABEL[user?.provider ?? ''] ?? (guest ? '게스트' : '로그인');
  const displayName = user?.nickname?.trim() || (guest ? '게스트' : '포도알');

  const onWithdraw = async () => {
    setWithdrawing(true);
    const ok = await deleteAccount();
    setWithdrawing(false);
    setConfirmWithdraw(false);
    // On success the auth guard in _layout.tsx sends us back to /login as isAuthenticated flips.
    if (!ok) {
      Alert.alert('회원탈퇴 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <HeaderBar title="설정" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.profile}>
            <View style={styles.avatar} />
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{providerLabel}</Text>
            </View>
          </View>

          <SettingsSection title="정보">
            <SettingsRow label="문의하기" />
            <SettingsRow
              label="개인정보처리방침"
              onPress={() => Linking.openURL(PRIVACY_URL)}
            />
            <SettingsRow label="이용약관" onPress={() => Linking.openURL(TERMS_URL)} />
            <SettingsRow label="버전" right={<Text style={styles.mutedValue}>1.0.0</Text>} divider={false} />
          </SettingsSection>

          <SettingsSection title=" ">
            {guest ? (
              <SettingsRow
                label="로그인하고 데이터 저장하기"
                sublabel="게스트 기록을 계정에 안전하게 보관해요"
                divider={false}
                onPress={() => router.push('/login')}
              />
            ) : (
              <>
                <SettingsRow label="로그아웃" onPress={logout} />
                <SettingsRow
                  label="회원탈퇴"
                  danger
                  divider={false}
                  onPress={() => setConfirmWithdraw(true)}
                />
              </>
            )}
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={confirmWithdraw}
        transparent
        animationType="fade"
        onRequestClose={() => (withdrawing ? undefined : setConfirmWithdraw(false))}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => (withdrawing ? undefined : setConfirmWithdraw(false))}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>회원탈퇴</Text>
            <Text style={styles.modalMessage}>
              계정을 삭제하면 모든 포도송이와 수확 기록이 함께 삭제되고 되돌릴 수 없어요.
            </Text>
            <View style={styles.modalActions}>
              <Button
                label="취소"
                variant="outline"
                style={styles.modalButton}
                disabled={withdrawing}
                onPress={() => setConfirmWithdraw(false)}
              />
              <Button
                label={withdrawing ? '처리 중…' : '탈퇴'}
                variant="solid"
                style={styles.modalButton}
                textColor={Colors.textDanger}
                disabled={withdrawing}
                onPress={onWithdraw}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
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
