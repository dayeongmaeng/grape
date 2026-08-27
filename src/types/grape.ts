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
}

export interface NotificationSettings {
  dailyReminder: boolean;
  reminderTime: string;
  fillSound: boolean;
}
