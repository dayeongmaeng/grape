import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import type { Bunch, Harvest, NotificationSettings } from '@/types/grape';
import { toDateKey } from '@/lib/stats';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import {
  SocialAuthCancelled,
  configureSocialAuth,
  signInWithGoogle,
  signInWithKakao,
  type SocialProvider,
} from '@/lib/social-auth';

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminder: true,
  reminderTime: '저녁 9:00',
  fillSound: true,
};

/**
 * Client-side mirror of the server's fill gating (server-design-draft.md §3-3), used for the
 * optimistic update on `setFilled`. The server recomputes authoritatively; the only possible drift
 * is the `toDateKey` timezone (UTC here vs Asia/Seoul on the server) near midnight — it self-heals
 * on the next `refresh()` / relaunch.
 */
function applyFilled(bunch: Bunch, filled: number): Bunch {
  const clamped = Math.max(0, Math.min(bunch.total, filled));
  const grew = clamped > bunch.filled;
  const fillDates = grew ? [...bunch.fillDates, toDateKey(new Date())] : bunch.fillDates;
  const completedAt = clamped === bunch.total ? (bunch.completedAt ?? new Date().toISOString()) : undefined;
  return { ...bunch, filled: clamped, fillDates, completedAt };
}

// Serialize network writes so rapid taps reach the server in order.
let writeQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

interface GrapeStore {
  bunches: Bunch[];
  harvests: Harvest[];
  settings: NotificationSettings;
  guest: boolean;
  isAuthenticated: boolean;
  /** true until a stored session (if any) has been restored on launch */
  isBootstrapping: boolean;
  /** true while the post-login list fetch is in flight */
  isLoading: boolean;
  /** message from the last failed sync, or null */
  error: string | null;
  clearError: () => void;
  /** re-fetch bunches/harvests/settings from the server */
  refresh: () => Promise<void>;
  /** Google / Kakao social login. Merges the current guest's data when signed in as a guest. */
  loginContinue: (provider: SocialProvider) => void;
  /**
   * Web Kakao only: finishes the login started by `loginContinue('kakao')` after the redirect back
   * to `/auth/kakao/callback`, exchanging the authorization code. Resolves `true` on success.
   */
  completeKakaoWebLogin: (code: string, redirectUri: string) => Promise<boolean>;
  loginAsGuest: () => void;
  logout: () => void;
  getBunch: (id: string) => Bunch | undefined;
  /**
   * Creates a bunch on the server, then adds it to state (a bunch never exists client-side without a
   * real server id, so every later action on it is safe). Returns the created bunch, or undefined on
   * failure. Callers that don't need the result can ignore the promise.
   */
  addBunch: (input: { name: string; unitLabel: string; total: number; periodDays: number }) => Promise<Bunch | undefined>;
  setFilled: (id: string, filled: number) => void;
  addOneGrape: (id: string) => void;
  /** "보관함에서 확인하기": archives the bunch server-side and appends the harvest. */
  addHarvest: (bunch: Bunch) => Promise<Harvest | undefined>;
  /** "같은 송이 다시 심기": records a harvest and resets the bunch for another cycle. */
  harvestBunch: (id: string) => Promise<Harvest | undefined>;
  deleteBunch: (id: string) => void;
  deleteHarvest: (id: string) => void;
  /**
   * Undoes a harvest: removes it and materializes a fresh active `Bunch` (a new server id — never
   * the old `sourceBunchId`). Async because the new id comes from the server.
   */
  recallHarvest: (harvestId: string, filled: number) => Promise<Bunch | undefined>;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
}

const GrapeStoreContext = createContext<GrapeStore | null>(null);

