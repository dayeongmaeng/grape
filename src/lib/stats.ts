/** Pure helpers for turning a bunch's fill history into streaks and dates. */

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

function sortedUniqueDays(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort();
}

/** Consecutive-day streak ending today or yesterday (a day not yet filled doesn't break it until it's over). */
export function currentStreak(dates: string[]): number {
  const days = new Set(dates);
  if (days.size === 0) return 0;

  let cursor = new Date();
  if (!days.has(toDateKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export function longestStreak(dates: string[]): number {
  const days = sortedUniqueDays(dates);
  if (days.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    run = Math.round((cur - prev) / DAY_MS) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function daysRemaining(createdAt: string, periodDays: number): number | null {
  if (!periodDays) return null;
  const deadline = new Date(createdAt).getTime() + periodDays * DAY_MS;
  const remaining = Math.ceil((deadline - Date.now()) / DAY_MS);
  return Math.max(0, remaining);
}

export function weeklyAverage(dates: string[]): number {
  const days = sortedUniqueDays(dates);
  if (days.length === 0) return 0;
  const firstDay = new Date(days[0]).getTime();
  const weeks = Math.max(1, (Date.now() - firstDay) / (DAY_MS * 7));
  return dates.length / weeks;
}
