import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import {
  NotoSansKR_300Light,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { GrapeStoreProvider, useGrapeStore } from '@/store/grape-store';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { isBootstrapping } = useGrapeStore();

  useEffect(() => {
    if (!isBootstrapping) SplashScreen.hideAsync();
  }, [isBootstrapping]);

  // keep the splash up until the stored session (if any) has been restored
  if (isBootstrapping) return null;
  return <RootNavigator />;
}

function RootNavigator() {
  const { isAuthenticated } = useGrapeStore();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgTop },
      }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      {/* Kakao web redirect target — reachable regardless of auth state (a guest returns here
          already "authenticated", so it must sit outside both Protected groups). */}
      <Stack.Screen name="auth/kakao/callback" />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bunch/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="harvest/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bunch/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="bunch/complete" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    GowunBatang_400Regular,
    GowunBatang_700Bold,
    NotoSansKR_300Light,
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GrapeStoreProvider>
      <StatusBar style="light" />
      <Gate />
    </GrapeStoreProvider>
  );
}
