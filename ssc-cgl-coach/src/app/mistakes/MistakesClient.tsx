"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";

export type MistakeRow = {
  id: string;
  topic_slug: string;
  question: string;
  correct_answer?: string | null;
  user_answer?: string | null;
  explanation?: string | null;
  next_review_at?: string | null;
  created_at?: string;
};

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

function saveLocal(rows: MistakeRow[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export function MistakesClient() {
  const topics = useMemo(() => SSC_CGL_TOPICS, []);

  const [mode, setMode] = useState<"cloud" | "local">("cloud");
  const [rows, setRows] = useState<MistakeRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "percentage");
  const [question, setQuestion] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [explain, setExplain] = useState("");

  const refresh = useCallback(async () => {
    setMsg(null);
    if (!supabaseConfigured) {
      setMode("local");
      setRows(loadLocal());
      return;
    }
    const res = await fetch("/api/mistakes");
    if (res.status === 401) {
      setMode("local");
      setRows(loadLocal());
      setMsg("Not signed in — showing local-only mistakes on this browser.");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Could not load cloud mistakes.");
      setRows(loadLocal());
      setMode("local");
      return;
    }
    setMode("cloud");
    setRows(((data as { mistakes?: MistakeRow[] }).mistakes ?? []).map((m) => ({ ...m })));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  async function addRow() {
    if (!question.trim()) return;

    if (mode === "local" || !supabaseConfigured) {
      const row: MistakeRow = {
        id: crypto.randomUUID(),
        topic_slug: topicSlug,
        question: question.trim(),
        correct_answer: correct.trim() || null,
        user_answer: wrong.trim() || null,
        explanation: explain.trim() || null,
        next_review_at: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      };
      const next = [row, ...loadLocal()];
      saveLocal(next);
      setRows(next);
      setQuestion("");
      setCorrect("");
      setWrong("");
      setExplain("");
      return;
    }

    const res = await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_slug: topicSlug,
        question: question.trim(),
        correct_answer: correct.trim() || undefined,
        user_answer: wrong.trim() || undefined,
        explanation: explain.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }
    setQuestion("");
    setCorrect("");
    setWrong("");
    setExplain("");
    await refresh();
  }

  async function aiExplain(row: MistakeRow) {
    if (mode === "local") {
      alert("Sign in + Supabase to use cloud AI explain, or paste into planner chat later.");
      return;
    }
    const res = await fetch("/api/mistakes/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_slug: row.topic_slug,
        question: row.question,
        correct_answer: row.correct_answer ?? "",
        user_answer: row.user_answer ?? "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "Explain failed");
      return;
    }
    const explanation =
      typeof data.explanation === "string" ? data.explanation : "";
    await fetch("/api/mistakes/" + row.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanation }),
    });
    await refresh();
  }

  async function snooze(row: MistakeRow, days: number) {
    if (mode === "local") {
      const next = loadLocal().map((r) =>
        r.id === row.id
          ? {
              ...r,
              next_review_at: new Date(Date.now() + days * 864e5).toISOString().slice(0, 10),
            }
          : r,
      );
      saveLocal(next);
      setRows(next);
      return;
    }
    await fetch("/api/mistakes/" + row.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeDays: days }),
    });
    await refresh();
  }

  async function remove(row: MistakeRow) {
    if (mode === "local") {
      const next = loadLocal().filter((r) => r.id !== row.id);
      saveLocal(next);
      setRows(next);
      return;
    }
    await fetch("/api/mistakes/" + row.id, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-8">
      {msg ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
          {msg}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Log a mistake</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Works offline in-browser until you connect Supabase + sign in (
          <span className="font-medium">{mode}</span> mode).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Topic
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Question / stem
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Correct answer
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Your wrong answer
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={wrong}
              onChange={(e) => setWrong(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Notes / trap (optional)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={explain}
              onChange={(e) => setExplain(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void addRow()}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save mistake
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Notebook</h2>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="text-xs uppercase tracking-wide text-zinc-500">{r.topic_slug}</div>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">{r.question}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Correct: {r.correct_answer ?? "—"} · You: {r.user_answer ?? "—"}
              </p>
              {r.explanation ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {r.explanation}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                  onClick={() => void aiExplain(r)}
                >
                  AI explain
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                  onClick={() => void snooze(r, 1)}
                >
                  Revise +1d
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                  onClick={() => void snooze(r, 7)}
                >
                  +7d
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-red-700 dark:border-red-900 dark:text-red-300"
                  onClick={() => void remove(r)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
