/**
 * Streak and habit tracking — pure functions.
 */

export type DailyActivity = {
  date: string;             // ISO 8601 YYYY-MM-DD
  questionsAnswered: number;
  minutesStudied: number;
  targetMet: boolean;
};

export type HabitDay = "filled" | "partial" | "empty";

export type DailyTarget = {
  type: "questions" | "minutes";
  value: number;
};

export const DEFAULT_TARGET: DailyTarget = { type: "questions", value: 10 };
export const MILESTONE_DAYS = [7, 14, 30, 60] as const;

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute the current streak: length of the longest suffix of consecutive
 * calendar days (ending on today or yesterday) where at least one activity
 * was recorded. Returns 0 if the most recent activity was > 1 day ago.
 */
export function computeStreak(activities: DailyActivity[], today?: string): number {
  const t = today ?? todayStr();
  const activityDates = new Set(activities.map((a) => a.date));

  if (activityDates.size === 0) return 0;

  // Start from today or yesterday
  let cursor = activityDates.has(t) ? t : addDays(t, -1);
  if (!activityDates.has(cursor)) return 0;

  let streak = 0;
  while (activityDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Compute a 30-day habit calendar.
 * Each day is "filled" (target met), "partial" (some activity), or "empty".
 */
export function computeHabitCalendar(
  activities: DailyActivity[],
  days = 30,
  today?: string,
): Array<{ date: string; status: HabitDay }> {
  const t = today ?? todayStr();
  const activityMap = new Map(activities.map((a) => [a.date, a]));
  const result: Array<{ date: string; status: HabitDay }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(t, -i);
    const activity = activityMap.get(date);
    let status: HabitDay = "empty";
    if (activity) {
      status = activity.targetMet ? "filled" : "partial";
    }
    result.push({ date, status });
  }

  return result;
}

/**
 * Return the subset of MILESTONE_DAYS that are ≤ the current streak.
 */
export function computeMilestoneBadges(streak: number): number[] {
  return MILESTONE_DAYS.filter((m) => m <= streak);
}

/**
 * Return the gap in days since the last activity if > 3, else null.
 * Used to trigger the re-engagement prompt.
 */
export function checkReEngagement(activities: DailyActivity[], today?: string): number | null {
  if (activities.length === 0) return null;
  const t = today ?? todayStr();
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const lastDate = sorted[0].date;

  const todayMs = new Date(t + "T00:00:00Z").getTime();
  const lastMs = new Date(lastDate + "T00:00:00Z").getTime();
  const gapDays = Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24));

  return gapDays > 3 ? gapDays : null;
}

/**
 * Check if the daily target is met for a given activity.
 */
export function isTargetMet(activity: Omit<DailyActivity, "targetMet">, target: DailyTarget): boolean {
  if (target.type === "questions") return activity.questionsAnswered >= target.value;
  return activity.minutesStudied >= target.value;
}

/**
 * Validate a daily target configuration.
 * Returns null if valid, or an error message if invalid.
 */
export function validateTarget(target: DailyTarget): string | null {
  if (target.type === "questions") {
    if (target.value < 5 || target.value > 200) {
      return "Questions target must be between 5 and 200.";
    }
  } else {
    if (target.value < 10 || target.value > 480) {
      return "Minutes target must be between 10 and 480.";
    }
  }
  return null;
}

/**
 * Merge a new activity into the existing log for today.
 * If an entry for today already exists, it is updated (not duplicated).
 */
export function mergeActivity(
  log: DailyActivity[],
  newActivity: Omit<DailyActivity, "targetMet">,
  target: DailyTarget,
): DailyActivity[] {
  const today = newActivity.date;
  const existing = log.find((a) => a.date === today);

  const merged: Omit<DailyActivity, "targetMet"> = existing
    ? {
        date: today,
        questionsAnswered: existing.questionsAnswered + newActivity.questionsAnswered,
        minutesStudied: existing.minutesStudied + newActivity.minutesStudied,
      }
    : newActivity;

  const entry: DailyActivity = {
    ...merged,
    targetMet: isTargetMet(merged, target),
  };

  return [...log.filter((a) => a.date !== today), entry].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}
