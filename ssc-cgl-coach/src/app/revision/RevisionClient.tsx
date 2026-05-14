"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";
import type { MistakeRow } from "@/app/mistakes/MistakesClient";

const LS_KEY = "ssc-coach-mistakes-v1";
const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

function loadLocal(): MistakeRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MistakeRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function RevisionClient() {
  const labelFor = useMemo(() => {
    const map = new Map(SSC_CGL_TOPICS.map((t) => [t.slug, t.name]));
    return (slug: string) => map.get(slug) ?? slug;
  }, []);

  const [rows, setRows] = useState<MistakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    if (!supabaseConfigured) {
      setRows(loadLocal());
      setLoading(false);
      return;
    }
    const res = await fetch("/api/mistakes");
    if (res.status === 401) {
      setRows(loadLocal());
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setRows(loadLocal());
      setLoading(false);
      return;
    }
    setRows(((data as { mistakes?: MistakeRow[] }).mistakes ?? []).map((m) => ({ ...m })));
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
  }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const due = rows.filter((r) => !r.next_review_at || r.next_review_at <= today);
  const upcoming = rows.filter((r) => r.next_review_at && r.next_review_at > today).slice(0, 5);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Due today", value: due.length, icon: "🔔", color: due.length > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400" },
          { label: "Total logged", value: rows.length, icon: "📝", color: "text-zinc-900 dark:text-zinc-50" },
          { label: "Upcoming", value: upcoming.length, icon: "📅", color: "text-zinc-900 dark:text-zinc-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="text-2xl">{s.icon}</div>
            <div className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Due today */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Due today</h2>
            <p className="mt-0.5 text-xs text-zinc-500">{due.length} card{due.length !== 1 ? "s" : ""} to review</p>
          </div>
          {due.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {due.length} due
            </span>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              Loading…
            </div>
          ) : due.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl">🎉</div>
              <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">All caught up!</p>
              <p className="mt-1 text-sm text-zinc-500">No cards due today. Take a mock to add more.</p>
              <Link
                href="/mock-tests"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900"
              >
                Take a mock test
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {due.map((r) => (
                <li key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="inline-block rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {labelFor(r.topic_slug)}
                      </span>
                      <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-50">{r.question}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleReveal(r.id)}
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                    >
                      {revealed.has(r.id) ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  {revealed.has(r.id) && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Correct answer</p>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{r.correct_answer ?? "—"}</p>
                      {r.explanation && (
                        <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{r.explanation}</p>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    Next review: {r.next_review_at ?? "not scheduled"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Coming up</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                <div className="min-w-0">
                  <span className="text-xs text-zinc-500">{labelFor(r.topic_slug)}</span>
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{r.question}</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {r.next_review_at}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spaced repetition note */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/20">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">🔬 Spaced repetition (coming soon)</h2>
        <p className="mt-2 text-sm text-zinc-500">
          SM-2 algorithm will replace manual snooze once timed mock data feeds in accuracy and response-time signals.
          For now, use the +1d / +7d snooze buttons in the{" "}
          <Link href="/mistakes" className="text-blue-600 underline dark:text-blue-400">mistake notebook</Link>.
        </p>
      </div>
    </div>
  );
}
