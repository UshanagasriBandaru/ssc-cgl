"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS, SUBJECT_LABELS, type SubjectId } from "@/lib/ssc-topics";
import { KEYS, readStore } from "@/lib/datastore";
import { computePerformanceScore, computeWeakTopics, computeSubjectSummary, type MockSession, type TopicPerformance } from "@/lib/performance";
import type { MistakeRecord } from "@/lib/performance";

type MistakeRow = { id: string; topic_slug: string; created_at?: string };

const subjectColors: Record<string, string> = {
  quant: "bg-blue-500", reasoning: "bg-violet-500", english: "bg-emerald-500", gk: "bg-amber-500",
};
const subjectBg: Record<string, string> = {
  quant: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  reasoning: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  english: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  gk: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

function scoreToColor(score: number): string {
  // 0=red, 50=yellow, 100=green
  const r = score < 50 ? 255 : Math.round(255 * (1 - (score - 50) / 50));
  const g = score > 50 ? 255 : Math.round(255 * (score / 50));
  return `rgb(${r},${g},60)`;
}

const trendArrow = (trend: "improving" | "stable" | "declining") =>
  trend === "improving" ? "↑" : trend === "declining" ? "↓" : "→";
const trendColor = (trend: "improving" | "stable" | "declining") =>
  trend === "improving" ? "text-emerald-600 dark:text-emerald-400" :
  trend === "declining" ? "text-red-600 dark:text-red-400" : "text-zinc-500";

export default function AnalyticsPage() {
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [sessions, setSessions] = useState<MockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    const m = readStore<MistakeRow[]>(KEYS.MISTAKES, []);
    const s = readStore<MockSession[]>(KEYS.MOCK_SESSIONS, []);
    setMistakes(m);
    setSessions(s);
    setLoading(false);
  }, []);

  const mistakeRecords: MistakeRecord[] = useMemo(() =>
    mistakes.map((m) => ({ id: m.id, topic_slug: m.topic_slug, created_at: m.created_at })), [mistakes]);

  const performances: TopicPerformance[] = useMemo(() =>
    SSC_CGL_TOPICS.map((t) => computePerformanceScore(mistakeRecords, sessions, t.slug)),
    [mistakeRecords, sessions]);

  const weakTopics = useMemo(() => computeWeakTopics(performances), [performances]);

  const subjectSummaries = useMemo(() =>
    (["quant", "reasoning", "english", "gk"] as SubjectId[]).map((subj) => {
      const slugs = SSC_CGL_TOPICS.filter((t) => t.subject === subj).map((t) => t.slug);
      return computeSubjectSummary(sessions, subj, slugs);
    }), [sessions]);

  const totalMistakes = mistakes.length;
  const totalSessions = sessions.length;
  const avgScore = performances.length > 0
    ? Math.round(performances.reduce((s, p) => s + p.score, 0) / performances.length)
    : 0;

  const selectedPerf = selectedTopic ? performances.find((p) => p.topicSlug === selectedTopic) : null;
  const selectedMistakes = selectedTopic ? mistakes.filter((m) => m.topic_slug === selectedTopic) : [];
  const selectedSessions = selectedTopic ? sessions.filter((s) => selectedTopic in s.accuracyByTopic).slice(-5) : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Home</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Performance heatmap, weak topics, and subject trends.</p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Mistakes logged", value: totalMistakes, icon: "📝" },
          { label: "Mocks taken", value: totalSessions, icon: "🧪" },
          { label: "Avg topic score", value: `${avgScore}/100`, icon: "📊" },
          { label: "Weak topics", value: weakTopics.length, icon: "⚠️" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{s.value}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {totalSessions < 5 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Take more mocks to unlock full analytics</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">You&apos;ve taken {totalSessions} mock{totalSessions !== 1 ? "s" : ""}. Take at least 5 to see accuracy trends and subject summaries.</p>
            <Link href="/mock-tests" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400">
              🧪 Take a mock
            </Link>
          </div>
        </div>
      )}

      {/* Subject summaries */}
      {totalSessions >= 5 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjectSummaries.map((s) => (
            <div key={s.subject} className={`rounded-2xl border p-4 shadow-sm ${subjectBg[s.subject]}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{SUBJECT_LABELS[s.subject]}</span>
                <span className={`text-xl font-bold ${trendColor(s.trend)}`}>{trendArrow(s.trend)}</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{Math.round(s.averageAccuracy * 100)}%</div>
              <div className="mt-0.5 text-xs opacity-70">{s.totalAttempts} sessions · {s.trend}</div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap grid */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">Topic performance heatmap</h2>
        <p className="mb-4 text-sm text-zinc-500">Click a topic for details. Red = weak, green = strong.</p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />Loading…</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {SSC_CGL_TOPICS.map((topic) => {
              const perf = performances.find((p) => p.topicSlug === topic.slug);
              const score = perf?.score ?? 50;
              const isSelected = selectedTopic === topic.slug;
              const isMostImproved = perf && perf.firstAccuracy !== null && perf.accuracy - perf.firstAccuracy > 0.2;
              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => setSelectedTopic(isSelected ? null : topic.slug)}
                  className={`relative rounded-xl border-2 p-3 text-left transition hover:scale-105 ${isSelected ? "border-zinc-900 dark:border-amber-500" : "border-transparent"}`}
                  style={{ backgroundColor: scoreToColor(score) + "33" }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{topic.name}</span>
                    {isMostImproved && <span title="Most Improved" className="text-xs">⬆️</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreToColor(score) }} />
                    </div>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{score}</span>
                  </div>
                  <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-xs ${subjectBg[topic.subject]}`}>{topic.subject}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Topic detail panel */}
      {selectedPerf && selectedTopic && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {SSC_CGL_TOPICS.find((t) => t.slug === selectedTopic)?.name ?? selectedTopic}
              </h2>
              <p className="text-sm text-zinc-500">Topic detail</p>
            </div>
            <button type="button" onClick={() => setSelectedTopic(null)} className="text-zinc-400 hover:text-zinc-600">✕</button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Score", value: `${selectedPerf.score}/100` },
              { label: "Accuracy", value: `${Math.round(selectedPerf.accuracy * 100)}%` },
              { label: "Mistakes", value: selectedMistakes.length },
              { label: "Sessions", value: selectedPerf.totalAttempts },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/40">
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{s.value}</div>
                <div className="text-xs text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
          {selectedSessions.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Last {selectedSessions.length} mock scores:</p>
              <div className="flex gap-2">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="rounded-lg bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-800">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{Math.round((s.accuracyByTopic[selectedTopic] ?? 0) * 100)}%</div>
                    <div className="text-xs text-zinc-400">{s.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedPerf.timeWastageRatio > 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              ⏱️ Time wastage: <strong className="text-zinc-700 dark:text-zinc-300">{Math.round(selectedPerf.timeWastageRatio)}s per correct answer</strong>
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Link href={`/study?q=${encodeURIComponent(SSC_CGL_TOPICS.find((t) => t.slug === selectedTopic)?.name ?? selectedTopic)}`}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
              📋 Study this topic
            </Link>
            <Link href={`/mock-tests?q=${encodeURIComponent(SSC_CGL_TOPICS.find((t) => t.slug === selectedTopic)?.name ?? selectedTopic)}`}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
              🧪 Mock test
            </Link>
          </div>
        </div>
      )}

      {/* Weak topics list */}
      {weakTopics.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">⚠️ Weak topics (accuracy &lt; 60%)</h2>
          <ul className="space-y-3">
            {weakTopics.slice(0, 8).map((p) => {
              const topic = SSC_CGL_TOPICS.find((t) => t.slug === p.topicSlug);
              const pct = Math.round(p.recentAccuracy * 100);
              return (
                <li key={p.topicSlug}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${subjectBg[topic?.subject ?? "gk"]}`}>{topic?.subject ?? "gk"}</span>
                      <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{topic?.name ?? p.topicSlug}</span>
                    </div>
                    <span className="shrink-0 font-mono font-bold text-red-600 dark:text-red-400">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Monthly activity calendar */}
      {totalSessions >= 5 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">📅 Monthly activity</h2>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              const dateStr = d.toISOString().slice(0, 10);
              const daySessions = sessions.filter((s) => s.date === dateStr);
              const hasActivity = daySessions.length > 0;
              const totalScore = daySessions.reduce((sum, s) => sum + s.score, 0);
              const totalQ = daySessions.reduce((sum, s) => sum + s.totalQuestions, 0);
              return (
                <div
                  key={dateStr}
                  title={hasActivity ? `${dateStr}: ${daySessions.length} mock(s), ${totalScore}/${totalQ} correct` : dateStr}
                  className={`aspect-square rounded-md text-center text-xs font-bold leading-none flex items-center justify-center cursor-default ${
                    hasActivity
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  {hasActivity ? daySessions.length : ""}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-400">Each cell = one day. Number = mocks taken. Green = active day.</p>
        </div>
      )}
    </main>
  );
}
