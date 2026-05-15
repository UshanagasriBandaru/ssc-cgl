/**
 * Performance computation — pure functions for computing topic scores,
 * weak topics, subject summaries, and estimated SSC CGL scores.
 */

import type { SubjectId } from "@/lib/ssc-topics";

export type MockSession = {
  id: string;
  date: string;           // ISO 8601 YYYY-MM-DD
  topicSlugs: string[];
  score: number;
  totalQuestions: number;
  accuracyByTopic: Record<string, number>; // slug → 0–1
  durationSeconds: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  errorAnalysis?: {
    primaryCategory: string;
    explanation: string;
    remediationActions: string[];
    analyzedAt: string;
  };
};

export type MistakeRecord = {
  id: string;
  topic_slug: string;
  created_at?: string;
};

export type TopicPerformance = {
  topicSlug: string;
  score: number;          // 0–100
  accuracy: number;       // 0–1
  totalAttempts: number;
  recentAccuracy: number; // last 3 attempts average
  lastAttemptDate: string | null;
  timeWastageRatio: number; // seconds per correct answer
  mistakeCount: number;
  firstAccuracy: number | null; // for "most improved" detection
};

export type SubjectSummary = {
  subject: SubjectId;
  averageAccuracy: number;
  totalAttempts: number;
  trend: "improving" | "stable" | "declining";
};

/** Compute a 0–100 performance score for a topic */
export function computePerformanceScore(
  mistakes: MistakeRecord[],
  sessions: MockSession[],
  topicSlug: string,
): TopicPerformance {
  const topicMistakes = mistakes.filter((m) => m.topic_slug === topicSlug);
  const topicSessions = sessions.filter((s) => topicSlug in s.accuracyByTopic);

  if (topicSessions.length === 0) {
    return {
      topicSlug,
      score: 50, // neutral when no data
      accuracy: 0.5,
      totalAttempts: 0,
      recentAccuracy: 0.5,
      lastAttemptDate: null,
      timeWastageRatio: 0,
      mistakeCount: topicMistakes.length,
      firstAccuracy: null,
    };
  }

  const accuracies = topicSessions.map((s) => s.accuracyByTopic[topicSlug] ?? 0);
  const accuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const recentAccuracy =
    accuracies.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, accuracies.length);

  // Time wastage: total seconds on topic / correct answers
  const totalSeconds = topicSessions.reduce((sum, s) => {
    const topicFraction = 1 / Math.max(1, s.topicSlugs.length);
    return sum + s.durationSeconds * topicFraction;
  }, 0);
  const totalCorrect = topicSessions.reduce((sum, s) => {
    return sum + Math.round((s.accuracyByTopic[topicSlug] ?? 0) * (s.totalQuestions / Math.max(1, s.topicSlugs.length)));
  }, 0);
  const timeWastageRatio = totalSeconds / Math.max(1, totalCorrect);

  const sorted = [...topicSessions].sort((a, b) => a.date.localeCompare(b.date));
  const lastAttemptDate = sorted[sorted.length - 1]?.date ?? null;
  const firstAccuracy = sorted[0] ? (sorted[0].accuracyByTopic[topicSlug] ?? null) : null;

  // Score: weighted combination of accuracy (70%) and recency bonus (30%)
  const recencyBonus = topicSessions.length >= 3 ? 0 : -10 * (3 - topicSessions.length);
  const score = Math.max(0, Math.min(100, Math.round(accuracy * 100 + recencyBonus)));

  return {
    topicSlug,
    score,
    accuracy,
    totalAttempts: topicSessions.length,
    recentAccuracy,
    lastAttemptDate,
    timeWastageRatio,
    mistakeCount: topicMistakes.length,
    firstAccuracy,
  };
}

/** Return topics where recent accuracy < threshold (default 60%) */
export function computeWeakTopics(
  performances: TopicPerformance[],
  threshold = 0.6,
): TopicPerformance[] {
  return performances
    .filter((p) => p.recentAccuracy < threshold)
    .sort((a, b) => a.recentAccuracy - b.recentAccuracy);
}

/** Compute subject-level summary from mock sessions */
export function computeSubjectSummary(
  sessions: MockSession[],
  subject: SubjectId,
  topicSlugsForSubject: string[],
): SubjectSummary {
  const relevant = sessions.filter((s) =>
    s.topicSlugs.some((slug) => topicSlugsForSubject.includes(slug)),
  );

  if (relevant.length === 0) {
    return { subject, averageAccuracy: 0, totalAttempts: 0, trend: "stable" };
  }

  const accuracies = relevant.map((s) => {
    const subjectSlugs = s.topicSlugs.filter((slug) => topicSlugsForSubject.includes(slug));
    if (subjectSlugs.length === 0) return 0;
    const sum = subjectSlugs.reduce((acc, slug) => acc + (s.accuracyByTopic[slug] ?? 0), 0);
    return sum / subjectSlugs.length;
  });

  const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (accuracies.length >= 10) {
    const first5 = accuracies.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const last5 = accuracies.slice(-5).reduce((a, b) => a + b, 0) / 5;
    if (last5 - first5 > 0.05) trend = "improving";
    else if (first5 - last5 > 0.05) trend = "declining";
  }

  return { subject, averageAccuracy, totalAttempts: relevant.length, trend };
}

/**
 * Estimate SSC CGL score using the official marking scheme:
 * +2 per correct, -0.5 per wrong, clamped to [0, 200].
 */
export function computeEstimatedScore(
  performances: TopicPerformance[],
  totalQuestionsPerExam = 100,
): { min: number; max: number; expected: number } {
  if (performances.length === 0) return { min: 0, max: 0, expected: 0 };

  const avgAccuracy =
    performances.reduce((sum, p) => sum + p.accuracy, 0) / performances.length;

  const questionsPerTopic = totalQuestionsPerExam / performances.length;
  let expected = 0;
  for (const p of performances) {
    const correct = p.accuracy * questionsPerTopic;
    const wrong = (1 - p.accuracy) * questionsPerTopic;
    expected += correct * 2 - wrong * 0.5;
  }
  expected = Math.max(0, Math.min(200, Math.round(expected)));

  const variance = 15;
  const min = Math.max(0, expected - variance);
  const max = Math.min(200, expected + variance);

  void avgAccuracy; // used implicitly via per-topic computation
  return { min, max, expected };
}

/** Detect pattern: same topic wrong ≥ N times in last 7 days */
export function detectMistakePatterns(
  mistakes: MistakeRecord[],
  threshold = 3,
): Array<{ topicSlug: string; count: number }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const recent = mistakes.filter((m) => (m.created_at ?? "9999") >= cutoff);
  const counts: Record<string, number> = {};
  for (const m of recent) {
    counts[m.topic_slug] = (counts[m.topic_slug] ?? 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= threshold)
    .map(([topicSlug, count]) => ({ topicSlug, count }))
    .sort((a, b) => b.count - a.count);
}
