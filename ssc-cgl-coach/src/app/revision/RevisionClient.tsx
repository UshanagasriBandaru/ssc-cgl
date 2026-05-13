"use client";

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

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) {
      setRows(loadLocal());
      return;
    }
    const res = await fetch("/api/mistakes");
    if (res.status === 401) {
      setRows(loadLocal());
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setRows(loadLocal());
      return;
    }
    setRows(((data as { mistakes?: MistakeRow[] }).mistakes ?? []).map((m) => ({ ...m })));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const due = rows.filter((r) => !r.next_review_at || r.next_review_at <= today);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Due today</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Uses `next_review_at` from the mistake notebook ({due.length} cards).
        </p>
        <ul className="mt-4 space-y-3">
          {due.map((r) => (
            <li key={r.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <div className="text-xs text-zinc-500">{labelFor(r.topic_slug)}</div>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">{r.question}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Next review: {r.next_review_at ?? "not scheduled"}
              </p>
            </li>
          ))}
          {!due.length ? (
            <li className="text-sm text-zinc-500">Nothing due — log mistakes from mocks or manual entry.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Spaced repetition (next)</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upgrade snooze buttons into SM-2 curves once analytics capture accuracy/time data from timed
          mocks.
        </p>
      </section>
    </div>
  );
}
