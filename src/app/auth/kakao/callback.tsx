import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';
import { escapeKakaoTalkInAppBrowser } from '@/lib/in-app-browser';
import {
  KAKAO_WEB_REDIRECT_PATH,
  consumeKakaoOauthState,
  hasPendingKakaoWebLogin,
} from '@/lib/social-auth';
import { useGrapeStore } from '@/store/grape-store';

type CallbackState =
  | { status: 'native' }
  | { status: 'bounced' }
  | { status: 'stray' }
  | { status: 'working'; code: string }
  | { status: 'error'; message: string };

/**
 * Where Kakao's authorize redirect lands. Two callers:
 *  - **web login**: this browser started it (`hasPendingKakaoWebLogin`) — validate the CSRF state
 *    and exchange the code via the store (`POST /api/auth/kakao/web`), then route home.
 *  - **native login**: Kakao redirected the system browser to this hosted page; there's no local
 *    state, so bounce the code to `grape://auth/kakao/callback` for the app to pick up.
 * Never reached on native itself.
 */
export default function KakaoCallbackScreen() {
  const { completeKakaoWebLogin, isAuthenticated } = useGrapeStore();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();

  // All synchronous validation (incl. consuming the one-shot CSRF state) happens once, here.
  const [state] = useState<CallbackState>(() => {
    if (Platform.OS !== 'web') return { status: 'native' };
    const code = first(params.code);
    const returnedState = first(params.state);
    const error = first(params.error);

    // No pending web login in this browser. Either a native-initiated login is bouncing its code
    // through this hosted page, or the user just reloaded / re-opened `/auth/kakao/callback` after a
    // completed web login (the CSRF state was already consumed). Only the former has something to
    // hand off — without a `code`/`error`, or when already signed in, there is nothing to bounce, so
    // route home instead of firing `grape://…?` which a web browser can't open.
    if (!hasPendingKakaoWebLogin()) {
      if (isAuthenticated) return { status: 'stray' };
      if (!code && !error) return { status: 'stray' };
      if (escapeKakaoTalkInAppBrowser(window.location.href)) return { status: 'bounced' };
      const deepLink = new URLSearchParams();
      if (code) deepLink.set('code', code);
      if (error) deepLink.set('error', error);
      if (returnedState) deepLink.set('state', returnedState);
      window.location.replace(`grape://auth/kakao/callback?${deepLink.toString()}`);
      return { status: 'bounced' };
    }

    // Web-initiated: validate + consume state, then exchange.
    const expectedState = consumeKakaoOauthState();
    if (error) return { status: 'error', message: '카카오 로그인이 취소되었거나 실패했어요.' };
    if (!code) return { status: 'error', message: '카카오 로그인 응답이 올바르지 않아요.' };
    if (expectedState && returnedState !== expectedState) {
      return { status: 'error', message: '로그인 요청을 확인하지 못했어요. 다시 시도해 주세요.' };
    }
    return { status: 'working', code };
  });
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [exchanged, setExchanged] = useState(false);

  // An authorization code is single-use — a second exchange fails with Kakao KOE320. This effect can
  // re-run for reasons unrelated to a new code (`completeKakaoWebLogin`'s identity changes when
  // `hydrate` flips the session on success; StrictMode double-invokes effects in dev), so gate the
  // exchange to exactly once per mount regardless of how many times the effect fires.
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (state.status !== 'working') return;
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    void completeKakaoWebLogin(
      state.code,
      `${window.location.origin}${KAKAO_WEB_REDIRECT_PATH}`,
    ).then((ok) => {
      if (ok) setExchanged(true);
      else setAsyncError('카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.');
    });
  }, [state, completeKakaoWebLogin]);

  // Leave this route once there's nothing left to do here. Unlike the login screen, this route is
  // never guarded out (a guest returns here already "authenticated"), so expo-router won't
  // auto-navigate away — we send it to `/`, which the `_layout.tsx` guards resolve to the tabs when
  // the exchange signed us in, or back to `/login` otherwise.
  const done = state.status === 'stray' || state.status === 'native' || exchanged;
  useEffect(() => {
    if (done) router.replace('/');
  }, [done]);

  const message = state.status === 'error' ? state.message : asyncError;

  return (
    <ScreenBackground variant="hero">
      <View style={styles.center}>
        {message ? (
          <>
            <Text style={styles.title}>로그인하지 못했어요</Text>
            <Text style={styles.message}>{message}</Text>
            <Button
              label="로그인으로 돌아가기"
              variant="solid"
              backgroundColor={Colors.kakao}
              textColor={Colors.kakaoText}
              style={styles.button}
              onPress={() => router.replace('/')}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={Colors.textPrimary} />
            <Text style={styles.message}>카카오 로그인 중…</Text>
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  message: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
});
