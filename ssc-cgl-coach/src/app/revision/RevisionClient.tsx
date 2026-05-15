"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";
import { KEYS, readStore, writeStore } from "@/lib/datastore";
import { applyRating, sortDueCards, getUpcomingCards, isDue, type SM2Card } from "@/lib/sm2";
import { detectMistakePatterns } from "@/lib/performance";
import type { MistakeRecord } from "@/lib/performance";

type MistakeRow = {
  id: string; topic_slug: string; question: string;
  correct_answer?: string | null; user_answer?: string | null;
  explanation?: string | null; next_review_at?: string | null; created_at?: string;
};

type FormulaCard = { id: string; topicSlug: string; formula: string; context: string; sm2: SM2Card };

const subjectColors: Record<string, string> = {
  quant: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  reasoning: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  english: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  gk: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export function RevisionClient() {
  const labelFor = useMemo(() => {
    const map = new Map(SSC_CGL_TOPICS.map((t) => [t.slug, t.name]));
    return (slug: string) => map.get(slug) ?? slug;
  }, []);
  const subjectFor = useMemo(() => {
    const map = new Map(SSC_CGL_TOPICS.map((t) => [t.slug, t.subject]));
    return (slug: string) => map.get(slug) ?? "gk";
  }, []);

  const [tab, setTab] = useState<"due" | "formulas" | "calendar">("due");
  const [mistakes, setMistakes] = useState<MistakeRow[]>([]);
  const [sm2State, setSm2State] = useState<Record<string, SM2Card>>({});
  const [formulas, setFormulas] = useState<FormulaCard[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const m = readStore<MistakeRow[]>(KEYS.MISTAKES, []);
    const sm2 = readStore<Record<string, SM2Card>>(KEYS.SM2_STATE, {});
    const f = readStore<FormulaCard[]>(KEYS.FORMULA_TRACKER, []);
    setMistakes(m);
    setSm2State(sm2);
    setFormulas(f);
    setLoading(false);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  // Build SM2 cards for mistakes
  const mistakeCards: SM2Card[] = useMemo(() =>
    mistakes.map((m) => sm2State[m.id] ?? {
      id: m.id, easeFactor: 2.5, interval: 1, repetitions: 0,
      nextReviewDate: m.next_review_at ?? today,
    }), [mistakes, sm2State, today]);

  const dueCards = useMemo(() => sortDueCards(mistakeCards.filter((c) => isDue(c, today))), [mistakeCards, today]);
  const upcomingCards = useMemo(() => getUpcomingCards(mistakeCards, 14), [mistakeCards]);

  // Pattern alerts
  const mistakeRecords: MistakeRecord[] = useMemo(() =>
    mistakes.map((m) => ({ id: m.id, topic_slug: m.topic_slug, created_at: m.created_at })),
    [mistakes]);
  const patterns = useMemo(() => detectMistakePatterns(mistakeRecords), [mistakeRecords]);

  function handleRating(cardId: string, rating: "correct" | "forgot") {
    const card = sm2State[cardId] ?? mistakeCards.find((c) => c.id === cardId);
    if (!card) return;
    const updated = applyRating(card, rating);
    const newState = { ...sm2State, [cardId]: updated };
    setSm2State(newState);
    writeStore(KEYS.SM2_STATE, newState);
    setRevealed((prev) => { const n = new Set(prev); n.delete(cardId); return n; });
  }

  function handleFormulaRating(formulaId: string, rating: "correct" | "forgot") {
    const updated = formulas.map((f) => {
      if (f.id !== formulaId) return f;
      return { ...f, sm2: applyRating(f.sm2, rating) };
    });
    setFormulas(updated);
    writeStore(KEYS.FORMULA_TRACKER, updated);
  }

  const dueFormulas = formulas.filter((f) => isDue(f.sm2, today));

  // 14-day calendar
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; cards: SM2Card[] }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const cards = upcomingCards.filter((c) => c.nextReviewDate === dateStr);
      days.push({ date: dateStr, cards });
    }
    return days;
  }, [upcomingCards]);

  return (
    <div className="space-y-5">
      {/* Pattern alerts */}
      {patterns.length > 0 && (
        <div className="space-y-2">
          {patterns.map((p) => (
            <div key={p.topicSlug} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">
                  You made the same mistake {p.count} times this week in <strong>{labelFor(p.topicSlug)}</strong>
                </p>
                <Link href={`/study?q=${encodeURIComponent(labelFor(p.topicSlug))}`}
                  className="mt-1 text-sm text-red-700 underline dark:text-red-300">
                  Review notes for this topic →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Due today", value: dueCards.length, icon: "🔔", color: dueCards.length > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400" },
          { label: "Total mistakes", value: mistakes.length, icon: "📝", color: "text-zinc-900 dark:text-zinc-50" },
          { label: "Formulas due", value: dueFormulas.length, icon: "🔢", color: dueFormulas.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {([
          { id: "due", label: `📋 Due Today (${dueCards.length})` },
          { id: "formulas", label: `🔢 Formulas (${dueFormulas.length})` },
          { id: "calendar", label: "📅 14-Day Calendar" },
        ] as const).map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === t.id ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Due today tab */}
      {tab === "due" && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Cards due today</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Rate each card — SM-2 schedules the next review automatically</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />Loading…</div>
            ) : dueCards.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl">🎉</div>
                <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">All caught up!</p>
                <p className="mt-1 text-sm text-zinc-500">No cards due today. Take a mock to generate new revision material.</p>
                <Link href="/mock-tests" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
                  🧪 Take a mock test
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {dueCards.map((card) => {
                  const mistake = mistakes.find((m) => m.id === card.id);
                  if (!mistake) return null;
                  const subj = subjectFor(mistake.topic_slug);
                  const isRevealed = revealed.has(card.id);
                  return (
                    <li key={card.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subjectColors[subj]}`}>{labelFor(mistake.topic_slug)}</span>
                            {card.nextReviewDate < today && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">Overdue</span>}
                          </div>
                          <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">{mistake.question}</p>
                        </div>
                        <button type="button" onClick={() => setRevealed((p) => { const n = new Set(p); isRevealed ? n.delete(card.id) : n.add(card.id); return n; })}
                          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                          {isRevealed ? "Hide" : "Reveal"}
                        </button>
                      </div>
                      {isRevealed && (
                        <div className="mt-3 space-y-2">
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Correct answer</p>
                            <p className="mt-1 text-sm font-medium text-emerald-900 dark:text-emerald-200">{mistake.correct_answer ?? "—"}</p>
                            {mistake.explanation && <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{mistake.explanation}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleRating(card.id, "correct")}
                              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400">
                              ✓ Remembered
                            </button>
                            <button type="button" onClick={() => handleRating(card.id, "forgot")}
                              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-400">
                              ✗ Forgot
                            </button>
                          </div>
                          <p className="text-center text-xs text-zinc-400">
                            Ease: {card.easeFactor.toFixed(1)} · Interval: {card.interval}d · Reps: {card.repetitions}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Formulas tab */}
      {tab === "formulas" && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Formula tracker</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Formulas from your study packs, scheduled with SM-2</p>
          </div>
          <div className="p-6">
            {dueFormulas.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl">✅</div>
                <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">No formulas due today</p>
                <p className="mt-1 text-sm text-zinc-500">Generate study notes to add formulas to your tracker.</p>
                <Link href="/study" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
                  📋 Study a topic
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {dueFormulas.map((f) => (
                  <li key={f.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subjectColors[subjectFor(f.topicSlug)]}`}>{labelFor(f.topicSlug)}</span>
                    <p className="mt-2 font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">{f.formula}</p>
                    {f.context && <p className="mt-1 text-xs text-zinc-500">{f.context}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => handleFormulaRating(f.id, "correct")}
                        className="flex-1 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400">✓ Know it</button>
                      <button type="button" onClick={() => handleFormulaRating(f.id, "forgot")}
                        className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-400">✗ Forgot</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Calendar tab */}
      {tab === "calendar" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">Upcoming 14 days</h2>
          <div className="space-y-2">
            {calendarDays.map(({ date, cards }) => {
              const isToday = date === today;
              return (
                <div key={date} className={`flex items-center gap-3 rounded-xl p-3 ${isToday ? "border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" : "bg-zinc-50 dark:bg-zinc-800/40"}`}>
                  <div className="w-20 shrink-0 text-xs font-medium text-zinc-500">
                    {isToday ? "Today" : new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  {cards.length === 0 ? (
                    <span className="text-xs text-zinc-400">No reviews</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {cards.slice(0, 5).map((c) => {
                        const m = mistakes.find((mk) => mk.id === c.id);
                        const subj = m ? subjectFor(m.topic_slug) : "gk";
                        return (
                          <span key={c.id} className={`rounded-full px-2 py-0.5 text-xs ${subjectColors[subj]}`}>
                            {m ? labelFor(m.topic_slug) : c.id.slice(0, 8)}
                          </span>
                        );
                      })}
                      {cards.length > 5 && <span className="text-xs text-zinc-400">+{cards.length - 5} more</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
