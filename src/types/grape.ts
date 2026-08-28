export interface Bunch {
  id: string;
  name: string;
  detail: string;
  unitLabel: string;
  total: number;
  filled: number;
  periodDays: number;
  createdAt: string;
  fillDates: string[];
  completedAt?: string;
  /** How many times this bunch has been fully harvested and reset for another cycle. */
  completions: number;
}

/**
 * A snapshot left behind each time a bunch is fully harvested. Independent of
 * the source bunch — it keeps existing (and keeps `sourceBunchId` pointing at
 * an id that may no longer resolve) even if the original bunch is later
 * deleted, since the bunch itself keeps cycling rather than moving here.
 */
export interface Harvest {
  id: string;
  sourceBunchId: string;
  /** Bunch name at the moment it was harvested. */
  name: string;
  /** Grapes filled in that cycle (the bunch's `total` at harvest time). */
  count: number;
  harvestedAt: string;
  /**
   * The archived bunch's full fill history, carried over on "보관함에서 확인하기"
   * so the calendar / streak / weekly-average stats keep counting those days
   * after the source bunch is gone. `recallHarvest` restores it onto the fresh
   * `Bunch`. Empty (`[]`) for a "같은 송이 다시 심기" harvest — that bunch keeps
   * cycling and keeps its own `fillDates`, so the day count stays with it.
   */
  fillDates: string[];
}

export interface NotificationSettings {
  dailyReminder: boolean;
  reminderTime: string;
  fillSound: boolean;
}
