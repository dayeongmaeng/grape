import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json. This wrapper injects the OAuth redirect URL scheme that
 * `expo-auth-session` needs on native, derived from EXPO_PUBLIC_* env (.env.development /
 * .env.production) so the client IDs aren't committed as literals.
 *
 * Google's native OAuth clients redirect to the reversed-DNS client-ID scheme
 * (`com.googleusercontent.apps.<id>`), which must be a registered URL scheme:
 *   iOS     — a CFBundleURLTypes entry
 *   Android — an intent filter (only when a separate Android client ID is set)
 *
 * Kakao uses the REST API + an in-app browser and returns through the app's own `grape://` scheme
 * (already in app.json), so it needs no extra native config.
 *
 * After changing this file, rebuild the native project (`npx expo prebuild` / EAS build) for the
 * Info.plist / AndroidManifest changes to take effect.
 */

function reversedScheme(clientId: string | undefined): string | undefined {
  return clientId ? clientId.split('.').reverse().join('.') : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosScheme = reversedScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const androidScheme = reversedScheme(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

  return {
    ...config,
    name: config.name ?? 'grape',
    slug: config.slug ?? 'grape',
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(iosScheme
          ? {
              CFBundleURLTypes: [
                ...(config.ios?.infoPlist?.CFBundleURLTypes ?? []),
                { CFBundleURLSchemes: [iosScheme] },
              ],
            }
          : {}),
      },
    },
    android: {
      ...config.android,
      ...(androidScheme
        ? {
            intentFilters: [
              ...(config.android?.intentFilters ?? []),
              {
                action: 'VIEW',
                data: [{ scheme: androidScheme }],
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          }
        : {}),
    },
  };
};
