"use client";

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

  const [counts, setCounts] = useState<Record<string, number>>({});

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
    }
    void run();
  }, []);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Minimal weak-topic heatmap derived from mistake counts — richer charts once mock timers feed in.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Mistakes by topic</h2>
        {!sorted.length ? (
          <p className="mt-3 text-sm text-zinc-500">No data yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sorted.map(([slug, n]) => (
              <li key={slug} className="flex items-center justify-between text-sm">
                <span>{labels.get(slug) ?? slug}</span>
                <span className="font-mono text-zinc-600 dark:text-zinc-400">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
