"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";
import { KEYS, readStore, writeStore, getLanguagePref } from "@/lib/datastore";

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

// Use v2 key, fall back to v1 for migration
const LS_KEY = KEYS.MISTAKES;
const LS_KEY_V1 = "ssc-coach-mistakes-v1";
const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

function loadLocal(): MistakeRow[] {
  if (typeof window === "undefined") return [];
  // Try v2 first, fall back to v1
  const v2 = readStore<MistakeRow[]>(LS_KEY, []);
  if (v2.length > 0) return v2;
  try {
    const raw = localStorage.getItem(LS_KEY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MistakeRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveLocal(rows: MistakeRow[]) {
  writeStore(LS_KEY, rows);
}

export function MistakesClient() {
  const topics = useMemo(() => SSC_CGL_TOPICS, []);

  const [mode, setMode] = useState<"cloud" | "local">("cloud");
  const [rows, setRows] = useState<MistakeRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState<string | null>(null);

  const [topicSlug, setTopicSlug] = useState(topics[0]?.slug ?? "percentage");
  const [question, setQuestion] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [explain, setExplain] = useState("");
  const [saving, setSaving] = useState(false);

  const [filterSlug, setFilterSlug] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMsg(null);
    if (!supabaseConfigured) {
      setMode("local");
      setRows(loadLocal());
      setLoading(false);
      return;
    }
    const res = await fetch("/api/mistakes");
    if (res.status === 401) {
      setMode("local");
      setRows(loadLocal());
      setMsg("Not signed in — showing local-only mistakes on this browser.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Could not load cloud mistakes.");
      setRows(loadLocal());
      setMode("local");
      setLoading(false);
      return;
    }
    setMode("cloud");
    setRows(((data as { mistakes?: MistakeRow[] }).mistakes ?? []).map((m) => ({ ...m })));
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
  }, [refresh]);

  async function addRow() {
    if (!question.trim()) return;
    setSaving(true);

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
      setQuestion(""); setCorrect(""); setWrong(""); setExplain("");
      setSaving(false);
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
      setSaving(false);
      return;
    }
    setQuestion(""); setCorrect(""); setWrong(""); setExplain("");
    setSaving(false);
    await refresh();
  }

  async function aiExplain(row: MistakeRow) {
    if (mode === "local") {
      alert("Sign in + Supabase to use AI explain.");
      return;
    }
    setExplaining(row.id);
    const lang = getLanguagePref();
    const res = await fetch("/api/mistakes/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_slug: row.topic_slug,
        question: row.question,
        correct_answer: row.correct_answer ?? "",
        user_answer: row.user_answer ?? "",
        lang,
      }),
    });
    const data = await res.json();
    setExplaining(null);
    if (!res.ok) { alert(typeof data.error === "string" ? data.error : "Explain failed"); return; }
    const explanation = typeof data.explanation === "string" ? data.explanation : "";
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
          ? { ...r, next_review_at: new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) }
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
    if (!confirm("Remove this mistake?")) return;
    if (mode === "local") {
      const next = loadLocal().filter((r) => r.id !== row.id);
      saveLocal(next);
      setRows(next);
      return;
    }
    await fetch("/api/mistakes/" + row.id, { method: "DELETE" });
    await refresh();
  }

  const topicSlugsWithMistakes = useMemo(() => [...new Set(rows.map((r) => r.topic_slug))], [rows]);
  const filtered = filterSlug === "all" ? rows : rows.filter((r) => r.topic_slug === filterSlug);
  const topicLabel = (slug: string) => topics.find((t) => t.slug === slug)?.name ?? slug;

  return (
    <div className="space-y-6">
      {/* Mode banner */}
      {msg ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{msg}</span>
        </div>
      ) : null}

      {/* Log form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Log a mistake</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            mode === "cloud"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          }`}>
            {mode === "cloud" ? "☁️ Cloud" : "💾 Local"}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Works offline in-browser until you connect Supabase + sign in.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Topic</span>
            <select
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Question / stem</span>
            <textarea
              className="mt-1.5 min-h-[80px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste the question you got wrong…"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Correct answer</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              placeholder="The right answer"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Your wrong answer</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={wrong}
              onChange={(e) => setWrong(e.target.value)}
              placeholder="What you chose"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Notes / trap (optional)</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={explain}
              onChange={(e) => setExplain(e.target.value)}
              placeholder="Why you got it wrong, what to remember…"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={saving || !question.trim()}
          onClick={() => void addRow()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
              Saving…
            </>
          ) : "📝 Save mistake"}
        </button>
      </div>

      {/* Notebook */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Mistake notebook</h2>
            <p className="mt-0.5 text-xs text-zinc-500">{rows.length} mistake{rows.length !== 1 ? "s" : ""} logged</p>
          </div>
          {topicSlugsWithMistakes.length > 1 && (
            <select
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              value={filterSlug}
              onChange={(e) => setFilterSlug(e.target.value)}
            >
              <option value="all">All topics</option>
              {topicSlugsWithMistakes.map((s) => (
                <option key={s} value={s}>{topicLabel(s)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-4xl">📭</div>
              <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">No mistakes yet</p>
              <p className="mt-1 text-sm text-zinc-500">Take a mock test — wrong answers auto-log here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((r) => (
                <li key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
                  {/* Card header */}
                  <button
                    type="button"
                    className="w-full p-4 text-left"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {topicLabel(r.topic_slug)}
                        </span>
                        <p className="mt-1.5 font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2">{r.question}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                          <span>✓ {r.correct_answer ?? "—"}</span>
                          <span>✗ {r.user_answer ?? "—"}</span>
                          {r.next_review_at && <span>📅 {r.next_review_at}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 text-zinc-400">{expandedId === r.id ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded */}
                  {expandedId === r.id && (
                    <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
                      {r.explanation ? (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Explanation</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-blue-900 dark:text-blue-200">{r.explanation}</p>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={explaining === r.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          onClick={() => void aiExplain(r)}
                        >
                          {explaining === r.id ? (
                            <><span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-zinc-700" /> Explaining…</>
                          ) : "🤖 AI explain"}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          onClick={() => void snooze(r, 1)}
                        >
                          +1 day
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          onClick={() => void snooze(r, 7)}
                        >
                          +7 days
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400"
                          onClick={() => void remove(r)}
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
