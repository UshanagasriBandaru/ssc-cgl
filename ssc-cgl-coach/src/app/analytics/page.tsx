"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";

type MistakeRow = { topic_slug: string };

const LS_KEY = "ssc-coach-mistakes-v1";
const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

function loadLocal(): MistakeRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MistakeRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AnalyticsPage() {
  const labels = useMemo(() => new Map(SSC_CGL_TOPICS.map((t) => [t.slug, t.name])), []);
  const subjects = useMemo(() => new Map(SSC_CGL_TOPICS.map((t) => [t.slug, t.subject])), []);

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      let mistakes: MistakeRow[] = [];
      if (!supabaseConfigured) {
        mistakes = loadLocal();
      } else {
        const res = await fetch("/api/mistakes");
        if (res.status === 401) mistakes = loadLocal();
        else {
          const data = await res.json();
          mistakes = ((data as { mistakes?: MistakeRow[] }).mistakes ?? []).map((m) => ({
            topic_slug: m.topic_slug,
          }));
        }
      }
      const agg: Record<string, number> = {};
      for (const m of mistakes) agg[m.topic_slug] = (agg[m.topic_slug] ?? 0) + 1;
      setCounts(agg);
      setLoading(false);
    }
    void run();
  }, []);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, n]) => s + n, 0);
  const max = sorted[0]?.[1] ?? 1;

  const subjectColors: Record<string, string> = {
    quant:     "bg-blue-500",
    reasoning: "bg-violet-500",
    english:   "bg-emerald-500",
    gk:        "bg-amber-500",
  };

  const subjectBg: Record<string, string> = {
    quant:     "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    reasoning: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    english:   "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    gk:        "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      {/* Header */}
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Analytics
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Weak-topic heatmap from your mistake notebook. Focus your next session on the top bars.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total mistakes", value: total, icon: "📝" },
          { label: "Topics with mistakes", value: sorted.length, icon: "📚" },
          { label: "Worst topic", value: sorted[0] ? (labels.get(sorted[0][0]) ?? sorted[0][0]) : "—", icon: "⚠️", small: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 font-bold text-zinc-900 dark:text-zinc-50 ${s.small ? "text-base" : "text-3xl"}`}>
              {s.value}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Mistakes by topic</h2>
        <p className="mt-1 text-sm text-zinc-500">Sorted by frequency — longer bar = more mistakes logged</p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            Loading…
          </div>
        ) : !sorted.length ? (
          <div className="mt-8 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">No mistakes logged yet</p>
            <p className="mt-1 text-sm text-zinc-500">Take a mock test — wrong answers auto-log here.</p>
            <Link
              href="/mock-tests"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900"
            >
              Take a mock test
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {sorted.map(([slug, n]) => {
              const subj = subjects.get(slug) ?? "gk";
              const pct = Math.round((n / max) * 100);
              return (
                <li key={slug}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${subjectBg[subj]}`}>
                        {subj}
                      </span>
                      <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {labels.get(slug) ?? slug}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {n}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${subjectColors[subj] ?? "bg-zinc-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/mistakes"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          📝 Open mistake notebook
        </Link>
        <Link
          href="/revision"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          🔁 Revision queue
        </Link>
      </div>
    </main>
  );
}
