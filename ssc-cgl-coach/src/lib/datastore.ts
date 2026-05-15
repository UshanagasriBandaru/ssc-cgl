/**
 * DataStore — versioned localStorage abstraction.
 * All keys use the ssc-coach-v2-* prefix to avoid conflicts with v1 data.
 */

export const KEYS = {
  MISTAKES:         "ssc-coach-v2-mistakes",
  MOCK_SESSIONS:    "ssc-coach-v2-mock-sessions",
  SM2_STATE:        "ssc-coach-v2-sm2-state",
  HABIT_LOG:        "ssc-coach-v2-habit-log",
  FORMULA_TRACKER:  "ssc-coach-v2-formula-tracker",
  LANGUAGE_PREF:    "ssc-coach-v2-language-pref",
  DAILY_TARGET:     "ssc-coach-v2-daily-target",
  DIFFICULTY:       "ssc-coach-v2-difficulty",
  THEME:            "ssc-coach-v2-theme",
  STUDY_PACKS:      "ssc-coach-v2-study-packs",
  LEADERBOARD_CACHE:"ssc-coach-v2-leaderboard-cache",
  STREAK:           "ssc-coach-v2-streak",
} as const;

export type LanguagePref = "english" | "telugu-english";

export type DifficultyState = {
  easy: number;    // percentage 0-100
  medium: number;
  hard: number;
};

export const DEFAULT_DIFFICULTY: DifficultyState = { easy: 40, medium: 40, hard: 20 };

export class StorageQuotaError extends Error {
  constructor(key: string) {
    super(`localStorage quota exceeded writing key: ${key}`);
    this.name = "StorageQuotaError";
  }
}

/** Read a value from localStorage, returning fallback if missing or parse fails */
export function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write a value to localStorage. Throws StorageQuotaError if quota exceeded. */
export function writeStore<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      // Dispatch global event for the StorageWarning banner
      window.dispatchEvent(new CustomEvent("storage-quota-exceeded"));
      throw new StorageQuotaError(key);
    }
    throw e;
  }
}

/** Remove a key from localStorage */
export function removeStore(key: string): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Read language preference */
export function getLanguagePref(): LanguagePref {
  return readStore<LanguagePref>(KEYS.LANGUAGE_PREF, "english");
}

/** Write language preference */
export function setLanguagePref(pref: LanguagePref): void {
  writeStore(KEYS.LANGUAGE_PREF, pref);
}

/** Read difficulty state */
export function getDifficulty(): DifficultyState {
  return readStore<DifficultyState>(KEYS.DIFFICULTY, DEFAULT_DIFFICULTY);
}

/** Write difficulty state */
export function setDifficulty(d: DifficultyState): void {
  writeStore(KEYS.DIFFICULTY, d);
}

/** Adjust difficulty after a mock result */
export function adjustDifficulty(score: number, total: number): DifficultyState {
  const current = getDifficulty();
  const ratio = score / total;

  if (ratio >= 0.7) {
    // Shift 30% from easy to medium/hard
    const shift = Math.round(current.easy * 0.3);
    const next: DifficultyState = {
      easy: current.easy - shift,
      medium: current.medium + Math.round(shift / 2),
      hard: current.hard + Math.round(shift / 2),
    };
    setDifficulty(next);
    return next;
  } else if (ratio < 0.4) {
    // Shift 30% from hard to easy/medium
    const shift = Math.round(current.hard * 0.3);
    const next: DifficultyState = {
      easy: current.easy + Math.round(shift / 2),
      medium: current.medium + Math.round(shift / 2),
      hard: current.hard - shift,
    };
    setDifficulty(next);
    return next;
  }

  return current;
}
