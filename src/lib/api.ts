import type { Bunch, Harvest, NotificationSettings } from '@/types/grape';
import { clearTokens, getTokens, setTokens } from '@/lib/token-store';

/**
 * Thin client for the grape-api server (see server-design-draft.md §3).
 * - attaches `Authorization: Bearer <accessToken>` automatically
 * - on 401, rotates the refresh token once and retries the request
 * - error body `{ code, message }` -> {@link ApiError}
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn('[api] EXPO_PUBLIC_API_BASE_URL is not set — falling back to http://localhost:8080');
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthUser {
  id: string;
  provider: 'GUEST' | 'GOOGLE' | 'KAKAO' | string;
  email: string | null;
  nickname: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// --- low-level ----------------------------------------------------------------------------------

async function send(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = 'UNKNOWN';
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body && typeof body.code === 'string') code = body.code;
    if (body && typeof body.message === 'string') message = body.message;
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, code, message);
}

// single-flight refresh so concurrent 401s share one rotation
let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      const res = await send('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const pair = (await res.json()) as TokenPair;
      await setTokens(pair);
      return pair.accessToken;
    })().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

/** Authenticated request with automatic one-shot refresh + retry on 401. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await getTokens();
  let res = await send(path, init, tokens?.accessToken);

  if (res.status === 401 && tokens?.refreshToken) {
    const rotated = await refreshAccessToken(tokens.refreshToken);
    if (rotated) {
      res = await send(path, init, rotated);
    }
  }

  // deletes are idempotent: a missing target is a success from the client's view
  if (res.status === 404 && (init.method === 'DELETE' || init.method === 'delete')) {
    return undefined as T;
  }
  if (!res.ok) {
    throw await toApiError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// --- auth -------------------------------------------------------------------------------------

export async function hasStoredSession(): Promise<boolean> {
  const tokens = await getTokens();
  return !!tokens?.refreshToken;
}

export async function loginAsGuest(): Promise<AuthUser> {
  const res = await send('/api/auth/guest', { method: 'POST' });
  if (!res.ok) throw await toApiError(res);
  const data = (await res.json()) as LoginResponse;
  await setTokens(data);
  return data.user;
}

/**
 * The Google OAuth SDK is not wired yet — the caller must supply an `idToken`. When the current
 * session is a guest, pass its access token so the server merges the guest data (§3-1).
 */
export async function loginWithGoogle(idToken: string, guestAccessToken?: string): Promise<AuthUser> {
  const res = await send(
    '/api/auth/google',
    { method: 'POST', body: JSON.stringify({ idToken }) },
    guestAccessToken,
  );
  if (!res.ok) throw await toApiError(res);
  const data = (await res.json()) as LoginResponse;
  await setTokens(data);
  return data.user;
}

/** See {@link loginWithGoogle}; request body carries the Kakao SDK access token. */
export async function loginWithKakao(kakaoAccessToken: string, guestAccessToken?: string): Promise<AuthUser> {
  const res = await send(
    '/api/auth/kakao',
    { method: 'POST', body: JSON.stringify({ accessToken: kakaoAccessToken }) },
    guestAccessToken,
  );
  if (!res.ok) throw await toApiError(res);
  const data = (await res.json()) as LoginResponse;
  await setTokens(data);
  return data.user;
}

export async function logout(): Promise<void> {
  const tokens = await getTokens();
  try {
    if (tokens?.refreshToken) {
      await send(
        '/api/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) },
        tokens.accessToken,
      );
    }
  } catch {
    /* best effort — clear locally regardless */
  } finally {
    await clearTokens();
  }
}

export async function getCurrentGuestAccessToken(): Promise<string | undefined> {
  const tokens = await getTokens();
  return tokens?.accessToken;
}

// --- users -----------------------------------------------------------------------------------

export const getMe = () => request<AuthUser>('/api/users/me');
export const deleteMe = () => request<void>('/api/users/me', { method: 'DELETE' });

// --- bunches ---------------------------------------------------------------------------------

export const listBunches = () => request<Bunch[]>('/api/bunches');
export const getBunch = (id: string) => request<Bunch>(`/api/bunches/${id}`);
export const createBunch = (input: {
  name: string;
  unitLabel: string;
  total: number;
  periodDays: number;
}) => request<Bunch>('/api/bunches', { method: 'POST', body: JSON.stringify(input) });
export const fillBunch = (id: string, filled: number) =>
  request<Bunch>(`/api/bunches/${id}/fill`, { method: 'PATCH', body: JSON.stringify({ filled }) });
export const replantBunch = (id: string) =>
  request<{ harvest: Harvest; bunch: Bunch }>(`/api/bunches/${id}/replant`, { method: 'POST' });
export const archiveBunch = (id: string) =>
  request<{ harvest: Harvest }>(`/api/bunches/${id}/archive`, { method: 'POST' });
export const deleteBunch = (id: string) => request<void>(`/api/bunches/${id}`, { method: 'DELETE' });

// --- harvests --------------------------------------------------------------------------------

export const listHarvests = () => request<Harvest[]>('/api/harvests');
export const getHarvest = (id: string) => request<Harvest>(`/api/harvests/${id}`);
export const deleteHarvest = (id: string) => request<void>(`/api/harvests/${id}`, { method: 'DELETE' });
export const recallHarvest = (id: string, filled: number) =>
  request<Bunch>(`/api/harvests/${id}/recall`, { method: 'POST', body: JSON.stringify({ filled }) });

// --- settings -------------------------------------------------------------------------------

export const getSettings = () => request<NotificationSettings>('/api/settings');
export const updateSettings = (patch: Partial<NotificationSettings>) =>
  request<NotificationSettings>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) });
