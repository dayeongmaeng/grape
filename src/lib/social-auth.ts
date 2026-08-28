import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

/**
 * OAuth client. Mirrors the split in {@link file://./api.ts}: screens never touch this, the store
 * calls it to obtain a provider credential, then hands that to `api.loginWith*`.
 *
 * This is the **managed-workflow** flow (same as the `kkori` app) — no native login SDK. It runs in
 * Expo Go and needs no `expo prebuild` for the login code itself:
 * - Google: `expo-auth-session` opens the system browser. Web uses the implicit `id_token token`
 *   flow; iOS/Android use authorization code + PKCE and exchange the code client-side. Both end with
 *   an `idToken` for `POST /api/auth/google` (its `aud` is the Web client ID on every platform).
 * - Kakao: `expo-web-browser` opens Kakao's consent screen built from the REST API key. The browser
 *   returns an authorization **code**, which the server exchanges (`POST /api/auth/kakao/web`) — the
 *   same endpoint for web and native, so there is no separate "native Kakao access token" path.
 *
 * Native Kakao returns through a hosted redirect page (`EXPO_PUBLIC_KAKAO_REDIRECT_URI`, registered
 * in the Kakao console) that bounces the code to `grape://auth/kakao/callback`; the app's
 * `/auth/kakao/callback` route renders that page on web and performs the bounce.
 */

// Finalizes a pending auth session when the app is re-opened by the OAuth redirect (web popup /
// native deep link). Must run at module load, before any `promptAsync`.
WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'kakao';

/** Authorization code + the exact redirect URI it was issued for — the body of `POST /api/auth/kakao/web`. */
export interface KakaoCodeResult {
  code: string;
  redirectUri: string;
}

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
/** Web-type client ID. The idToken's `aud` — must equal the server's `GOOGLE_OAUTH_CLIENT_ID`. */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
/** Kakao REST API key (Kakao Developers > 앱 키 > REST API 키) — distinct from the native app key. */
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const KAKAO_AUTHORIZE_ENDPOINT = 'https://kauth.kakao.com/oauth/authorize';
/** Path (under the web origin) Kakao redirects back to — must match the console + the token exchange. */
export const KAKAO_WEB_REDIRECT_PATH = '/auth/kakao/callback';
/** Native dev fallback: the Expo web dev server must be running to serve the bounce page. */
const KAKAO_DEV_REDIRECT_URI = 'http://localhost:8081/auth/kakao/callback';
const KAKAO_STATE_KEY = 'grape.kakaoOauthState';

/** The user backed out of the provider's sheet — the store treats this as a silent no-op. */
export class SocialAuthCancelled extends Error {
  constructor() {
    super('social login cancelled');
    this.name = 'SocialAuthCancelled';
  }
}

/** A configuration / SDK failure worth surfacing to the user. */
export class SocialAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocialAuthError';
  }
}

/**
 * Idempotent one-time setup. `expo-auth-session` builds every request lazily, so there is nothing to
 * initialize ahead of time — kept for call-site symmetry and to log missing config once on launch.
 */
export function configureSocialAuth(): void {
  if (!GOOGLE_WEB_CLIENT_ID) {
    console.warn(
      '[social-auth] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — Google sign-in will fail',
    );
  }
  if (!KAKAO_REST_API_KEY) {
    console.warn('[social-auth] EXPO_PUBLIC_KAKAO_REST_API_KEY is not set — Kakao sign-in will fail');
  }
}

// --- Google -----------------------------------------------------------------------------------

function reversedClientIdScheme(clientId: string): string {
  // com.googleusercontent.apps.<id> — the reversed-DNS redirect scheme Google's native OAuth
  // clients require (a custom `grape://` scheme is rejected with Error 400).
  return `${clientId.split('.').reverse().join('.')}:/`;
}

function googleClientId(): string | undefined {
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android') return GOOGLE_ANDROID_CLIENT_ID;
  return GOOGLE_WEB_CLIENT_ID;
}

