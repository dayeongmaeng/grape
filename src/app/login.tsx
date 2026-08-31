import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';
import { LOGO_BUNCH_SHAPE } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

export default function LoginScreen() {
  const { isAuthenticated, isLoading, guest, loginContinue, loginAsGuest } = useGrapeStore();
  // The _layout guard (`!isAuthenticated || guest`) lets a guest open this from the settings CTA,
  // but can't route them back out (guest→guest doesn't change it), so we navigate away here.
  // Not on mount, though: only once a login/guest action started *here* has settled (`attempted`),
  // or once we're fully signed in (`!guest`).
  const attempted = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && (attempted.current || !guest)) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, guest]);

  const run = (action: () => void) => {
    attempted.current = true;
    action();
  };

  // Already a guest (opened this screen from the settings CTA) and choosing "guest" again:
  // just go back — don't hit /api/auth/guest again, which would spin up a *new* guest account
  // and orphan the current one's data.
  const continueAsGuest = () => {
    if (guest) {
      router.replace('/');
      return;
    }
    run(loginAsGuest);
  };

  return (
    <ScreenBackground variant="hero">
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <GrapeBunch
            shape={LOGO_BUNCH_SHAPE}
            filledCount={LOGO_BUNCH_SHAPE.reduce((a, b) => a + b, 0)}
            cellSize={26}
            variant="hero"
            showStem
            stagger
          />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>포도알 채우기</Text>
            <Text style={styles.subtitle}>
              반복하는 무엇이든 한 알씩.{'\n'}연습, 다회독, 운동, 공부까지
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Google로 계속하기"
            variant="solid"
            backgroundColor={Colors.google}
            textColor={Colors.googleText}
            onPress={() => run(() => loginContinue('google'))}
          />
          <Button
            label="카카오로 계속하기"
            variant="solid"
            backgroundColor={Colors.kakao}
            textColor={Colors.kakaoText}
            onPress={() => run(() => loginContinue('kakao'))}
          />
          <Button
            label={<Text style={styles.guestLabel}>로그인 없이 먼저 둘러보기</Text>}
            variant="text"
            onPress={continueAsGuest}
          />
          <Text style={styles.terms}>
            계속하면 서비스 이용약관과{'\n'}개인정보 처리방침에 동의하게 됩니다
          </Text>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.hero,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.sm,
  },
  guestLabel: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  terms: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.xxs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: Spacing.xs,
  },
});