export function GrapeStoreProvider({ children }: { children: ReactNode }) {
  const [bunches, setBunches] = useState<Bunch[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<'signedOut' | 'guest' | 'signedIn'>('signedOut');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = session !== 'signedOut';

  const fail = useCallback((e: unknown, fallback: string) => {
    setError(e instanceof ApiError || e instanceof Error ? e.message : fallback);
  }, []);

  const loadLists = useCallback(async () => {
    const [b, h, s] = await Promise.all([api.listBunches(), api.listHarvests(), api.getSettings()]);
    setBunches(b);
    setHarvests(h);
    setSettings(s);
  }, []);

  const hydrate = useCallback(async () => {
    setIsLoading(true);
    try {
      const [me] = await Promise.all([api.getMe(), loadLists()]);
      setSession(me.provider === 'GUEST' ? 'guest' : 'signedIn');
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadLists]);

  const refresh = useCallback(async () => {
    try {
      await loadLists();
    } catch (e) {
      fail(e, '동기화에 실패했어요');
    }
  }, [loadLists, fail]);

  // Log any missing OAuth config once on launch (expo-auth-session builds requests lazily).
  useEffect(() => {
    configureSocialAuth();
  }, []);

  // Restore a stored session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await api.hasStoredSession()) {
          await hydrate();
        }
      } catch {
        await api.logout().catch(() => undefined);
        if (!cancelled) setSession('signedOut');
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // --- auth ---
  const loginAsGuest = useCallback(() => {
    void (async () => {
      try {
        await api.loginAsGuest();
        await hydrate();
      } catch (e) {
        fail(e, '게스트 로그인에 실패했어요');
        Alert.alert('로그인 실패', '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
      }
    })();
  }, [hydrate, fail]);

  const loginContinue = useCallback<GrapeStore['loginContinue']>(
    (provider) => {
      void (async () => {
        try {
          // When upgrading from a guest, pass its access token so the server merges the data (§3-1).
          const guestAccessToken =
            session === 'guest' ? await api.getCurrentGuestAccessToken() : undefined;

          if (provider === 'google') {
            const idToken = await signInWithGoogle();
            await api.loginWithGoogle(idToken, guestAccessToken);
          } else {
            // On web this redirects and never resolves; login finishes in completeKakaoWebLogin.
            const { code, redirectUri } = await signInWithKakao();
            await api.loginWithKakaoCode(code, redirectUri, guestAccessToken);
          }
          await hydrate();
        } catch (e) {
          if (e instanceof SocialAuthCancelled) return; // user dismissed the sheet — no error UI
          console.error('[social-auth] login failed', e); // Alert.alert is a no-op on web
          fail(e, '소셜 로그인에 실패했어요');
          Alert.alert('로그인 실패', '소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.');
        }
      })();
    },
    [session, hydrate, fail],
  );

  const completeKakaoWebLogin = useCallback<GrapeStore['completeKakaoWebLogin']>(
    (code, redirectUri) =>
      (async () => {
        try {
          // Re-read the guest token post-redirect: the guest session is still in token-store.
          const guestAccessToken =
            session === 'guest' ? await api.getCurrentGuestAccessToken() : undefined;
          await api.loginWithKakaoCode(code, redirectUri, guestAccessToken);
          await hydrate();
          return true;
        } catch (e) {
          fail(e, '소셜 로그인에 실패했어요');
          return false;
        }
      })(),
    [session, hydrate, fail],
  );

  const logout = useCallback(() => {
    void (async () => {
      await api.logout().catch(() => undefined);
      setBunches([]);
      setHarvests([]);
      setSettings(DEFAULT_SETTINGS);
      setSession('signedOut');
      setError(null);
    })();
  }, []);

  // --- selectors ---
  const getBunch = useCallback((id: string) => bunches.find((b) => b.id === id), [bunches]);

  // --- bunch mutations ---
  // Creation is not optimistic: a bunch only enters state once the server has assigned its id, so
  // any subsequent setFilled/delete/replant/archive always targets a real id.
  const addBunch = useCallback<GrapeStore['addBunch']>(
    async (input) => {
      try {
        const created = await serialize(() => api.createBunch(input));
        setBunches((prev) => [created, ...prev]);
        return created;
      } catch (e) {
        fail(e, '송이를 만들지 못했어요');
        Alert.alert('저장 실패', '송이를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
        return undefined;
      }
    },
    [fail],
  );

  const setFilled = useCallback<GrapeStore['setFilled']>(
    (id, filled) => {
      let next: Bunch | undefined;
      setBunches((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          next = applyFilled(b, filled);
          return next;
        }),
      );
      if (!next) return;
      const clamped = next.filled;
      serialize(() => api.fillBunch(id, clamped)).catch((e) => {
        fail(e, '채우기를 저장하지 못했어요');
        void refresh();
      });
    },
    [fail, refresh],
  );

  const addOneGrape = useCallback<GrapeStore['addOneGrape']>(
    (id) => {
      const b = bunches.find((x) => x.id === id);
      if (b) setFilled(id, b.filled + 1);
    },
    [bunches, setFilled],
  );

  const deleteBunch = useCallback<GrapeStore['deleteBunch']>(
    (id) => {
      setBunches((prev) => prev.filter((b) => b.id !== id));
      serialize(() => api.deleteBunch(id)).catch((e) => {
        fail(e, '송이를 삭제하지 못했어요');
        void refresh();
      });
    },
    [fail, refresh],
  );

  // "보관함에서 확인하기" — the client calls addHarvest + deleteBunch; the server does both in
  // POST /bunches/{id}/archive, so this fires that and the following deleteBunch 404s harmlessly.
  const addHarvest = useCallback<GrapeStore['addHarvest']>(
    async (bunch) => {
      setBunches((prev) => prev.filter((b) => b.id !== bunch.id)); // optimistic removal (real id)
      try {
        const { harvest } = await serialize(() => api.archiveBunch(bunch.id));
        setHarvests((prev) => [harvest, ...prev]);
        return harvest;
      } catch (e) {
        fail(e, '보관하지 못했어요');
        void refresh();
        return undefined;
      }
    },
    [fail, refresh],
  );

  const harvestBunch = useCallback<GrapeStore['harvestBunch']>(
    async (id) => {
      const bunch = bunches.find((b) => b.id === id);
      if (!bunch) return undefined;
      // optimistic reset of the (real-id) bunch so the home screen updates instantly
      setBunches((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                filled: 0,
                completedAt: undefined,
                createdAt: new Date().toISOString(),
                completions: b.completions + 1,
              }
            : b,
        ),
      );
      try {
        const { harvest, bunch: server } = await serialize(() => api.replantBunch(id));
        setHarvests((prev) => [harvest, ...prev]);
        setBunches((prev) => prev.map((b) => (b.id === server.id ? server : b)));
        return harvest;
      } catch (e) {
        fail(e, '다시 심지 못했어요');
        void refresh();
        return undefined;
      }
    },
    [bunches, fail, refresh],
  );

  const deleteHarvest = useCallback<GrapeStore['deleteHarvest']>(
    (id) => {
      setHarvests((prev) => prev.filter((h) => h.id !== id));
      serialize(() => api.deleteHarvest(id)).catch((e) => {
        fail(e, '수확 기록을 삭제하지 못했어요');
        void refresh();
      });
    },
    [fail, refresh],
  );

  const recallHarvest = useCallback<GrapeStore['recallHarvest']>(
    async (harvestId, filled) => {
      const harvest = harvests.find((h) => h.id === harvestId);
      if (!harvest) return undefined;
      try {
        const bunch = await serialize(() => api.recallHarvest(harvestId, filled));
        setHarvests((prev) => prev.filter((h) => h.id !== harvestId));
        setBunches((prev) => [bunch, ...prev]);
        return bunch;
      } catch (e) {
        fail(e, '되돌리지 못했어요');
        return undefined;
      }
    },
    [harvests, fail],
  );

  const updateSettings = useCallback<GrapeStore['updateSettings']>(
    (patch) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      serialize(() => api.updateSettings(patch))
        .then((server) => setSettings(server))
        .catch((e) => {
          fail(e, '설정을 저장하지 못했어요');
          void refresh();
        });
    },
    [fail, refresh],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<GrapeStore>(
    () => ({
      bunches,
      harvests,
      settings,
      guest: session === 'guest',
      isAuthenticated,
      isBootstrapping,
      isLoading,
      error,
      clearError,
      refresh,
      loginContinue,
      completeKakaoWebLogin,
      loginAsGuest,
      logout,
      getBunch,
      addBunch,
      setFilled,
      addOneGrape,
      addHarvest,
      harvestBunch,
      deleteBunch,
      deleteHarvest,
      recallHarvest,
      updateSettings,
    }),
    [
      bunches,
      harvests,
      settings,
      session,
      isAuthenticated,
      isBootstrapping,
      isLoading,
      error,
      clearError,
      refresh,
      loginContinue,
      completeKakaoWebLogin,
      loginAsGuest,
      logout,
      getBunch,
      addBunch,
      setFilled,
      addOneGrape,
      addHarvest,
      harvestBunch,
      deleteBunch,
      deleteHarvest,
      recallHarvest,
      updateSettings,
    ],
  );

  return <GrapeStoreContext.Provider value={value}>{children}</GrapeStoreContext.Provider>;
}

export function useGrapeStore() {
  const ctx = useContext(GrapeStoreContext);
  if (!ctx) throw new Error('useGrapeStore must be used within GrapeStoreProvider');
  return ctx;
}