function googleRedirectUri(clientId: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/google`;
  }
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return AuthSession.makeRedirectUri({ native: reversedClientIdScheme(clientId) });
  }
  return AuthSession.makeRedirectUri({ scheme: 'grape', path: 'auth/google' });
}

function randomHex(bytes: number): string {
  return Array.from(Crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

/** Runs the Google sign-in flow in the system browser; returns a fresh idToken for `api.loginWithGoogle`. */
export async function signInWithGoogle(): Promise<string> {
  const isWeb = Platform.OS === 'web';
  const clientId = googleClientId();
  if (!clientId) {
    throw new SocialAuthError(
      isWeb ? 'Google Web 클라이언트 ID가 설정되지 않았어요.' : 'Google 클라이언트 ID가 설정되지 않았어요.',
    );
  }
  const redirectUri = googleRedirectUri(clientId);

  if (isWeb) {
    // Web: implicit hybrid flow — id_token (+ access_token) come back in the redirect fragment.
    // `id_token` in the response type makes Google require a nonce.
    const nonce = randomHex(16);
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: 'id_token token',
      usePKCE: false,
      extraParams: { nonce },
    });
    const result = await request.promptAsync(GOOGLE_DISCOVERY);
    return readGoogleIdToken(result);
  }

  // iOS / Android: authorization code + PKCE, exchanged client-side for an id_token.
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
    responseType: 'code',
    usePKCE: true,
  });
  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  if (result.type === 'cancel' || result.type === 'dismiss') throw new SocialAuthCancelled();
  if (result.type === 'error') {
    if (result.params?.error === 'access_denied') throw new SocialAuthCancelled();
    throw new SocialAuthError('Google 인증 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }
  if (result.type !== 'success' || !result.params.code) {
    throw new SocialAuthError('Google 인증 정보를 가져오지 못했어요. 다시 시도해 주세요.');
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
    },
    GOOGLE_DISCOVERY,
  );
  if (!token.idToken) {
    throw new SocialAuthError('Google 인증 토큰을 받지 못했어요. Web 클라이언트 ID 설정을 확인해 주세요.');
  }
  return token.idToken;
}

function readGoogleIdToken(result: AuthSession.AuthSessionResult): string {
  if (result.type === 'cancel' || result.type === 'dismiss') throw new SocialAuthCancelled();
  if (result.type === 'error') {
    if (result.params?.error === 'access_denied') throw new SocialAuthCancelled();
    throw new SocialAuthError('Google 인증 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }
  if (result.type !== 'success') {
    throw new SocialAuthError('Google 인증 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }
  const idToken = result.params.id_token;
  if (!idToken) {
    throw new SocialAuthError('Google 인증 토큰을 받지 못했어요. 다시 한 번 시도해 주세요.');
  }
  return idToken;
}

// --- Kakao ------------------------------------------------------------------------------------

function buildKakaoAuthorizeUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: KAKAO_REST_API_KEY ?? '',
    redirect_uri: redirectUri,
  });
  if (state) params.set('state', state);
  return `${KAKAO_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * The redirect URI Kakao sends the code to on **native**. Must be an https page registered in the
 * Kakao console that bounces the code to `grape://auth/kakao/callback` (the `/auth/kakao/callback`
 * route does this when rendered on web). Also the value sent to the server for the token exchange,
 * so it must be byte-identical there.
 */
function kakaoNativeAuthorizeRedirectUri(): string {
  const configured = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI?.trim();
  if (configured) return configured;
  if (__DEV__) return KAKAO_DEV_REDIRECT_URI;
  throw new SocialAuthError(
    'EXPO_PUBLIC_KAKAO_REDIRECT_URI가 설정되지 않았어요. (네이티브 배포 빌드에 필요해요)',
  );
}

/** The `grape://` deep link `openAuthSessionAsync` watches for to know the browser flow is done. */
function kakaoNativeReturnUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'grape', path: 'auth/kakao/callback' });
}

/** Runs the Kakao sign-in flow; returns the authorization code for `api.loginWithKakaoCode`. */
export async function signInWithKakao(): Promise<KakaoCodeResult> {
  if (!KAKAO_REST_API_KEY) {
    throw new SocialAuthError('Kakao REST API 키가 설정되지 않았어요.');
  }
  if (Platform.OS === 'web') {
    return startKakaoWebLogin(); // redirects the page away; never resolves
  }

  const redirectUri = kakaoNativeAuthorizeRedirectUri();
  const result = await WebBrowser.openAuthSessionAsync(
    buildKakaoAuthorizeUrl(redirectUri),
    kakaoNativeReturnUri(),
  );
  if (result.type === 'cancel' || result.type === 'dismiss') throw new SocialAuthCancelled();
  if (result.type !== 'success') throw new SocialAuthError('카카오 로그인에 실패했어요.');

  const { code, error } = parseKakaoCallbackUrl(result.url);
  if (error === 'access_denied') throw new SocialAuthCancelled();
  if (error || !code) throw new SocialAuthError('카카오 로그인에 실패했어요.');
  return { code, redirectUri };
}

/**
 * Web Kakao login. Redirects the whole page to Kakao's consent screen, so this never resolves — the
 * caller is navigated away and control returns via {@link KAKAO_WEB_REDIRECT_PATH}. The typed return
 * matches {@link signInWithKakao}'s native signature only for the shared call site.
 */
export async function startKakaoWebLogin(): Promise<KakaoCodeResult> {
  const redirectUri = `${window.location.origin}${KAKAO_WEB_REDIRECT_PATH}`;
  const state = randomHex(16);
  try {
    window.sessionStorage.setItem(KAKAO_STATE_KEY, state);
  } catch {
    /* private mode — the callback's CSRF check is skipped */
  }
  window.location.assign(buildKakaoAuthorizeUrl(redirectUri, state));
  return new Promise<KakaoCodeResult>(() => {});
}

function parseKakaoCallbackUrl(url: string): { code: string | null; error: string | null } {
  try {
    const parsed = new URL(url);
    return { code: parsed.searchParams.get('code'), error: parsed.searchParams.get('error') };
  } catch {
    return { code: null, error: 'parse_failed' };
  }
}

/** Reads and clears the `state` stashed before the Kakao redirect (CSRF check for the callback). */
export function consumeKakaoOauthState(): string | null {
  try {
    const state = window.sessionStorage.getItem(KAKAO_STATE_KEY);
    window.sessionStorage.removeItem(KAKAO_STATE_KEY);
    return state;
  } catch {
    return null;
  }
}

/**
 * True when *this* browser started a web Kakao login. The callback route uses it to tell a
 * web-initiated return (exchange the code here) from a native-initiated one (bounce to `grape://`).
 */
export function hasPendingKakaoWebLogin(): boolean {
  try {
    return window.sessionStorage.getItem(KAKAO_STATE_KEY) != null;
  } catch {
    return false;
  }
}
