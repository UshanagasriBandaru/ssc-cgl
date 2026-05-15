/**
 * SM-2 Spaced Repetition Algorithm
 * Pure functions — no side effects, fully testable.
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak.
 */

export type SM2Card = {
  id: string;
  easeFactor: number;   // default 2.5, min 1.3
  interval: number;     // days until next review
  repetitions: number;  // consecutive correct answers
  nextReviewDate: string; // ISO 8601 YYYY-MM-DD
};

export type SM2Rating = "correct" | "forgot";

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/** Format a Date as YYYY-MM-DD */
export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Compute the next review date by adding `interval` days to today */
export function computeNextReviewDate(interval: number, from?: Date): string {
  const base = from ?? new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + Math.max(1, Math.round(interval)));
  return toDateString(next);
}

/** Create a brand-new SM-2 card for a mistake or formula */
export function newCard(id: string, from?: Date): SM2Card {
  return {
    id,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 1,
    repetitions: 0,
    nextReviewDate: computeNextReviewDate(1, from),
  };
}

/**
 * Apply a rating to an SM-2 card and return the updated card.
 * This is a pure function — the original card is not mutated.
 */
export function applyRating(card: SM2Card, rating: SM2Rating, from?: Date): SM2Card {
  if (rating === "forgot") {
    const newEaseFactor = Math.max(MIN_EASE_FACTOR, card.easeFactor - 0.2);
    return {
      ...card,
      easeFactor: newEaseFactor,
      interval: 1,
      repetitions: 0,
      nextReviewDate: computeNextReviewDate(1, from),
    };
  }

  // "correct"
  let newInterval: number;
  if (card.repetitions === 0) {
    newInterval = 1;
  } else if (card.repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(card.interval * card.easeFactor);
  }

  // Ease factor increases slightly on correct (SM-2 formula: EF' = EF + 0.1)
  const newEaseFactor = Math.max(MIN_EASE_FACTOR, card.easeFactor + 0.1);

  return {
    ...card,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: card.repetitions + 1,
    nextReviewDate: computeNextReviewDate(newInterval, from),
  };
}

/** Check if a card is due today or overdue */
export function isDue(card: SM2Card, today?: string): boolean {
  const t = today ?? toDateString(new Date());
  return card.nextReviewDate <= t;
}

/** Sort cards: overdue first, then by nextReviewDate, then by id */
export function sortDueCards(cards: SM2Card[], today?: string): SM2Card[] {
  const t = today ?? toDateString(new Date());
  return [...cards].sort((a, b) => {
    const aOverdue = a.nextReviewDate < t;
    const bOverdue = b.nextReviewDate < t;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (a.nextReviewDate !== b.nextReviewDate) return a.nextReviewDate.localeCompare(b.nextReviewDate);
    return a.id.localeCompare(b.id);
  });
}

/** Get cards due within the next N days (for calendar preview) */
export function getUpcomingCards(cards: SM2Card[], days: number, from?: Date): SM2Card[] {
  const base = from ?? new Date();
  const start = toDateString(base);
  const end = computeNextReviewDate(days, base);
  return cards.filter((c) => c.nextReviewDate >= start && c.nextReviewDate <= end);
}
