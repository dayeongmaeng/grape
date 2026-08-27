import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Bunch, Harvest, NotificationSettings } from '@/types/grape';
import { toDateKey } from '@/lib/stats';

let idCounter = 0;
function nextId(prefix: 'bunch' | 'harvest' = 'bunch') {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

function applyFilled(bunch: Bunch, filled: number): Bunch {
  const clamped = Math.max(0, Math.min(bunch.total, filled));
  const grew = clamped > bunch.filled;
  const fillDates = grew ? [...bunch.fillDates, toDateKey(new Date())] : bunch.fillDates;
  const completedAt = clamped === bunch.total ? (bunch.completedAt ?? new Date().toISOString()) : undefined;
  return { ...bunch, filled: clamped, fillDates, completedAt };
}

/** Builds fill-history dates counting back from today, skipping every `skipEvery`-th day. */
function seedDates(count: number, skipEvery = 0): string[] {
  const dates: string[] = [];
  let day = 0;
  while (dates.length < count) {
    if (!skipEvery || day % skipEvery !== 0) {
      dates.push(toDateKey(new Date(Date.now() - day * 86400000)));
    }
    day += 1;
  }
  return dates.reverse();
}

function seedBunches(): Bunch[] {
  return [
    {
      id: nextId(),
      name: '피아노 연습',
      detail: '체르니 30번 · 하루 30분',
      unitLabel: '30분 연습',
      total: 24,
      filled: 13,
      periodDays: 30,
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
      fillDates: seedDates(13, 3),
      completions: 0,
    },
    {
      id: nextId(),
      name: '달리기',
      detail: '5km × 24회 · 밤에 뛴 날 한 알',
      unitLabel: '1회',
      total: 24,
      filled: 15,
      periodDays: 30,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      fillDates: seedDates(4),
      completions: 1,
    },
    {
      id: nextId(),
      name: '코스모스 3회독',
      detail: '챕터 하나에 한 알',
      unitLabel: '1챕터',
      total: 24,
      filled: 17,
      periodDays: 0,
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      fillDates: seedDates(17, 4),
      completions: 0,
    },
    {
      id: nextId(),
      name: '아침 스트레칭',
      detail: '10분 · 매일',
      unitLabel: '10분',
      total: 14,
      filled: 4,
      periodDays: 14,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      fillDates: seedDates(4),
      completions: 0,
    },
  ];
}

/** Seed harvest history. These have no living source bunch (orphaned `sourceBunchId`) — same as what a real deleted-source harvest looks like. */
function seedHarvests(): Harvest[] {
  const item = (name: string, count: number, daysAgo: number): Harvest => ({
    id: nextId('harvest'),
    sourceBunchId: nextId(),
    name,
    count,
    harvestedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  });

  return [
    item('달리기', 24, 25),
    item('체르니 30번', 30, 44),
    item('코스모스 2회독', 24, 58),
    item('아침 스트레칭', 14, 77),
    item('토익 단어장', 30, 97),
    item('하농 1~20번', 20, 117),
  ];
}

interface GrapeStore {
  bunches: Bunch[];
  harvests: Harvest[];
  settings: NotificationSettings;
  guest: boolean;
  isAuthenticated: boolean;
  loginContinue: () => void;
  loginAsGuest: () => void;
  logout: () => void;
  getBunch: (id: string) => Bunch | undefined;
  addBunch: (input: {
    name: string;
    unitLabel: string;
    total: number;
    periodDays: number;
  }) => Bunch;
  setFilled: (id: string, filled: number) => void;
  addOneGrape: (id: string) => void;
  addHarvest: (bunch: Bunch) => Harvest;
  /** Records a harvest for `id`'s current cycle, then resets that bunch (filled back to 0, `completions` +1) so it keeps growing. */
  harvestBunch: (id: string) => Harvest | undefined;
  deleteBunch: (id: string) => void;
  deleteHarvest: (id: string) => void;
  /**
   * Undoes a harvest: removes it from `harvests` and materializes a fresh,
   * active `Bunch` (a new id — never the old `sourceBunchId`, which may be
   * mid a completely unrelated later cycle by now) with `filled` set to
   * whatever the correction lowered it to, so it shows back up as something
   * still being filled.
   */
  recallHarvest: (harvestId: string, filled: number) => Bunch | undefined;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
}

const GrapeStoreContext = createContext<GrapeStore | null>(null);

export function GrapeStoreProvider({ children }: { children: ReactNode }) {
  const [bunches, setBunches] = useState<Bunch[]>(seedBunches);
  const [harvests, setHarvests] = useState<Harvest[]>(seedHarvests);
  const [session, setSession] = useState<'signedOut' | 'guest' | 'signedIn'>('signedOut');
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminder: true,
    reminderTime: '저녁 9:00',
    fillSound: true,
  });

  const getBunch = useCallback((id: string) => bunches.find((b) => b.id === id), [bunches]);

  const addBunch = useCallback<GrapeStore['addBunch']>((input) => {
    const bunch: Bunch = {
      id: nextId(),
      name: input.name,
      detail: input.unitLabel ? `한 알 = ${input.unitLabel}` : '',
      unitLabel: input.unitLabel,
      total: input.total,
      filled: 0,
      periodDays: input.periodDays,
      createdAt: new Date().toISOString(),
      fillDates: [],
      completions: 0,
    };
    setBunches((prev) => [bunch, ...prev]);
    return bunch;
  }, []);

  const setFilled = useCallback((id: string, filled: number) => {
    setBunches((prev) => prev.map((b) => (b.id === id ? applyFilled(b, filled) : b)));
  }, []);

  const deleteBunch = useCallback((id: string) => {
    // Harvest history is independent of the source bunch, so it's left
    // alone here — a harvest's `sourceBunchId` is allowed to dangle.
    setBunches((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addOneGrape = useCallback(
    (id: string) => {
      const bunch = getBunch(id);
      if (!bunch) return;
      setFilled(id, bunch.filled + 1);
    },
    [getBunch, setFilled],
  );

  const addHarvest = useCallback<GrapeStore['addHarvest']>((bunch) => {
    const harvest: Harvest = {
      id: nextId('harvest'),
      sourceBunchId: bunch.id,
      name: bunch.name,
      count: bunch.total,
      harvestedAt: new Date().toISOString(),
    };
    setHarvests((prev) => [harvest, ...prev]);
    return harvest;
  }, []);

  const harvestBunch = useCallback<GrapeStore['harvestBunch']>(
    (id) => {
      const bunch = bunches.find((b) => b.id === id);
      if (!bunch) return undefined;
      const harvest = addHarvest(bunch);
      // The bunch itself never leaves `bunches` — it just resets for
      // another cycle instead of being moved anywhere.
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
      return harvest;
    },
    [bunches, addHarvest],
  );

  const deleteHarvest = useCallback((id: string) => {
    setHarvests((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const recallHarvest = useCallback<GrapeStore['recallHarvest']>(
    (harvestId, filled) => {
      const harvest = harvests.find((h) => h.id === harvestId);
      if (!harvest) return undefined;
      // detail/unitLabel/periodDays/fillDates were never captured in the
      // Harvest snapshot, so the restored bunch starts fresh on those —
      // only the name, target size and corrected fill count survive.
      const restored: Bunch = {
        id: nextId(),
        name: harvest.name,
        detail: '',
        unitLabel: '',
        total: harvest.count,
        filled: Math.max(0, Math.min(harvest.count, filled)),
        periodDays: 0,
        createdAt: new Date().toISOString(),
        fillDates: [],
        completions: 0,
      };
      setHarvests((prev) => prev.filter((h) => h.id !== harvestId));
      setBunches((prev) => [restored, ...prev]);
      return restored;
    },
    [harvests],
  );

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<GrapeStore>(
    () => ({
      bunches,
      harvests,
      settings,
      guest: session === 'guest',
      isAuthenticated: session !== 'signedOut',
      loginContinue: () => setSession('signedIn'),
      loginAsGuest: () => setSession('guest'),
      logout: () => setSession('signedOut'),
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
