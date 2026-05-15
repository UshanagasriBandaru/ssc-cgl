"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SSC_CGL_TOPICS, SUBJECT_LABELS, type SubjectId } from "@/lib/ssc-topics";
import { KEYS, readStore } from "@/lib/datastore";
import { checkReEngagement, computeStreak } from "@/lib/streak";
import type { DailyActivity } from "@/lib/streak";

function countBySubject(subject: SubjectId) {
  return SSC_CGL_TOPICS.filter((t) => t.subject === subject).length;
}

const subjectMeta: Record<SubjectId, { icon: string; color: string; border: string; bg: string; desc: string }> = {
  quant:     { icon: "📐", color: "text-blue-700 dark:text-blue-300",    border: "border-blue-200 dark:border-blue-800",     bg: "bg-blue-50 dark:bg-blue-950/30",     desc: "Arithmetic, Algebra, Geometry, DI" },
  reasoning: { icon: "🧩", color: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800", bg: "bg-violet-50 dark:bg-violet-950/30", desc: "Puzzles, Seating, Coding, Syllogism" },
  english:   { icon: "📖", color: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30", desc: "RC, Cloze, Grammar, Vocabulary" },
  gk:        { icon: "🌍", color: "text-amber-700 dark:text-amber-300",   border: "border-amber-200 dark:border-amber-800",   bg: "bg-amber-50 dark:bg-amber-950/30",   desc: "Polity, History, Science, Current Affairs" },
};

const quickLinks = [
  { href: "/study",        icon: "🎯", label: "Study any topic",   desc: "Notes + formulas + shortcuts" },
  { href: "/mock-tests",   icon: "🧪", label: "AI mock tests",     desc: "Adaptive difficulty, 10–50 MCQs" },
  { href: "/mentor",       icon: "🤖", label: "AI Mentor",         desc: "Ask anything, get personalized advice" },
  { href: "/mistakes",     icon: "📝", label: "Mistake notebook",  desc: "Log wrong answers, AI explains" },
  { href: "/revision",     icon: "🔁", label: "Revision queue",    desc: "SM-2 spaced repetition cards" },
  { href: "/planner",      icon: "📅", label: "Study planner",     desc: "One-click adaptive roadmap" },
  { href: "/analytics",    icon: "📊", label: "Analytics",         desc: "Heatmap + weak topic tracking" },
  { href: "/streaks",      icon: "🔥", label: "Streaks & Habits",  desc: "Daily targets + 30-day calendar" },
  { href: "/focus",        icon: "⏱️", label: "Focus Mode",        desc: "Pomodoro timer, distraction-free" },
];

export default function DashboardPage() {
  const subjects: SubjectId[] = ["quant", "reasoning", "english", "gk"];
  const totalTopics = SSC_CGL_TOPICS.length;
  const [reEngagement, setReEngagement] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const log = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
    setReEngagement(checkReEngagement(log));
    setStreak(computeStreak(log));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      {/* Re-engagement banner */}
      {reEngagement && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="text-2xl">😴</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">You haven&apos;t studied in {reEngagement} days</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Here&apos;s a quick 10-minute session to get back on track.</p>
          </div>
          <Link href="/mock-tests" className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400">
            Quick mock →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Study Dashboard</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            {totalTopics} topics · SSC CGL Tier-I
            {streak > 0 && <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">🔥 {streak} day streak</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/mentor" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            🤖 Ask mentor
          </Link>
          <Link href="/study" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
            🎯 Study now
          </Link>
        </div>
      </div>

      {/* Subject cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Subjects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((id) => {
            const m = subjectMeta[id];
            const count = countBySubject(id);
            const topTopics = SSC_CGL_TOPICS.filter((t) => t.subject === id && (t.weightage === "highest" || t.weightage === "high")).slice(0, 3);
            return (
              <Link key={id} href={`/topics?subject=${id}`}
                className={`group flex flex-col rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${m.bg} ${m.border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{m.icon}</span>
                    <h2 className={`mt-2 text-lg font-bold ${m.color}`}>{SUBJECT_LABELS[id]}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{m.desc}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-zinc-700 shadow-sm dark:bg-zinc-900/60 dark:text-zinc-300">{count} topics</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {topTopics.map((t) => (
                    <span key={t.slug} className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">{t.name}</span>
                  ))}
                </div>
                <span className={`mt-4 text-xs font-semibold ${m.color} opacity-70 group-hover:opacity-100`}>Browse all {count} topics →</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-lg dark:bg-zinc-800">{l.icon}</span>
              <div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{l.label}</span>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
