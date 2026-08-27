import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GrapeBunch } from '@/components/grape-bunch';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';
import { LOGO_BUNCH_SHAPE } from '@/constants/grape-shapes';
import { useGrapeStore } from '@/store/grape-store';

export default function LoginScreen() {
  const { loginContinue, loginAsGuest } = useGrapeStore();

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
            onPress={loginContinue}
          />
          <Button
            label="카카오로 계속하기"
            variant="solid"
            backgroundColor={Colors.kakao}
            textColor={Colors.kakaoText}
            onPress={loginContinue}
          />
          <Button
            label={<Text style={styles.guestLabel}>로그인 없이 먼저 둘러보기</Text>}
            variant="text"
            onPress={loginAsGuest}
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
